
import argparse
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import joblib

from sklearn.model_selection import GroupKFold, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1] / "backend")
)

from app.services.features import features_from_signal, SR


LABELS = {
    1: "neutral",
    2: "calm",
    3: "happy",
    4: "sad",
    5: "angry",
    6: "fearful",
    7: "disgust",
    8: "surprised",
}

# Keep this test set unchanged across all experiments.
TEST_ACTORS = [1, 9, 12, 17, 19]


def parse_filename(path):
    """Extract emotion and actor IDs from a RAVDESS-style filename."""

    parts = path.stem.split("-")

    if len(parts) < 7:
        raise ValueError("Invalid filename format")

    emotion = int(parts[2])

    # Supports suffixes such as _audio.
    actor_text = parts[-1].split("_")[0]
    actor = int(actor_text)

    if emotion not in LABELS:
        raise ValueError(f"Unknown emotion code: {emotion}")

    return emotion, actor


def main(root, out):
    root = Path(root)

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Dataset directory does not exist: {root}")

    X, y, groups = [], [], []

    files = sorted(root.rglob("*.wav"))

    if not files:
        raise SystemExit("No WAV files found in the dataset directory.")

    print(f"Found {len(files)} WAV files.")
    print("Loading audio and extracting features...\n")

    for i, path in enumerate(files, start=1):
        try:
            label, actor = parse_filename(path)

            signal, _ = librosa.load(
                path,
                sr=SR,
                mono=True
            )

            if len(signal) == 0:
                raise ValueError("Empty audio file")

            features = features_from_signal(signal, SR)

            X.append(features)
            y.append(label)
            groups.append(actor)

        except Exception as error:
            print(f"Skipping {path.name}: {error}")

        if i % 100 == 0 or i == len(files):
            print(f"Processed {i}/{len(files)} files")

    if len(X) < 16:
        raise SystemExit(
            f"Not enough valid audio files found: {len(X)}. "
            "Check the filename format and dataset."
        )

    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y)
    groups = np.asarray(groups)

    unique_actors = np.unique(groups)
    unique_classes = np.unique(y)

    if len(unique_actors) < 6:
        raise SystemExit(
            "Not enough actors for speaker-independent training."
        )

    if len(unique_classes) < 2:
        raise SystemExit(
            "At least two emotion classes are required."
        )

    missing_classes = sorted(set(LABELS.keys()) - set(unique_classes))

    if missing_classes:
        print(
            "\nWARNING: Missing emotion classes:",
            [LABELS[c] for c in missing_classes]
        )

    print(f"\nSuccessfully extracted {len(X)} samples.")
    print(f"Feature dimensions: {X.shape[1]}")
    print(f"Unique actors: {len(unique_actors)}")
    print(f"Emotion classes: {sorted(unique_classes.tolist())}")

    # Verify the expected test actors exist.
    missing_actors = sorted(set(TEST_ACTORS) - set(unique_actors.tolist()))

    if missing_actors:
        raise SystemExit(
            f"Expected test actors missing from dataset: {missing_actors}"
        )

    # -------------------------------------------------
    # Fixed speaker-independent train/test split
    # -------------------------------------------------

    test_mask = np.isin(groups, TEST_ACTORS)

    te = np.where(test_mask)[0]
    tr = np.where(~test_mask)[0]

    train_actors = np.unique(groups[tr])
    test_actors = np.unique(groups[te])

    if set(train_actors) & set(test_actors):
        raise SystemExit("Speaker leakage detected!")

    if set(test_actors.tolist()) != set(TEST_ACTORS):
        raise SystemExit("Test actor split does not match expected actors.")

    if len(np.unique(y[tr])) < 2:
        raise SystemExit("Training split contains fewer than two classes.")

    print("\nFixed speaker-independent split:")
    print(f"Training samples: {len(tr)}")
    print(f"Testing samples: {len(te)}")
    print(f"Training actors: {train_actors.tolist()}")
    print(f"Testing actors: {test_actors.tolist()}")

    # -------------------------------------------------
    # Hyperparameter tuning using training actors only
    # -------------------------------------------------

    print("\nStarting SVM hyperparameter tuning...")
    print("Scoring: macro-F1")
    print("Cross-validation: 5-fold GroupKFold")

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svc", SVC(
            kernel="rbf",
            class_weight="balanced"
        ))
    ])

    param_grid = {
        "svc__C": [0.1, 1, 10, 100],
        "svc__gamma": ["scale", "auto", 0.001, 0.01, 0.1]
    }

    cv = GroupKFold(n_splits=5)

    search = GridSearchCV(
        estimator=pipeline,
        param_grid=param_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        verbose=1,
        error_score="raise"
    )

    search.fit(
        X[tr],
        y[tr],
        groups=groups[tr]
    )

    print("\nBest SVM parameters:")
    print(search.best_params_)

    print(
        "Best cross-validation macro-F1:",
        round(search.best_score_ * 100, 2),
        "%"
    )

    # -------------------------------------------------
    # Train final model with selected parameters
    # -------------------------------------------------

    best_params = search.best_params_

    scaler = StandardScaler()

    X_train = scaler.fit_transform(X[tr])
    X_test = scaler.transform(X[te])

    clf = SVC(
        kernel="rbf",
        C=best_params["svc__C"],
        gamma=best_params["svc__gamma"],
        probability=True,
        class_weight="balanced",
        random_state=42
    )

    clf.fit(X_train, y[tr])

    # -------------------------------------------------
    # Evaluate on untouched test actors
    # -------------------------------------------------

    pred = clf.predict(X_test)

    precision, recall, weighted_f1, _ = precision_recall_fscore_support(
        y[te],
        pred,
        average="weighted",
        zero_division=0
    )

    _, _, macro_f1, _ = precision_recall_fscore_support(
        y[te],
        pred,
        average="macro",
        zero_division=0
    )

    # -------------------------------------------------
    # Save model artifacts
    # -------------------------------------------------

    output_dir = Path(out)
    output_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(clf, output_dir / "svm_model.joblib")
    joblib.dump(scaler, output_dir / "scaler.joblib")

    metrics = {
        "accuracy": round(accuracy_score(y[te], pred) * 100, 2),
        "precision": round(precision * 100, 2),
        "recall": round(recall * 100, 2),
        "f1": round(weighted_f1 * 100, 2),
        "macro_f1": round(macro_f1 * 100, 2),
        "cv_macro_f1": round(search.best_score_ * 100, 2),

        "best_parameters": {
            "C": best_params["svc__C"],
            "gamma": best_params["svc__gamma"]
        },

        "samples": int(len(X)),
        "train_samples": int(len(tr)),
        "test_samples": int(len(te)),

        "feature_dimensions": int(X.shape[1]),

        "train_actors": train_actors.tolist(),
        "test_actors": test_actors.tolist(),

        "split": "fixed speaker-independent split by actor",

        "classes": {
            str(k): v for k, v in LABELS.items()
        },

        "confusion_matrix": confusion_matrix(
            y[te],
            pred,
            labels=sorted(LABELS.keys())
        ).tolist()
    }

    metrics_path = output_dir / "svm_metrics.json"

    metrics_path.write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8"
    )

    print("\nTraining completed successfully!")
    print(json.dumps(metrics, indent=2))

    print(f"\nArtifacts saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--data", required=True)

    parser.add_argument(
        "--out",
        default="backend/artifacts"
    )

    args = parser.parse_args()

    main(args.data, args.out)
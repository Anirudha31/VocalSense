from functools import lru_cache
from pathlib import Path

import joblib

from .features import extract_mfcc


ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts"

RAVDESS = {
    1: "neutral",
    2: "calm",
    3: "happy",
    4: "sad",
    5: "angry",
    6: "fearful",
    7: "disgust",
    8: "surprised",
}

EMOJI = {
    "neutral": "😐",
    "calm": "😌",
    "happy": "😊",
    "sad": "😢",
    "angry": "😠",
    "fearful": "😨",
    "disgust": "🤢",
    "surprised": "😲",
}

MODELS = {
    "svm": "SVM",
    "cnn": "CNN",
    "cnn_lstm": "CNN-LSTM",
}


def svm_available() -> bool:
    return (
        (ART / "svm_model.joblib").exists()
        and (ART / "scaler.joblib").exists()
    )


@lru_cache(maxsize=1)
def _load_svm():
    if not svm_available():
        raise RuntimeError(
            "SVM model is not trained yet. "
            "Run ml/train_svm.py with the RAVDESS dataset."
        )

    scaler = joblib.load(ART / "scaler.joblib")
    classifier = joblib.load(ART / "svm_model.joblib")

    return scaler, classifier


def _label(class_value) -> str:
    value = str(class_value)

    if value.isdigit():
        code = int(value)

        if code not in RAVDESS:
            raise RuntimeError(
                f"Unknown RAVDESS emotion label: {code}"
            )

        return RAVDESS[code]

    return value


def svm_predict(data: bytes) -> dict:
    scaler, classifier = _load_svm()

    features = extract_mfcc(data)

    expected_features = getattr(
        scaler,
        "n_features_in_",
        None,
    )

    actual_features = features.size

    if (
        expected_features is not None
        and actual_features != expected_features
    ):
        raise RuntimeError(
            f"Feature mismatch: extracted {actual_features} "
            f"features, but the trained scaler expects "
            f"{expected_features}. Retrain the SVM using "
            f"the current features.py."
        )

    x = features.reshape(1, -1)
    x = scaler.transform(x)

    probabilities = classifier.predict_proba(x)[0]

    mapped = {
        _label(class_value): round(float(probability) * 100, 2)
        for class_value, probability in zip(
            classifier.classes_,
            probabilities,
        )
    }

    emotion = max(mapped, key=mapped.get)

    return {
        "emotion": emotion,
        "confidence": mapped[emotion],
        "probabilities": mapped,
        "emoji": EMOJI.get(emotion, "🎙️"),
    }


def normalize_model(name: str) -> str:
    key = (name or "svm").strip().lower().replace("-", "_")

    if key not in MODELS:
        raise ValueError(f"Unknown model '{name}'")

    return key


def predict(data: bytes, model: str) -> dict:
    key = normalize_model(model)

    if key == "svm":
        return svm_predict(data)

    raise RuntimeError(
        f"{MODELS[key]} is not trained yet. "
        "Add the evaluated model artifact before enabling inference."
    )

import json
import time

from sqlalchemy.exc import OperationalError

from ..db import Base, engine, SessionLocal
from ..models import ModelMetric
from .inference import ART


DESC = {
    "SVM": (
        "Stage 2 MFCC and audio-statistical features "
        "with an RBF SVM classifier trained on RAVDESS."
    ),
    "CNN": (
        "Mel-spectrogram CNN experiment. "
        "No evaluation result is claimed until trained and tested."
    ),
    "CNN-LSTM": (
        "CNN feature extractor with LSTM temporal modeling. "
        "No evaluation result is claimed until trained and tested."
    ),
}


def init_db(retries: int = 30, delay: int = 2):
    for attempt in range(retries):
        try:
            Base.metadata.create_all(bind=engine)
            return

        except OperationalError:
            if attempt == retries - 1:
                raise

            print(
                f"Waiting for database connection... "
                f"({attempt + 1}/{retries})"
            )
            time.sleep(delay)


def sync_models():
    db = SessionLocal()

    try:
        for name, description in DESC.items():
            metric = (
                db.query(ModelMetric)
                .filter_by(model=name)
                .first()
            )

            if metric is None:
                metric = ModelMetric(
                    model=name,
                    description=description,
                )
                db.add(metric)
            else:
                metric.description = description

        db.commit()

        metrics_file = ART / "svm_metrics.json"

        if metrics_file.exists():
            try:
                metrics = json.loads(
                    metrics_file.read_text(encoding="utf-8")
                )

            except (json.JSONDecodeError, OSError) as error:
                print(
                    f"Could not read SVM metrics: {error}"
                )
                return

            svm = (
                db.query(ModelMetric)
                .filter_by(model="SVM")
                .one_or_none()
            )

            if svm is not None:
                for field in (
                    "accuracy",
                    "precision",
                    "recall",
                    "f1",
                ):
                    value = metrics.get(field)

                    if value is not None:
                        setattr(svm, field, float(value))

                db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

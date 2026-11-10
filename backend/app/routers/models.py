from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ModelMetric
from ..auth import current_user
from ..services.inference import svm_available

router = APIRouter()

TYPE = {
    "SVM": "classical_ml",
    "CNN": "deep_learning",
    "CNN-LSTM": "deep_learning",
}

ORDER = ["SVM", "CNN", "CNN-LSTM"]


def _rows(db: Session):
    by_model = {
        row.model: row
        for row in db.query(ModelMetric).all()
    }

    return [
        by_model[name]
        for name in ORDER
        if name in by_model
    ]


@router.get("")
def models(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    return [
        {
            "name": row.model,
            "type": TYPE.get(row.model, "other"),
            "description": row.description,
            "accuracy": row.accuracy,
            "precision": row.precision,
            "recall": row.recall,
            "f1": row.f1,
            "active": (
                row.model == "SVM" and svm_available()
            ),
        }
        for row in _rows(db)
    ]


@router.get("/metrics")
def metrics(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    return [
        {
            "model": row.model,
            "accuracy": (
                row.accuracy
                if row.accuracy is not None
                else 0
            ),
            "f1": (
                row.f1
                if row.f1 is not None
                else 0
            ),
        }
        for row in _rows(db)
    ]

from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Prediction
from ..auth import current_user
from ..services.inference import EMOJI as emojis

router = APIRouter()


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == user.id)
        .order_by(Prediction.created_at.desc())
        .all()
    )

    distribution = Counter(row.emotion for row in rows)
    total = len(rows)

    average_confidence = (
        round(
            sum(row.confidence for row in rows) / total,
            2,
        )
        if total
        else None
    )

    recent = [
        {
            "id": row.id,
            "emotion": row.emotion,
            "emoji": emojis.get(row.emotion, "🎙️"),
            "model": row.model,
            "confidence": round(row.confidence, 2),
            "created_at": row.created_at.isoformat(),
        }
        for row in rows[:8]
    ]

    return {
        "summary": {
            "total_predictions": total,
            "avg_confidence": average_confidence,
            "active_model": "SVM",
            "top_emotion": (
                distribution.most_common(1)[0][0]
                if distribution
                else None
            ),
        },
        "distribution": [
            {
                "emotion": emotion,
                "count": distribution[emotion],
            }
            for emotion in emojis
            if distribution[emotion]
        ],
        "recent": recent,
    }

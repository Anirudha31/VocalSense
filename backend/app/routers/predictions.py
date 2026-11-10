import json

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Prediction
from ..auth import current_user
from ..services.inference import (
    predict,
    normalize_model,
    MODELS,
    EMOJI,
)

router = APIRouter()

MAX_AUDIO_SIZE = 15 * 1024 * 1024


@router.post("", response_model=dict)
async def create_prediction(
    audio: UploadFile = File(...),
    model: str = Form("svm"),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    data = await audio.read()

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio is empty",
        )

    if len(data) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file is too large (max 15 MB)",
        )

    try:
        key = normalize_model(model)

        result = await run_in_threadpool(
            predict,
            data,
            key,
        )

    except (RuntimeError, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    row = Prediction(
        user_id=user.id,
        filename=audio.filename or "audio",
        emotion=result["emotion"],
        confidence=result["confidence"],
        model=MODELS[key],
        probabilities=json.dumps(result["probabilities"]),
    )

    try:
        db.add(row)
        db.commit()
        db.refresh(row)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to save prediction",
        )

    return {
        **result,
        "id": row.id,
        "filename": row.filename,
        "model": row.model,
        "created_at": row.created_at.isoformat(),
    }


@router.get("")
def history(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    rows = (
        db.query(Prediction)
        .filter(Prediction.user_id == user.id)
        .order_by(Prediction.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "filename": row.filename,
            "emotion": row.emotion,
            "confidence": round(row.confidence, 2),
            "model": row.model,
            "probabilities": json.loads(
                row.probabilities or "{}"
            ),
            "created_at": row.created_at.isoformat(),
            "emoji": EMOJI.get(row.emotion, "🎙️"),
        }
        for row in rows
    ]

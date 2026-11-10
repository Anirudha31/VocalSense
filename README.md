# VocalSense — Speech Emotion Recognition

React + Vite · FastAPI · PostgreSQL · JWT auth · MFCC + RBF-SVM (CNN / CNN-LSTM scaffolds)

## Quick start (Docker, easiest)
    docker compose up --build        # open http://localhost:5173
(First train the SVM — see below — so `backend/artifacts/` contains the model; the folder is mounted into the container.)

## Manual start (3 terminals) — use Python 3.11 or 3.12
**1. Database**  `docker compose up -d db`  (or install PostgreSQL and create DB/user `vocalsense`)

**2. Backend**

    1 - cd backend
    2 - python -m venv .venv
    3 - # Windows: .venv\Scripts\Activate.ps1      macOS/Linux: source .venv/bin/activate
    4 - pip install -r requirements.txt
    5 (if needed) - # Windows: copy .env.example .env      macOS/Linux: cp .env.example .env
    6 - python -m uvicorn app.main:app --reload --port 8000

Tables and model rows are created automatically at startup. API docs: http://127.0.0.1:8000/docs

**3. Frontend**

    1 - cd frontend
    2 - npm install
    3 - npm run dev          # http://localhost:5173

## Train the SVM (needed for predictions)
Download RAVDESS *speech* audio (Audio_Speech_Actors_01-24), then from the project root:

    1 - pip install -r ml/requirements.txt
    2 - python ml/train_svm.py --data "/path/to/Audio_Speech_Actors_01-24" --out backend/artifacts

Restart the backend; the metrics in `svm_metrics.json` appear on the Model Accuracy page automatically.
The split is speaker-independent (test actors never seen in training), so the reported accuracy is honest.

CNN / CNN-LSTM files are model definitions only and are deliberately not shown as trained.

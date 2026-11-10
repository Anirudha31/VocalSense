from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, predictions, dashboard, models
from .services.seed import init_db, sync_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(init_db)
    await run_in_threadpool(sync_models)

    yield


app = FastAPI(
    title="VocalSense API",
    version="1.0.1",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["auth"],
)

app.include_router(
    predictions.router,
    prefix="/api/predictions",
    tags=["predictions"],
)

app.include_router(
    dashboard.router,
    prefix="/api/dashboard",
    tags=["dashboard"],
)

app.include_router(
    models.router,
    prefix="/api/models",
    tags=["models"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "VocalSense API",
    }


@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "VocalSense API",
        "docs": "/docs",
        "health": "/health",
        "frontend": "http://localhost:5173",
    }

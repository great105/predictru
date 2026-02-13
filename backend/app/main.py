from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api import (
    admin,
    analytics,
    auth,
    b2b,
    comments,
    markets,
    orderbook,
    private_bets,
    trade,
    ugc,
    users,
)
from app.core.config import settings
from app.tasks.broker import broker

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not broker.is_worker_process:
        await broker.startup()
    yield
    if not broker.is_worker_process:
        await broker.shutdown()


app = FastAPI(
    title="PredictRu API",
    version="1.0.0",
    docs_url="/v1/docs" if settings.APP_DEBUG else None,
    redoc_url="/v1/redoc" if settings.APP_DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# Routers
app.include_router(auth.router, prefix="/v1")
app.include_router(markets.router, prefix="/v1")
app.include_router(trade.router, prefix="/v1")
app.include_router(users.router, prefix="/v1")
app.include_router(admin.router, prefix="/v1")
app.include_router(analytics.router, prefix="/v1")
app.include_router(ugc.router, prefix="/v1")
app.include_router(comments.router, prefix="/v1")
app.include_router(orderbook.router, prefix="/v1")
app.include_router(b2b.router, prefix="/v1")
app.include_router(private_bets.router, prefix="/v1")


@app.get("/v1/health")
async def health():
    return {"status": "ok"}

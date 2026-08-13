import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models import Base
from app.routers import alerts, assignments, auth, content, shelters, sos, team
from app.seed import seed_demo_data
from app.websocket.routes import router as ws_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_demo_data()
    logger.info("Database initialized and demo data seeded.")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)  # WebSocket endpoint at /ws

api_prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=api_prefix)
app.include_router(sos.router, prefix=api_prefix)
app.include_router(team.router, prefix=api_prefix)
app.include_router(assignments.router, prefix=api_prefix)
app.include_router(content.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(shelters.router, prefix=api_prefix)


@app.get("/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "app": settings.APP_NAME}

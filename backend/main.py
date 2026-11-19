"""RoboCraft FastAPI application entry point."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes import generate, models as models_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure the generated directory exists on startup
    os.makedirs(settings.GENERATED_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="RoboCraft API",
    description="AI-Powered 3D Robot Model Generator",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS – allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure the generated directory exists before mounting StaticFiles
os.makedirs(settings.GENERATED_DIR, exist_ok=True)

# Mount generated files for direct download
app.mount(
    "/files",
    StaticFiles(directory=settings.GENERATED_DIR, html=False),
    name="generated",
)

# API routes
app.include_router(generate.router, prefix="/api/generate", tags=["generation"])
app.include_router(models_router.router, prefix="/api/models", tags=["models"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

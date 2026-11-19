"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


GenerationMode = Literal["text-to-3d", "image-to-3d"]
GenerationStatus = Literal[
    "idle", "uploading", "queued", "generating", "processing", "completed", "failed"
]


class TextTo3DRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=2000)


class GenerationJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mode: GenerationMode
    status: GenerationStatus = "queued"
    progress: int = 0
    prompt: Optional[str] = None
    image_filename: Optional[str] = None
    model_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    format: str = "glb"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    error: Optional[str] = None
    provider: Optional[str] = None


class ProviderInfo(BaseModel):
    name: str
    display_name: str
    supports_text: bool
    supports_image: bool
    status: Literal["available", "unavailable", "unconfigured"]

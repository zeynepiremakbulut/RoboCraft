"""FastAPI routes exposing available AI provider information."""
from typing import List

from fastapi import APIRouter

from app.models.schemas import ProviderInfo
from app.providers.huggingface import HuggingFace3DProvider
from app.providers.meshy import MeshyProvider
from app.providers.tripo3d import Tripo3DProvider

router = APIRouter()

# All providers the application knows about.
_ALL_PROVIDERS = [
    HuggingFace3DProvider(),
    Tripo3DProvider(),
    MeshyProvider(),
]


@router.get("/providers", response_model=List[ProviderInfo])
async def list_providers() -> List[ProviderInfo]:
    """Return configuration status and capabilities for every known provider."""
    return [p.get_info() for p in _ALL_PROVIDERS]

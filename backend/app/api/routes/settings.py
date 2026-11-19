"""FastAPI routes for runtime settings and Colab bridge configuration."""
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.core.config import settings

router = APIRouter()


class SettingsResponse(BaseModel):
    colab_url: Optional[str] = None
    hf_configured: bool = False
    tripo_configured: bool = False
    meshy_configured: bool = False


class UpdateSettingsRequest(BaseModel):
    colab_url: Optional[str] = None


@router.get("", response_model=SettingsResponse)
async def get_settings() -> SettingsResponse:
    """Return active provider settings and bridge status."""
    return SettingsResponse(
        colab_url=settings.COLAB_GRADIO_URL,
        hf_configured=bool(settings.HF_TOKEN),
        tripo_configured=bool(settings.TRIPO3D_API_KEY),
        meshy_configured=bool(settings.MESHY_API_KEY),
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(req: UpdateSettingsRequest) -> SettingsResponse:
    """Update Colab Gradio URL and persist to .env."""
    url = req.colab_url.strip() if req.colab_url else None
    settings.COLAB_GRADIO_URL = url

    # Persist to backend/.env
    env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
    lines = []
    found = False
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("COLAB_GRADIO_URL="):
                    lines.append(f"COLAB_GRADIO_URL={url or ''}\n")
                    found = True
                else:
                    lines.append(line)

    if not found:
        lines.append(f"COLAB_GRADIO_URL={url or ''}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    return SettingsResponse(
        colab_url=settings.COLAB_GRADIO_URL,
        hf_configured=bool(settings.HF_TOKEN),
        tripo_configured=bool(settings.TRIPO3D_API_KEY),
        meshy_configured=bool(settings.MESHY_API_KEY),
    )

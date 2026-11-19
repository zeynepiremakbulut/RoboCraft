"""Service layer for image-to-3D generation."""
from app.core.config import settings
from app.models.schemas import GenerationJob
from app.providers.base import Base3DProvider
from app.providers.huggingface import HuggingFace3DProvider
from app.providers.meshy import MeshyProvider
from app.providers.tripo3d import Tripo3DProvider


def get_image_provider() -> Base3DProvider:
    """Return the configured image-to-3D provider instance."""
    provider_name = settings.IMAGE_TO_3D_PROVIDER.lower()
    if provider_name == "huggingface":
        return HuggingFace3DProvider()
    elif provider_name == "tripo3d":
        return Tripo3DProvider()
    elif provider_name == "meshy":
        return MeshyProvider()
    raise ValueError(f"Unknown image-to-3D provider: {provider_name!r}")


async def run_image_to_3d(image_path: str, job: GenerationJob) -> GenerationJob:
    """Run image-to-3D generation using the configured provider."""
    provider = get_image_provider()
    if not provider.supports_image:
        raise ValueError(f"Provider {provider.name!r} does not support image-to-3D")
    if not provider.is_configured():
        raise ValueError(
            f"Provider {provider.name!r} is not configured. "
            f"Set {provider.name.upper()}_API_KEY in your .env file."
        )
    return await provider.image_to_3d(image_path, job)

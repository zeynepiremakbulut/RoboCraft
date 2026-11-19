"""Abstract base class for all AI 3D generation providers."""
from abc import ABC, abstractmethod
from app.models.schemas import GenerationJob, ProviderInfo


class Base3DProvider(ABC):
    """Base interface for 3D model generation providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique provider identifier (e.g., 'tripo3d')."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable provider name."""
        ...

    @property
    @abstractmethod
    def supports_text(self) -> bool:
        """Whether this provider supports text-to-3D generation."""
        ...

    @property
    @abstractmethod
    def supports_image(self) -> bool:
        """Whether this provider supports image-to-3D generation."""
        ...

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider has valid credentials configured."""
        ...

    @abstractmethod
    async def text_to_3d(self, prompt: str, job: GenerationJob) -> GenerationJob:
        """Generate a 3D model from a text prompt. Returns updated job."""
        ...

    @abstractmethod
    async def image_to_3d(self, image_path: str, job: GenerationJob) -> GenerationJob:
        """Generate a 3D model from an image file. Returns updated job."""
        ...

    def get_info(self) -> ProviderInfo:
        return ProviderInfo(
            name=self.name,
            display_name=self.display_name,
            supports_text=self.supports_text,
            supports_image=self.supports_image,
            status="available" if self.is_configured() else "unconfigured",
        )

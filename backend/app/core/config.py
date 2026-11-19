"""Application configuration loaded from environment variables."""
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_GENERATED_DIR = str(BASE_DIR / "generated")


class Settings(BaseSettings):
    # AI Provider API Keys – keep on the backend, never send to frontend
    TRIPO3D_API_KEY: Optional[str] = None
    MESHY_API_KEY: Optional[str] = None
    HF_TOKEN: Optional[str] = None
    COLAB_GRADIO_URL: Optional[str] = None

    # Which provider to use for each mode ('huggingface' | 'tripo3d' | 'meshy')
    TEXT_TO_3D_PROVIDER: str = "huggingface"
    IMAGE_TO_3D_PROVIDER: str = "huggingface"

    # Storage
    GENERATED_DIR: str = DEFAULT_GENERATED_DIR
    MAX_IMAGE_SIZE_MB: int = 10

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    CORS_ORIGINS: List[str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    model_config = {"env_file": str(BASE_DIR / ".env"), "extra": "ignore"}


settings = Settings()

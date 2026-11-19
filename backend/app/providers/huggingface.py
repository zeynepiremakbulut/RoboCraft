"""Hugging Face InstantMesh 3D provider (Free, No API Key Required)."""
import asyncio
import os
import shutil
import urllib.parse
from pathlib import Path
import httpx

from app.core.config import settings
from app.models.schemas import GenerationJob
from app.providers.base import Base3DProvider


class HuggingFace3DProvider(Base3DProvider):
    """Zero-configuration, 100% free cloud 3D generation provider using Hugging Face Spaces."""

    SPACE_NAME = "TencentARC/InstantMesh"

    @property
    def name(self) -> str:
        return "huggingface"

    @property
    def display_name(self) -> str:
        return "HuggingFace InstantMesh (Free / No Key)"

    @property
    def supports_text(self) -> bool:
        return True

    @property
    def supports_image(self) -> bool:
        return True

    def is_configured(self) -> bool:
        # Always available out-of-the-box, no API key or balance required!
        return True

    def _job_dir(self, job_id: str) -> Path:
        d = Path(settings.GENERATED_DIR) / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    async def _fetch_concept_image(self, prompt: str, dest_path: Path) -> Path:
        """Generate a high-quality 3D render concept image from a text prompt in 1-2 seconds."""
        encoded_prompt = urllib.parse.quote(f"3d model of {prompt}, isolated white background, full view, centered, clean render")
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"

        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(dest_path, "wb") as f:
                f.write(resp.content)
        return dest_path

    def _run_instantmesh_sync(self, image_path: str, output_glb_path: Path, job: GenerationJob) -> None:
        """Synchronous wrapper for gradio_client call."""
        from gradio_client import Client, handle_file

        client = Client(self.SPACE_NAME, token=settings.HF_TOKEN or None)

        job.progress = 25
        job.status = "generating"

        # Step 1 & 2: Preprocess and remove background
        processed_img = client.predict(
            input_image=handle_file(str(image_path)),
            do_remove_background=True,
            api_name="/preprocess",
        )

        job.progress = 55

        # Step 3: Generate multi-view representations
        client.predict(
            input_image=handle_file(processed_img),
            sample_steps=30,
            sample_seed=42,
            api_name="/generate_mvs",
        )

        job.progress = 80

        # Step 4: Reconstruct 3D mesh
        obj_path, glb_path = client.predict(api_name="/make3d")

        if not glb_path or not os.path.exists(glb_path):
            raise RuntimeError(f"InstantMesh failed to generate GLB file: {glb_path}")

        # Copy generated GLB to job directory
        shutil.copyfile(glb_path, str(output_glb_path))

    async def text_to_3d(self, prompt: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "generating"
        job.progress = 10

        job_dir = self._job_dir(job.id)
        concept_image_path = job_dir / "concept.png"
        output_glb_path = job_dir / "model.glb"

        # 1. Generate concept image
        await self._fetch_concept_image(prompt, concept_image_path)
        job.thumbnail_url = f"/files/{job.id}/concept.png"
        job.progress = 20

        # 2. Run InstantMesh 3D reconstruction in thread pool to not block asyncio
        await asyncio.to_thread(self._run_instantmesh_sync, str(concept_image_path), output_glb_path, job)

        job.model_url = f"/files/{job.id}/model.glb"
        job.status = "completed"
        job.progress = 100
        return job

    async def image_to_3d(self, image_path: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "generating"
        job.progress = 15

        job_dir = self._job_dir(job.id)
        output_glb_path = job_dir / "model.glb"

        # Run InstantMesh 3D reconstruction in thread pool
        await asyncio.to_thread(self._run_instantmesh_sync, str(image_path), output_glb_path, job)

        job.model_url = f"/files/{job.id}/model.glb"
        job.status = "completed"
        job.progress = 100
        return job

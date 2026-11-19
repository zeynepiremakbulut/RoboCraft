"""Hugging Face 3D provider with FLUX concept rendering and InstantMesh 3D reconstruction."""
import asyncio
import os
import shutil
import urllib.parse
from pathlib import Path
import httpx
from PIL import Image

from app.core.config import settings
from app.models.schemas import GenerationJob
from app.providers.base import Base3DProvider


class HuggingFace3DProvider(Base3DProvider):
    """Zero-configuration cloud 3D generation provider using Hugging Face Spaces + FLUX."""

    SPACE_NAME = "TencentARC/InstantMesh"
    FLUX_SPACE = "black-forest-labs/FLUX.1-schnell"

    @property
    def name(self) -> str:
        return "huggingface"

    @property
    def display_name(self) -> str:
        return "HuggingFace InstantMesh + FLUX (Free)"

    @property
    def supports_text(self) -> bool:
        return True

    @property
    def supports_image(self) -> bool:
        return True

    def is_configured(self) -> bool:
        return True

    def _job_dir(self, job_id: str) -> Path:
        d = Path(settings.GENERATED_DIR) / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _clean_shadows(self, image_path: Path) -> Path:
        """Whiten subtle grey/floor shadows so background remover isolates 100% of the robot."""
        try:
            im = Image.open(image_path).convert("RGB")
            pixels = im.load()
            w, h = im.size

            for y in range(h):
                for x in range(w):
                    r, g, b = pixels[x, y]
                    # If pixel is near-white or neutral grey background/floor shadow
                    if r > 195 and g > 195 and b > 195 and max(abs(r - g), abs(r - b), abs(g - b)) < 22:
                        pixels[x, y] = (255, 255, 255)

            im.save(image_path, "PNG")
        except Exception as e:
            print(f"[ShadowCleaner] Warning: {e}")
        return image_path

    async def _fetch_concept_image(self, prompt: str, dest_path: Path) -> Path:
        """Generate high-quality concept image using FLUX.1-schnell on HuggingFace, with Pollinations fallback."""
        enhanced_prompt = (
            f"studio product 3D CAD render of {prompt}, isolated on solid pure white background, "
            f"hard surface mechanical robot, bright vibrant industrial colors, metallic finish, "
            f"high contrast, clean sharp edges, centered full shot, floating in space, no floor, no ground, no shadows"
        )

        # 1. Try FLUX.1-schnell on Hugging Face (high quality, crisp 3D CAD look)
        if settings.HF_TOKEN:
            try:
                from gradio_client import Client
                def _run_flux():
                    client = Client(self.FLUX_SPACE, token=settings.HF_TOKEN)
                    res = client.predict(
                        prompt=enhanced_prompt,
                        seed=42,
                        randomize_seed=True,
                        width=512,
                        height=512,
                        num_inference_steps=4,
                        api_name="/infer",
                    )
                    out_path = res[0] if isinstance(res, (list, tuple)) else res
                    if isinstance(out_path, dict):
                        out_path = out_path.get("value") or out_path.get("path")
                    return out_path

                flux_out = await asyncio.to_thread(_run_flux)
                if flux_out and os.path.exists(flux_out):
                    im = Image.open(flux_out).convert("RGB")
                    im.save(dest_path, "PNG")
                    self._clean_shadows(dest_path)
                    return dest_path
            except Exception as e:
                print(f"[HF_FLUX] Fallback to pollinations due to: {e}")

        # 2. Fallback to Pollinations.ai with clean prompt
        encoded_prompt = urllib.parse.quote(enhanced_prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true&seed=42"

        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            with open(dest_path, "wb") as f:
                f.write(resp.content)

        self._clean_shadows(dest_path)
        return dest_path

    def _run_instantmesh_sync(self, image_path: str, output_glb_path: Path, job: GenerationJob) -> None:
        """Synchronous wrapper for gradio_client call with error formatting."""
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
        try:
            client.predict(
                input_image=handle_file(processed_img),
                sample_steps=30,
                sample_seed=42,
                api_name="/generate_mvs",
            )
        except Exception as e:
            err_msg = str(e)
            if "ZeroGPU quota" in err_msg:
                raise RuntimeError(
                    "Hugging Face ZeroGPU günlük/anlık kullanım kotanız doldu. "
                    "Hugging Face ücretsiz kotaları saatlik/günlük olarak sıfırlar, ya da yeni bir HF hesabı/tokeni ile anında devam edebilirsiniz."
                ) from e
            raise

        job.progress = 80

        # Step 4: Reconstruct 3D mesh
        obj_path, glb_path = client.predict(api_name="/make3d")

        if not glb_path or not os.path.exists(glb_path):
            raise RuntimeError(f"InstantMesh GLB dosyası üretemedi: {glb_path}")

        # Copy generated GLB to job directory
        shutil.copyfile(glb_path, str(output_glb_path))

    async def text_to_3d(self, prompt: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "generating"
        job.progress = 10

        job_dir = self._job_dir(job.id)
        concept_image_path = job_dir / "concept.png"
        output_glb_path = job_dir / "model.glb"

        # 1. Generate crisp concept image
        await self._fetch_concept_image(prompt, concept_image_path)
        job.thumbnail_url = f"/files/{job.id}/concept.png"
        job.progress = 20

        # 2. Run 3D reconstruction in thread pool
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

        # Clean any floor shadows from user uploaded image
        cleaned_image_path = job_dir / "cleaned_input.png"
        shutil.copyfile(image_path, str(cleaned_image_path))
        self._clean_shadows(cleaned_image_path)

        # Run 3D reconstruction in thread pool
        await asyncio.to_thread(self._run_instantmesh_sync, str(cleaned_image_path), output_glb_path, job)

        job.model_url = f"/files/{job.id}/model.glb"
        job.status = "completed"
        job.progress = 100
        return job

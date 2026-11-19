"""Meshy API provider for text-to-3D and image-to-3D generation."""
import asyncio
import os
from pathlib import Path

import httpx

from app.core.config import settings
from app.models.schemas import GenerationJob
from app.providers.base import Base3DProvider


class MeshyProvider(Base3DProvider):
    API_BASE = "https://api.meshy.ai"
    POLL_INTERVAL = 5    # seconds
    MAX_POLL_TIME = 300  # 5-minute hard timeout

    # ------------------------------------------------------------------
    # Abstract property implementations
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "meshy"

    @property
    def display_name(self) -> str:
        return "Meshy"

    @property
    def supports_text(self) -> bool:
        return True

    @property
    def supports_image(self) -> bool:
        return True

    def is_configured(self) -> bool:
        key = settings.MESHY_API_KEY
        return bool(key and not key.startswith("your_") and len(key) > 10)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.MESHY_API_KEY}",
            "Content-Type": "application/json",
        }

    def _job_dir(self, job_id: str) -> Path:
        d = Path(settings.GENERATED_DIR) / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    async def _create_task(self, client: httpx.AsyncClient, endpoint: str, payload: dict) -> str:
        """POST to *endpoint* and return the task id."""
        resp = await client.post(
            f"{self.API_BASE}{endpoint}",
            json=payload,
            headers=self._headers(),
            timeout=30,
        )
        resp.raise_for_status()
        body = resp.json()
        # Meshy returns {"result": "<task_id>"} on 202
        task_id = body.get("result") or body.get("id")
        if not task_id:
            raise RuntimeError(f"Meshy task creation failed: {body}")
        return task_id

    async def _poll_until_done(
        self,
        client: httpx.AsyncClient,
        endpoint: str,
        task_id: str,
        job: GenerationJob,
    ) -> dict:
        """Poll GET {endpoint}/{task_id} until status is SUCCEEDED or FAILED."""
        elapsed = 0
        while elapsed < self.MAX_POLL_TIME:
            resp = await client.get(
                f"{self.API_BASE}{endpoint}/{task_id}",
                headers=self._headers(),
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status", "").upper()
            progress = data.get("progress", 0)

            job.progress = progress
            if status in ("PENDING", "IN_QUEUE"):
                job.status = "queued"
            elif status == "IN_PROGRESS":
                job.status = "generating"

            if status == "SUCCEEDED":
                return data
            if status == "FAILED":
                raise RuntimeError(
                    f"Meshy task {task_id} failed: {data.get('task_error', {}).get('message', 'unknown')}"
                )

            await asyncio.sleep(self.POLL_INTERVAL)
            elapsed += self.POLL_INTERVAL

        raise TimeoutError(
            f"Meshy task {task_id} did not complete within {self.MAX_POLL_TIME}s"
        )

    async def _download_model(self, client: httpx.AsyncClient, url: str, dest: Path) -> None:
        async with client.stream("GET", url, timeout=120) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    f.write(chunk)

    # ------------------------------------------------------------------
    # Public provider interface
    # ------------------------------------------------------------------

    async def text_to_3d(self, prompt: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "queued"
        job.progress = 0

        payload = {
            "mode": "preview",
            "prompt": prompt,
            "art_style": "realistic",
            "negative_prompt": "low quality, low resolution, low poly, ugly",
        }

        async with httpx.AsyncClient() as client:
            task_id = await self._create_task(client, "/v1/text-to-3d", payload)
            job.status = "generating"
            data = await self._poll_until_done(client, "/v1/text-to-3d", task_id, job)

            model_url = data.get("model_urls", {}).get("glb")
            thumbnail_url = data.get("thumbnail_url")
            if not model_url:
                raise RuntimeError("Meshy returned success but no GLB model URL")

            dest_dir = self._job_dir(job.id)
            dest_file = dest_dir / "model.glb"
            await self._download_model(client, model_url, dest_file)

        job.model_url = f"/files/{job.id}/model.glb"
        if thumbnail_url:
            job.thumbnail_url = thumbnail_url
        job.status = "completed"
        job.progress = 100
        return job

    async def image_to_3d(self, image_path: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "uploading"
        job.progress = 0

        # Meshy image-to-3D accepts a public URL or a base64 data URI.
        # We encode the local file as a data URI.
        import base64

        path = Path(image_path)
        suffix = path.suffix.lstrip(".").lower()
        mime_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
        mime_type = mime_map.get(suffix, "image/jpeg")

        with open(image_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode()
        image_data_uri = f"data:{mime_type};base64,{b64_data}"

        payload = {"image_url": image_data_uri}

        async with httpx.AsyncClient() as client:
            task_id = await self._create_task(client, "/v1/image-to-3d", payload)
            job.status = "generating"
            data = await self._poll_until_done(client, "/v1/image-to-3d", task_id, job)

            model_url = data.get("model_urls", {}).get("glb")
            thumbnail_url = data.get("thumbnail_url")
            if not model_url:
                raise RuntimeError("Meshy returned success but no GLB model URL")

            dest_dir = self._job_dir(job.id)
            dest_file = dest_dir / "model.glb"
            await self._download_model(client, model_url, dest_file)

        job.model_url = f"/files/{job.id}/model.glb"
        if thumbnail_url:
            job.thumbnail_url = thumbnail_url
        job.status = "completed"
        job.progress = 100
        return job

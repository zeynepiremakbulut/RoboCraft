"""Tripo3D API provider for text-to-3D and image-to-3D generation."""
import asyncio
import os
from pathlib import Path

import httpx

from app.core.config import settings
from app.models.schemas import GenerationJob
from app.providers.base import Base3DProvider


class Tripo3DProvider(Base3DProvider):
    API_BASE = "https://api.tripo3d.ai/v2/openapi"
    POLL_INTERVAL = 5   # seconds between status polls
    MAX_POLL_TIME = 300  # 5-minute hard timeout

    # ------------------------------------------------------------------
    # Abstract property implementations
    # ------------------------------------------------------------------

    @property
    def name(self) -> str:
        return "tripo3d"

    @property
    def display_name(self) -> str:
        return "Tripo3D"

    @property
    def supports_text(self) -> bool:
        return True

    @property
    def supports_image(self) -> bool:
        return True

    def is_configured(self) -> bool:
        key = settings.TRIPO3D_API_KEY
        return bool(key and not key.startswith("your_") and len(key) > 10)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.TRIPO3D_API_KEY}",
            "Content-Type": "application/json",
        }

    def _job_dir(self, job_id: str) -> Path:
        d = Path(settings.GENERATED_DIR) / job_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    async def _create_task(self, client: httpx.AsyncClient, payload: dict) -> str:
        """POST /task and return the task_id."""
        resp = await client.post(
            f"{self.API_BASE}/task",
            json=payload,
            headers=self._headers(),
            timeout=30,
        )
        try:
            body = resp.json()
        except Exception:
            body = {}
        if resp.status_code != 200 or body.get("code") != 0:
            msg = body.get("message") or resp.text or f"HTTP {resp.status_code}"
            suggestion = body.get("suggestion", "")
            full_msg = f"Tripo3D: {msg}" + (f" - {suggestion}" if suggestion else "")
            raise RuntimeError(full_msg)
        return body["data"]["task_id"]

    async def _poll_until_done(
        self, client: httpx.AsyncClient, task_id: str, job: GenerationJob
    ) -> dict:
        """Poll GET /task/{task_id} until status is success or failed."""
        elapsed = 0
        while elapsed < self.MAX_POLL_TIME:
            resp = await client.get(
                f"{self.API_BASE}/task/{task_id}",
                headers=self._headers(),
                timeout=30,
            )
            resp.raise_for_status()
            body = resp.json()
            if body.get("code") != 0:
                raise RuntimeError(f"Tripo3D poll error: {body.get('message', body)}")

            data = body["data"]
            status = data.get("status", "")
            progress = data.get("progress", 0)

            # Propagate progress back to the job object
            job.progress = progress
            if status == "running":
                job.status = "generating"
            elif status == "queued":
                job.status = "queued"

            if status == "success":
                return data
            if status == "failed":
                raise RuntimeError(
                    f"Tripo3D task {task_id} failed: {data.get('message', 'unknown error')}"
                )

            await asyncio.sleep(self.POLL_INTERVAL)
            elapsed += self.POLL_INTERVAL

        raise TimeoutError(
            f"Tripo3D task {task_id} did not complete within {self.MAX_POLL_TIME}s"
        )

    async def _download_model(self, client: httpx.AsyncClient, url: str, dest: Path) -> None:
        """Stream-download the GLB file to *dest*."""
        async with client.stream("GET", url, timeout=120) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=8192):
                    f.write(chunk)

    async def _upload_image(self, client: httpx.AsyncClient, image_path: str) -> str:
        """Upload an image file and return the file_token."""
        path = Path(image_path)
        suffix = path.suffix.lstrip(".").lower() or "jpeg"
        # Map common extensions to Tripo3D accepted types
        ext_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}
        file_type = ext_map.get(suffix, "jpeg")

        headers = {"Authorization": f"Bearer {settings.TRIPO3D_API_KEY}"}
        with open(image_path, "rb") as f:
            resp = await client.post(
                f"{self.API_BASE}/upload",
                headers=headers,
                files={"file": (path.name, f, f"image/{file_type}")},
                timeout=60,
            )
        try:
            body = resp.json()
        except Exception:
            body = {}
        if resp.status_code != 200 or body.get("code") != 0:
            msg = body.get("message") or resp.text or f"HTTP {resp.status_code}"
            suggestion = body.get("suggestion", "")
            full_msg = f"Tripo3D upload error: {msg}" + (f" - {suggestion}" if suggestion else "")
            raise RuntimeError(full_msg)
        return body["data"]["image_token"]

    # ------------------------------------------------------------------
    # Public provider interface
    # ------------------------------------------------------------------

    async def text_to_3d(self, prompt: str, job: GenerationJob) -> GenerationJob:
        job.provider = self.name
        job.status = "queued"
        job.progress = 0

        async with httpx.AsyncClient() as client:
            payload = {"type": "text_to_model", "prompt": prompt}
            task_id = await self._create_task(client, payload)

            job.status = "generating"
            data = await self._poll_until_done(client, task_id, job)

            model_url = data.get("output", {}).get("model")
            thumbnail_url = data.get("output", {}).get("rendered_image")
            if not model_url:
                raise RuntimeError("Tripo3D returned success but no model URL")

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

        async with httpx.AsyncClient() as client:
            file_token = await self._upload_image(client, image_path)

            path = Path(image_path)
            suffix = path.suffix.lstrip(".").lower()
            ext_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}
            file_type = ext_map.get(suffix, "jpeg")

            payload = {
                "type": "image_to_model",
                "file": {"type": file_type, "file_token": file_token},
            }
            task_id = await self._create_task(client, payload)

            job.status = "generating"
            data = await self._poll_until_done(client, task_id, job)

            model_url = data.get("output", {}).get("model")
            thumbnail_url = data.get("output", {}).get("rendered_image")
            if not model_url:
                raise RuntimeError("Tripo3D returned success but no model URL")

            dest_dir = self._job_dir(job.id)
            dest_file = dest_dir / "model.glb"
            await self._download_model(client, model_url, dest_file)

        job.model_url = f"/files/{job.id}/model.glb"
        if thumbnail_url:
            job.thumbnail_url = thumbnail_url
        job.status = "completed"
        job.progress = 100
        return job

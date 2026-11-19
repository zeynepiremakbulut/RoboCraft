"""FastAPI routes for 3D model generation jobs."""
import os
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.models.schemas import GenerationJob, TextTo3DRequest
from app.services.image_to_3d import run_image_to_3d
from app.services.text_to_3d import run_text_to_3d

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory job store – fine for a single-process dev server.
# Replace with Redis / a database for production.
# ---------------------------------------------------------------------------
jobs: dict[str, GenerationJob] = {}

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_IMAGE_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024


# ---------------------------------------------------------------------------
# Background task helpers
# ---------------------------------------------------------------------------


async def _run_text_generation(job_id: str, prompt: str) -> None:
    job = jobs[job_id]
    try:
        job.status = "generating"
        updated = await run_text_to_3d(prompt, job)
        updated.updated_at = datetime.utcnow().isoformat()
        jobs[job_id] = updated
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.updated_at = datetime.utcnow().isoformat()
        jobs[job_id] = job


async def _run_image_generation(job_id: str, image_path: str) -> None:
    job = jobs[job_id]
    try:
        job.status = "generating"
        updated = await run_image_to_3d(image_path, job)
        updated.updated_at = datetime.utcnow().isoformat()
        jobs[job_id] = updated
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.updated_at = datetime.utcnow().isoformat()
        jobs[job_id] = job


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/text-to-3d", response_model=GenerationJob, status_code=202)
async def text_to_3d(
    request: TextTo3DRequest,
    background_tasks: BackgroundTasks,
) -> GenerationJob:
    """Submit a text-to-3D generation job. Returns immediately with a queued job."""
    job = GenerationJob(mode="text-to-3d", prompt=request.prompt, status="queued")

    # Create the job output directory now so the GLB writer doesn't have to.
    job_dir = Path(settings.GENERATED_DIR) / job.id
    job_dir.mkdir(parents=True, exist_ok=True)

    jobs[job.id] = job
    background_tasks.add_task(_run_text_generation, job.id, request.prompt)
    return job


@router.post("/image-to-3d", response_model=GenerationJob, status_code=202)
async def image_to_3d(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> GenerationJob:
    """Submit an image-to-3D generation job. Returns immediately with a queued job."""
    # --- Validate content type ---
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {file.content_type!r}. Must be PNG, JPEG, or WEBP.",
        )

    # --- Read and size-check the payload ---
    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Image exceeds maximum size of {settings.MAX_IMAGE_SIZE_MB} MB.",
        )

    # --- Persist the upload so the background task can read it ---
    ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp"):
        ext = "jpg"

    job = GenerationJob(mode="image-to-3d", image_filename=file.filename, status="queued")
    job_dir = Path(settings.GENERATED_DIR) / job.id
    job_dir.mkdir(parents=True, exist_ok=True)

    input_path = job_dir / f"input.{ext}"
    with open(input_path, "wb") as f_out:
        f_out.write(contents)

    jobs[job.id] = job
    background_tasks.add_task(_run_image_generation, job.id, str(input_path))
    return job


@router.get("/jobs", response_model=List[GenerationJob])
async def list_jobs() -> List[GenerationJob]:
    """Return all generation jobs, newest first."""
    return sorted(jobs.values(), key=lambda j: j.created_at, reverse=True)


@router.get("/jobs/{job_id}", response_model=GenerationJob)
async def get_job(job_id: str) -> GenerationJob:
    """Return the status of a single generation job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id!r} not found.")
    return job


@router.get("/jobs/{job_id}/download")
async def download_job(job_id: str, format: str = "glb") -> RedirectResponse:
    """Redirect to the generated model file, or 404 if not ready."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id!r} not found.")
    if job.status != "completed" or not job.model_url:
        raise HTTPException(
            status_code=404,
            detail=f"Model for job {job_id!r} is not available yet (status: {job.status}).",
        )
    return RedirectResponse(url=job.model_url)

# RoboCraft API Reference

**Base URL:** `http://localhost:8001/api`

All endpoints return JSON unless otherwise noted. Errors follow the standard FastAPI format: `{"detail": "error message"}`.

---

## Endpoints

### `POST /generate/text-to-3d`

Generate a 3D model from a natural-language text prompt.

**Request**

```http
POST /api/generate/text-to-3d
Content-Type: application/json
```

```json
{
  "prompt": "Create a futuristic rover with four wheels and a LiDAR sensor"
}
```

| Field | Type | Constraints | Description |
|---|---|---|---|
| `prompt` | `string` | 10–2000 characters | Natural-language description of the robot to generate |

**Response** — `201 Created` — [`GenerationJob`](#generationjob-schema) object with `status: "queued"`.

---

### `POST /generate/image-to-3d`

Generate a 3D model from an uploaded reference image.

**Request**

```http
POST /api/generate/image-to-3d
Content-Type: multipart/form-data
```

| Field | Type | Constraints | Description |
|---|---|---|---|
| `file` | file | PNG / JPG / WEBP, max 10 MB | The robot image to reconstruct |

**Response** — `201 Created` — [`GenerationJob`](#generationjob-schema) object with `status: "queued"`.

---

### `GET /generate/jobs`

List all generation jobs (most recent first).

**Request**

```http
GET /api/generate/jobs
```

**Response** — `200 OK` — Array of [`GenerationJob`](#generationjob-schema) objects.

```json
[
  { "id": "abc123", "status": "completed", ... },
  { "id": "def456", "status": "generating", ... }
]
```

---

### `GET /generate/jobs/{job_id}`

Get the current status of a specific job. Poll this endpoint to track generation progress.

**Request**

```http
GET /api/generate/jobs/{job_id}
```

| Parameter | Location | Type | Description |
|---|---|---|---|
| `job_id` | path | `string` (UUID) | The job identifier returned when the job was created |

**Polling guidelines**
- Recommended interval: **3 seconds**
- Terminal states (stop polling): `"completed"` or `"failed"`
- Intermediate states in order: `queued` → `uploading` → `generating` → `processing` → `completed`

**Response** — `200 OK` — [`GenerationJob`](#generationjob-schema) object.

**Error responses**

| Code | Condition |
|---|---|
| `404 Not Found` | No job with the given `job_id` exists |

---

### `GET /generate/jobs/{job_id}/download`

Download the generated 3D model file.

**Request**

```http
GET /api/generate/jobs/{job_id}/download?format=glb
```

| Parameter | Location | Type | Required | Description |
|---|---|---|---|---|
| `job_id` | path | `string` (UUID) | ✅ | The job identifier |
| `format` | query | `string` | ✅ | Output format — currently only `"glb"` is supported |

**Response** — `302 Found` — Redirect to the static file URL for the generated model, or `404 Not Found` if the model is not yet available.

**Error responses**

| Code | Condition |
|---|---|
| `404 Not Found` | Job does not exist, or generation has not completed yet |

---

### `GET /models/providers`

List available AI providers and their capabilities/configuration status.

**Request**

```http
GET /api/models/providers
```

**Response** — `200 OK` — Array of [`ProviderInfo`](#providerinfo-schema) objects.

```json
[
  {
    "name": "tripo3d",
    "display_name": "Tripo3D",
    "supports_text": true,
    "supports_image": true,
    "status": "available"
  },
  {
    "name": "meshy",
    "display_name": "Meshy",
    "supports_text": true,
    "supports_image": true,
    "status": "unconfigured"
  }
]
```

---

### `GET /health`

Health check endpoint. Can be used by monitoring tools or load balancers.

**Request**

```http
GET /api/health
```

**Response** — `200 OK`

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

## Schemas

### `GenerationJob`

Represents a single 3D model generation task. Returned by all `/generate` endpoints.

| Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | `string` (UUID v4) | No | Unique job identifier. Use this to poll for status and to download the result. |
| `mode` | `"text-to-3d"` \| `"image-to-3d"` | No | How the job was created. |
| `status` | `GenerationStatus` | No | Current lifecycle state (see below). |
| `progress` | `integer` (0–100) | No | Estimated completion percentage reported by the upstream provider. |
| `prompt` | `string` \| `null` | Yes | The text prompt supplied by the user (text-to-3D jobs only). |
| `image_filename` | `string` \| `null` | Yes | Filename of the uploaded image stored on the server (image-to-3D jobs only). |
| `model_url` | `string` \| `null` | Yes | URL path to the downloaded GLB file once the job completes. `null` while in progress. |
| `thumbnail_url` | `string` \| `null` | Yes | URL to a preview thumbnail image. May be `null` depending on the provider. |
| `format` | `string` | No | Output file format. Currently always `"glb"`. |
| `created_at` | `string` (ISO 8601 UTC) | No | Timestamp when the job was submitted. |
| `updated_at` | `string` (ISO 8601 UTC) | No | Timestamp of the last status update. |
| `error` | `string` \| `null` | Yes | Human-readable error message. Set only when `status` is `"failed"`. |
| `provider` | `string` \| `null` | Yes | The AI provider used (e.g. `"tripo3d"` or `"meshy"`). Set after the job is dispatched. |

#### `GenerationStatus` values

| Value | Meaning |
|---|---|
| `"idle"` | Initial state before any action is taken. |
| `"uploading"` | For image-to-3D: the image is being uploaded to the provider. |
| `"queued"` | The job has been accepted and is waiting in the provider's queue. |
| `"generating"` | The provider is actively generating the 3D mesh. |
| `"processing"` | Post-processing the mesh (e.g. texture baking, format conversion). |
| `"completed"` | Generation succeeded. `model_url` is populated. **Terminal.** |
| `"failed"` | Generation failed. `error` is populated. **Terminal.** |

---

### `ProviderInfo`

Describes an AI provider's capabilities and configuration status.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Machine-readable identifier (e.g. `"tripo3d"`, `"meshy"`). |
| `display_name` | `string` | Human-readable name (e.g. `"Tripo3D"`, `"Meshy"`). |
| `supports_text` | `boolean` | Whether the provider supports text-to-3D generation. |
| `supports_image` | `boolean` | Whether the provider supports image-to-3D generation. |
| `status` | `"available"` \| `"unavailable"` \| `"unconfigured"` | `"available"` = API key set and reachable; `"unconfigured"` = API key missing from `.env`; `"unavailable"` = key set but provider unreachable. |

---

## Example: Full text-to-3D workflow

```bash
# 1. Submit a generation job
curl -X POST http://localhost:8000/api/generate/text-to-3d \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A compact hexapod inspection robot with six articulated legs"}'

# → { "id": "f47ac10b-...", "status": "queued", "progress": 0, ... }

# 2. Poll for completion (repeat until status is "completed" or "failed")
curl http://localhost:8000/api/generate/jobs/f47ac10b-...

# → { "id": "f47ac10b-...", "status": "generating", "progress": 42, ... }
# → { "id": "f47ac10b-...", "status": "completed", "progress": 100, "model_url": "/generated/f47ac10b-....glb", ... }

# 3. Download the GLB file
curl -L "http://localhost:8000/api/generate/jobs/f47ac10b-.../download?format=glb" -o robot.glb
```

## Example: Image-to-3D workflow

```bash
# 1. Upload an image and start generation
curl -X POST http://localhost:8000/api/generate/image-to-3d \
  -F "file=@/path/to/robot.png"

# → { "id": "a1b2c3d4-...", "status": "uploading", "progress": 0, ... }

# 2. Poll until complete (same as above)
curl http://localhost:8000/api/generate/jobs/a1b2c3d4-...

# 3. Download
curl -L "http://localhost:8000/api/generate/jobs/a1b2c3d4-.../download?format=glb" -o robot.glb
```

# RoboCraft – AI-Powered 3D Model Generator

> Turn text descriptions or reference images into downloadable 3D robot models in seconds.

![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?logo=fastapi&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-r159-black?logo=three.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Overview

RoboCraft is a full-stack web application that lets you generate 3D robot models using AI — either by typing a natural-language description or by uploading a reference image. It is **focused exclusively on 3D model generation**: there is no physics simulation, ROS integration, or motion planning.

The generated models are delivered in **GLB format**, ready to import into Blender, Unity, Unreal Engine, or any other 3D tool that supports the format.

---

## Features

| Feature | Description |
|---|---|
| **Text-to-3D** | Describe your robot in natural language and get a 3D model |
| **Image-to-3D** | Upload a robot image (PNG / JPG / WEBP) and reconstruct it in 3D |
| **Interactive 3D Viewer** | Orbit, zoom, and pan around the model in the browser; one-click reset |
| **GLB Download** | Download the generated model as a `.glb` file |
| **Dark Engineering UI** | Professional dark theme built with Tailwind CSS and Lucide icons |

---

## AI Provider Research

Selecting the right AI backbone required evaluating both cloud APIs and local open-source models against the target hardware: an **NVIDIA GTX 1650 Super (4 GB VRAM)**.

| Provider | Text-to-3D | Image-to-3D | Local (GTX 1650 Super 4 GB) | License | Chosen |
|---|:---:|:---:|:---:|---|:---:|
| **Tripo3D API** | ✅ | ✅ | ☁️ Cloud – no GPU needed | Commercial | ✅ **Primary** |
| **Meshy API** | ✅ | ✅ | ☁️ Cloud – no GPU needed | Commercial | ✅ **Alternative** |
| Hunyuan3D-2 | ✅ | ✅ | ❌ 24 GB+ VRAM | MIT | ❌ Too heavy |
| TripoSR | ❌ | ✅ | ❌ 8 GB+ VRAM | MIT | ❌ Too heavy |
| Stable Fast 3D | ❌ | ✅ | ❌ 8 GB+ VRAM | Stability AI | ❌ Too heavy |

**Conclusion**: every open-source local model requires at least 8 GB of VRAM. The GTX 1650 Super's 4 GB falls well short, making local inference impractical without significant quality degradation or model quantisation trade-offs. Cloud API providers (Tripo3D and Meshy) deliver high-quality results with zero local GPU requirements, making them the right choice for this hardware target.

---

## Tech Stack

### Frontend
| Technology | Role |
|---|---|
| React 18 | UI framework |
| TypeScript 5 | Type-safe development |
| Vite 5 | Dev server and bundler |
| Tailwind CSS 3 | Utility-first styling |
| React Three Fiber | Declarative Three.js in React |
| Three.js r159 | 3D rendering engine |
| Lucide React | Icon library |

### Backend
| Technology | Role |
|---|---|
| Python 3.11+ | Runtime |
| FastAPI 0.104+ | REST API framework |
| Pydantic v2 | Request/response validation |
| httpx | Async HTTP client for provider APIs |
| aiofiles | Async file I/O for model storage |

### AI
| Provider | Role |
|---|---|
| Tripo3D API | Primary – text-to-3D and image-to-3D |
| Meshy API | Alternative – text-to-3D and image-to-3D |

---

## Project Structure

```
robocraft/
├── frontend/                    # React + TypeScript SPA
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── DownloadButton.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── ProgressPanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── viewer/              # 3D viewer components
│   │   │   ├── EmptyViewer.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Axios API client
│   │   ├── types/
│   │   │   └── index.ts         # Shared TypeScript types
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts           # Dev proxy → backend :8000
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── generate.py  # /api/generate/* endpoints
│   │   │       └── models.py    # /api/models/* endpoints
│   │   ├── services/
│   │   │   ├── text_to_3d.py   # Text-to-3D orchestration
│   │   │   └── image_to_3d.py  # Image-to-3D orchestration
│   │   ├── providers/
│   │   │   ├── base.py          # Abstract provider interface
│   │   │   ├── tripo3d.py       # Tripo3D implementation
│   │   │   └── meshy.py         # Meshy implementation
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models
│   │   └── core/
│   │       └── config.py        # Settings (reads .env)
│   ├── generated/               # Downloaded GLB files (git-ignored)
│   │   └── .gitkeep
│   ├── main.py                  # FastAPI app entrypoint
│   └── requirements.txt
│
├── docs/
│   └── API.md                   # Full REST API reference
├── .env.example                 # Environment variable template
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Python 3.11+** — [python.org](https://www.python.org)
- **Tripo3D API key** — free tier available at [platform.tripo3d.ai](https://platform.tripo3d.ai) (20 credits, no credit card required)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/robocraft.git
cd robocraft
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env and add your TRIPO3D_API_KEY
uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`. Interactive docs at `http://localhost:8001/docs`.

### 3. Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`.

### Getting API Keys

| Provider | Steps | Free tier |
|---|---|---|
| **Tripo3D** | Sign up at [platform.tripo3d.ai](https://platform.tripo3d.ai) → **API** → **Create Key** | 20 credits |
| **Meshy** | Sign up at [meshy.ai](https://www.meshy.ai) → **API** | Free tier available |

---

## Usage

1. **Open** `http://localhost:5173` in your browser.

2. **Text to 3D**  
   - Select the **Text** tab in the sidebar.  
   - Type a robot description (e.g. *"A compact hexapod inspection robot with six articulated legs and a camera dome"*).  
   - Click **Generate**.

3. **Image to 3D**  
   - Select the **Image** tab in the sidebar.  
   - Drag and drop or click to upload a PNG, JPG, or WEBP image of a robot.  
   - Click **Generate**.

4. **View the model** — once generation completes the interactive 3D viewer loads automatically. Use the mouse to orbit, scroll to zoom, and right-click to pan. Click **Reset** to return to the default view.

5. **Download** — click the **Download GLB** button to save the model file.

---

## Configuration

All configuration lives in `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `TRIPO3D_API_KEY` | _(required)_ | Your Tripo3D API key |
| `MESHY_API_KEY` | _(optional)_ | Your Meshy API key (if using Meshy) |
| `TEXT_TO_3D_PROVIDER` | `tripo3d` | Provider for text-to-3D: `tripo3d` or `meshy` |
| `IMAGE_TO_3D_PROVIDER` | `tripo3d` | Provider for image-to-3D: `tripo3d` or `meshy` |
| `HOST` | `0.0.0.0` | Backend bind host |
| `PORT` | `8001` | Backend bind port |

---

## Status

| Feature | Status |
|---|---|
| Full UI with dark professional design | ✅ Works |
| Interactive 3D viewer (orbit, zoom, pan) | ✅ Works |
| Text-to-3D generation | ✅ Works — requires `TRIPO3D_API_KEY` |
| Image-to-3D generation | ✅ Works — requires `TRIPO3D_API_KEY` |
| GLB download | ✅ Works |
| Meshy provider | ⚠️ Requires `MESHY_API_KEY` |
| Local inference | ❌ Requires 8+ GB VRAM — unavailable on GTX 1650 Super |

---

## Switching Providers

Edit `backend/.env` to change which cloud API handles each generation mode:

```dotenv
# Use Tripo3D for everything (default)
TEXT_TO_3D_PROVIDER=tripo3d
IMAGE_TO_3D_PROVIDER=tripo3d

# Or switch one or both to Meshy
TEXT_TO_3D_PROVIDER=meshy
IMAGE_TO_3D_PROVIDER=meshy
```

Restart the backend after any `.env` change.

---

## Development Notes

- **Backend** runs on port `8001`. Auto-reload is enabled by default via `--reload`.
- **Frontend dev server** runs on port `5173` and proxies all `/api` requests to `http://localhost:8001`, so there are no CORS issues during development.
- **Generated models** are stored in `backend/generated/` and are excluded from version control via `.gitignore`.
- **API keys never leave the backend** — the frontend communicates only with the local FastAPI server; your keys are never exposed to the browser.
- FastAPI's auto-generated **Swagger UI** is available at `http://localhost:8000/docs` during development.

---

## License

[MIT](https://opensource.org/licenses/MIT) — see `LICENSE` for details.

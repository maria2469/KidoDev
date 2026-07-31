"""
Kido Dev — Agentic AI Backend
FastAPI app powering the multi-agent system on AMD GPUs.

Agents:
  TutorAgent         — Multi-turn, memory-aware coding hints
  GraderAgent        — Multi-dimensional lesson grading
  CurriculumPlanner  — Personalized learning path generation
  EngagementAgent    — Session disengagement detection

Inference:
  Primary  — Fireworks AI (AMD MI300X cloud)
Inference:
  Primary  — Fireworks AI (AMD MI300X cloud)
  Fallback — Local Qwen2.5-1.5B (AMD ROCm)
"""
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.agent_routes import router as agent_router
from routers.benchmark_routes import router as benchmark_router

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Kido Dev Agentic AI Backend",
    description="Multi-agent system running on AMD GPUs (MI300X via Fireworks AI + local ROCm via Qwen2.5-1.5B)",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://kidodevai.netlify.app")
origins = [o.strip() for o in origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(agent_router)
app.include_router(benchmark_router)

# ─── Root & Health ────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Kido Dev Agentic AI Backend",
        "version": "2.0.0",
        "status": "online",
        "agents": ["TutorAgent", "GraderAgent", "CurriculumPlannerAgent", "EngagementAgent"],
        "inference": {
            "primary": "Fireworks AI (AMD MI300X)",
            "local": "Qwen2.5-1.5B (AMD ROCm)",
        },
        "docs": "/docs",
    }

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

<div align="center">
  <h1>Kido Dev — Agentic AI Platform</h1>
  <p><strong>Multi-Agent Pedagogical Copilot Powered by AMD Compute (MI300X & ROCm) & Fireworks AI</strong></p>
  <p>🏆 <strong>AMD Hackathon — Track 2: Agentic AI Submission</strong></p>
  <p>🌐 <strong>Live Demo:</strong> <a href="https://kidodevai.netlify.app">kidodevai.netlify.app</a></p>
</div>

---

## 📌 Executive Summary

**Kido Dev** is an agentic, gamified educational technology (EdTech) platform designed to teach children visual block-based programming through interactive challenges. 

Built specifically for **Track 2: Agentic AI**, Kido Dev moves beyond standard one-shot LLM prompts by implementing a state-of-the-art **Multi-Agent Architecture** running on **AMD Radeon GPUs (local ROCm)** and **AMD Instinct MI300X GPUs (Fireworks AI cloud)**.

---

## 🤖 Multi-Agent Architecture (Track 2: Agentic AI)

Kido Dev is powered by a Python FastAPI sidecar orchestrating specialized AI agents via a customized **ReAct (Reason → Act → Observe)** loop:

```text
               ┌──────────────────────────────────────────────┐
               │         Frontend Agent Orchestrator          │
               └──────────────────────┬───────────────────────┘
                                      │ HTTP / REST
                                      ▼
               ┌──────────────────────────────────────────────┐
               │           FastAPI Agent Backend              │
               └──────┬───────────────┬──────────────┬────────┘
                      │               │              │
       ┌──────────────┴──────┐ ┌──────┴──────┐ ┌─────┴─────────────┐
       │     TutorAgent      │ │ GraderAgent │ │ CurriculumPlanner │
       │  (Multi-Turn ReAct) │ │  (4-D Score)│ │    (/my-path)     │
       └──────────────┬──────┘ └──────┬──────┘ └─────┬─────────────┘
                      │               │              │
                      └───────────────┼──────────────┘
                                      ▼
                      ┌──────────────────────────────┐
                      │    AMD Inference Hardware    │
                      │  - Fireworks (AMD MI300X)    │
                      │  - Ollama (AMD Radeon ROCm)  │
                      └──────────────────────────────┘
```

### 1. **TutorAgent (Multi-Turn Conversational Tutor)**
- **ReAct Reasoning Loop:** Executes step-by-step reasoning before taking action.
- **Solution Gap Analysis:** Diffing student workspace blocks against solution XML trees to suggest the single best next block.
- **Memory Integration:** Remembers past struggles and strengths to deliver personalized, encouraging nudges.

### 2. **GraderAgent (Multi-Dimensional Scoring)**
- Evaluates completed assignments across 4 distinct dimensions:
  - **Correctness (0-25):** Solution XML match precision.
  - **Efficiency (0-25):** Minimal block usage.
  - **Independence (0-25):** Low reliance on AI hints.
  - **Creativity (0-25):** Addition of extra exploratory blocks.
- Produces natural language pedagogical feedback without spoil-heavy answers.

### 3. **CurriculumPlannerAgent (Personalized Path)**
- Generates dynamic, custom learning roadmaps for each student at `/my-path`.
- Analyzes weak block types, average scores, and past completions to recommend 3-5 prioritized next lessons.

### 4. **EngagementAgent (Passive Session Observer)**
- Monitors idle time, rapid click velocity, and total session duration.
- Automatically triggers break suggestions or motivational prompts when disengagement or fatigue is detected.

---

## ⚡ AMD Radeon GPU & ROCm Optimization

| Feature | Implementation |
|---------|----------------|
| **Cloud AMD Acceleration** | Fine-tuned `Gemma-26B-LoRA` hosted on **AMD Instinct MI300X** via Fireworks AI. |
| **Local AMD Inference** | Native **AMD Radeon GPU acceleration** via ROCm & local Ollama (`llama3.1:8b`). |
| **Live Telemetry & Metrics** | Tracks tokens/sec, latency (ms), and token generation per call in Supabase `agent_logs`. |
| **AMD Benchmark Dashboard** | Dedicated Admin panel view for live benchmark testing and GPU performance analysis. |

---

## 📂 Project Directory Structure

```text
kidodev/
├── frontend/                   # 🎨 React + Vite Web Application
│   ├── src/
│   │   ├── agents/             # Frontend Agent Orchestrator & Memory Store
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/
│   │   │   ├── Admin/          # Admin Dashboard, AMD Benchmark, & Live Agent Feed
│   │   │   ├── Auth/           # Parent & School dashboards
│   │   │   ├── Games/          # Canvas mini-games (Donut, Traffic, Maze)
│   │   │   ├── MagicStudio/    # Blockly studio with Multi-turn Agent Hint Panel
│   │   │   ├── Levels.jsx      # Learning world selection hub
│   │   │   └── PersonalizedPath.jsx # AI Curriculum Planner (/my-path)
│   │   └── utils/              # Client services & Supabase integration
│   ├── public/                 # Static assets & sprites
│   └── package.json            # Frontend scripts
│
├── backend/                    # ⚙️ Python FastAPI Agentic AI Engine
│   ├── agents/                 # Tutor, Grader, Curriculum, Engagement, ReAct loop
│   ├── inference/              # Fireworks AI (MI300X) & Ollama (ROCm) LLM clients
│   ├── memory/                 # Short-term (ring-buffer) & Long-term (Supabase) memory
│   ├── models/                 # Pydantic data schemas
│   ├── routers/                # Agent & Benchmark endpoints
│   ├── tools/                  # 7 Agent tools (DB queries, XML gap analysis)
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── start.bat               # Windows quick-start script
│
├── supabase/                   # 🗄️ Database Migrations
│   └── migrations/             # 002_agent_tables.sql (agent_memory & agent_logs)
│
├── netlify.toml                # Netlify deployment configuration
├── package.json                # Root CLI delegation scripts
└── PROJECT_STRUCTURE.md       # Detailed architectural guide
```

---

## 🔑 Hackathon Demo Credentials

Use these credentials to test user dashboards:

- **School Admin Dashboard:** `adminschool@gmail.com` / `adminschool@gmail.com`
- **Parent Dashboard:** `12345678` / `12345678` *(CNIC without dashes)*
- **Student (Magic Studio) Login:** Secret Key `ADMINPARENTCHILD1`

---

## 🚀 Local Development Setup

### 1. Database Setup
Execute the migration script in your Supabase SQL Editor:
- [`supabase/migrations/002_agent_tables.sql`](file:///d:/Projects/kidodev-1/supabase/migrations/002_agent_tables.sql)

### 2. Start the Backend (FastAPI + AMD Inference)
```bash
cd backend
pip install -r requirements.txt
python main.py
# Server runs on http://localhost:8000 (Docs at http://localhost:8000/docs)
```

### 3. Start the Frontend (React + Vite)
```bash
# From project root:
npm install
npm run dev
# App runs on http://localhost:5173
```

> **Root CLI Shortcuts:**
> - `npm run dev`: Starts frontend dev server
> - `npm run dev:backend`: Starts FastAPI agent backend
> - `npm run build`: Compiles production frontend bundle

---

## 🛠️ Comprehensive Tech Stack

- **AMD Acceleration:** AMD Instinct MI300X (Cloud) + AMD Radeon GPU ROCm (Local)
- **AI Inference Engine:** Fireworks AI & Ollama
- **Model:** Fine-tuned `Gemma-26B-LoRA` (Blockly XML Code Synthesis & Pedagogy)
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, Uvicorn
- **Frontend:** React 18, Vite, Google Blockly, Vanilla CSS
- **Database & Auth:** Supabase (PostgreSQL, Realtime, RLS)

---

## 📜 License

Released under the **MIT License** for open-source compliance.

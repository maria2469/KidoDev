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

## ✨ Features Working So Far

### 🐱 1. Interactive Animated Sprite Guide Agent ("Cat Co-Pilot")
- **Live Drag-and-Drop Demonstrations:** Watch the animated Cat Agent dynamically open the Scratch block flyout menu, grab target blocks with paw precision, drag them across the screen, and snap them into place on the workspace.
- **Screen Matrix SVG Alignment:** Uses native SVG `getScreenCTM()` transformations for pixel-perfect coordinate tracking across zooms, high-DPI displays, and viewports.
- **Smart Workspace Placement:** Calculates the expanded width of category strips and open flyouts to place dropped blocks in the clear, visible center of the workspace canvas (~480px from left) with celebratory starburst sparkles (`✨ ⭐ 🌟 💫`).
- **Interactive Action Pills:** Embedded buttons in chat (`📍 Place Top of workspace (Green Flag) 🎯`) allow kids to request visual block placement assistance anytime.

### 🧠 2. Socratic AI Tutor Agent (`KidoBot`)
- **Socratic Pedagogical Guidance:**
  - *General Hints ("Give me a hint"):* Explains the computer science **concept** needed (e.g. *"To make your character walk forward, you need a block that changes your sprite's position!"*) without blurting out the block name.
  - *Explicit Queries ("What block next?"):* Reveals the exact block name and UI location (*"Look in the Motion panel for the Move Steps block and snap it below your Green Flag block!"*).
  - *Why Queries ("Why?"):* Explains the real-world computer science rationale in simple, engaging terms.
- **Short & Long-Term Memory:** Tracks past student struggles, hint frequency, and objective completion in Supabase.
- **Clean Kid-Friendly Output:** Strips teacher notes, raw XML, and internal guidelines.

### 🤖 3. Multi-Agent Backend Architecture (FastAPI + AMD Inference)
- **TutorAgent:** Multi-turn ReAct loop performing XML solution gap diffing against student workspace blocks.
- **GraderAgent:** Evaluates completed projects across 4 dimensions:
  - *Correctness (0-25)*: Solution XML tree match.
  - *Efficiency (0-25)*: Minimal block count.
  - *Independence (0-25)*: Low AI hint dependency.
  - *Creativity (0-25)*: Exploratory block usage.
- **CurriculumPlannerAgent (`/my-path`):** Dynamically builds personalized learning roadmaps based on weak block types and historic scores.
- **EngagementAgent:** Passive session observer detecting fatigue, idle time, or rapid click velocity.

### 🎮 4. Gamified Learning Studio & Worlds
- **Blockly Visual Studio:** Full custom Scratch block suite (`s_when_flag`, `s_move`, `s_repeat`, `s_forever`, `s_if`, `s_say`, etc.) with live stage execution, costume switching, and sound effects.
- **Themed Level Maps:** Multi-world progression maps (Princess, Wizard, and Adventure themes).
- **Interactive Mini-Games:** Canvas-based coding games including *Catch Donut*, *Traffic Control*, and *Maze Runner*.

### 📊 5. Analytics & School Dashboards
- **School & Parent Dashboards:** Live progress tracking, engagement scores, and AI business insights.
- **AMD Benchmark Dashboard:** Dedicated Admin panel for live GPU latency and throughput benchmark tests.

---

## 🤖 Multi-Agent Architecture Diagram

```text
               ┌──────────────────────────────────────────────┐
               │         Frontend Agent Orchestrator          │
               │    - SpriteGuideAgent (Visual Demonstrator)   │
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

---

## ⚡ AMD Radeon GPU & ROCm Acceleration

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
│   │   │   ├── MagicStudio/    # Blockly studio with Multi-turn Agent & Sprite Guide
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

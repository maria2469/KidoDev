<div align="center">
  <h1>Kido Dev — Agentic AI Platform</h1>
  <p><strong>Multi-Agent Pedagogical Copilot Powered by AMD Compute (MI300X & ROCm GPU) & Ngrok Tunneling</strong></p>
  <p>🏆 <strong>AMD Hackathon — Track 2: Agentic AI Submission</strong></p>
  <p>🌐 <strong>Live Demo:</strong> <a href="https://kidodevai.netlify.app">kidodevai.netlify.app</a></p>
</div>

---

## 📌 Executive Summary

**Kido Dev** is an agentic, gamified educational technology (EdTech) platform designed to teach children visual block-based programming through interactive challenges. 

Built specifically for **Track 2: Agentic AI**, Kido Dev moves beyond standard one-shot LLM prompts by implementing a state-of-the-art **Multi-Agent Architecture** running on **AMD Radeon GPUs (local ROCm)** and **AMD Cloud GPU Instances (Qwen 2.5 1.5B)**.

FastAPI agent services are connected seamlessly to the React frontend client over secure **ngrok tunnels**.

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
- **Hybrid Inference Fallback Engine:** Features seamless multi-tier fallback (Local AMD ROCm -> KidoBot Smart Context Engine) so children receive helpful Socratic responses even when offline.
- **Short & Long-Term Memory:** Tracks past student struggles, hint frequency, and objective completion in Supabase.
- **Clean Kid-Friendly Output:** Strips teacher notes, raw XML, and internal guidelines.

### 🤖 3. Multi-Agent Backend Architecture (FastAPI + AMD Cloud + Ngrok)
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

## 🤖 Multi-Agent & AMD Cloud Architecture Diagram

```text
               ┌──────────────────────────────────────────────┐
               │         Frontend Agent Orchestrator          │
               │    - SpriteGuideAgent (Visual Demonstrator)   │
               └──────────────────────┬───────────────────────┘
                                      │ HTTPS / WSS via Ngrok Tunnel
                                      ▼
               ┌──────────────────────────────────────────────┐
               │    Ngrok Secure Tunnel (AMD Cloud Gateway)   │
               │  https://khalilah-piteous-cortez.ngrok-free.dev│
               └──────────────────────┬───────────────────────┘
                                      │
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
       ┌──────────────────────────────────────────────────────────────┐
       │                 AMD Hybrid Inference Pipeline                │
       ├──────────────────────────────┬───────────────────────────────┤
       │ 1. Local AMD Cloud GPU (ROCm)│ Qwen 2.5 1.5B PyTorch Model   │
       │ 2. Local Ollama Server       │ AMD Radeon GPU Acceleration   │
       │ 3. KidoBot Smart Engine      │ Context-Aware Offline Engine  │
       └──────────────────────────────┴───────────────────────────────┘
```

---

## ⚡ AMD Radeon GPU & Cloud Acceleration

| Feature | Implementation |
|---------|----------------|
| **AMD Cloud GPU Instance** | Fine-tuned `Qwen 2.5 1.5B` hosted locally on AMD GPU at `/workspace/workspace/KidoDev/models/qwen2.5-1.5b`. |
| **Local AMD ROCm Acceleration** | Native AMD Radeon GPU acceleration via ROCm & local Ollama. |
| **Ngrok Tunnel Integration** | Fast, secure HTTPS/WSS proxying (`https://khalilah-piteous-cortez.ngrok-free.dev -> http://localhost:8000`). |
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
│   │   │   ├── Admin/          # Admin Dashboard & AMD GPU Benchmark Runner
│   │   │   ├── Auth/           # Parent & School dashboards
│   │   │   ├── Games/          # Canvas mini-games (Donut, Traffic, Maze)
│   │   │   ├── MagicStudio/    # Blockly studio with Multi-turn Agent & Sprite Guide
│   │   │   ├── Levels.jsx      # Learning world selection hub
│   │   │   └── PersonalizedPath.jsx # AI Curriculum Planner (/my-path)
│   │   └── utils/              # Client services & Supabase integration
│   ├── .env                    # Frontend environment configuration (Ngrok & Supabase)
│   ├── public/                 # Static assets & sprites
│   └── package.json            # Frontend scripts
│
├── backend/                    # ⚙️ Python FastAPI Agentic AI Engine
│   ├── agents/                 # Tutor, Grader, Curriculum, Engagement, ReAct loop
│   ├── inference/              # Qwen 2.5 (AMD ROCm / Cloud), Ollama
│   ├── memory/                 # Short-term (ring-buffer) & Long-term (Supabase) memory
│   ├── models/                 # Pydantic data schemas
│   ├── routers/                # Agent & Benchmark endpoints
│   ├── tools/                  # 7 Agent tools (DB queries, XML gap analysis)
│   ├── .env                    # Backend environment configuration
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

## ⚙️ Setup & Execution Guide

### 1. Environment Configuration

#### **Frontend (`frontend/.env`)**
```env
VITE_SUPABASE_URL=https://cvdbnxeqbirrdyfwrgso.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_oh-OLBt29AfkWdhg5zIOrg_nf1cva3z

# Agentic AI Backend (FastAPI via ngrok tunnel to AMD Cloud GPU)
VITE_AGENT_BACKEND_URL=https://khalilah-piteous-cortez.ngrok-free.dev
VITE_BACKEND_WS_URL=wss://khalilah-piteous-cortez.ngrok-free.dev
```

#### **Backend (`backend/.env`)**
```env
# AMD Cloud GPU Instance Configuration
QWEN_MODEL_PATH=/workspace/workspace/KidoDev/models/qwen2.5-1.5b
QWEN_MODEL=qwen2.5-1.5b
QWEN_HOST=http://localhost:11434

SUPABASE_URL=https://cvdbnxeqbirrdyfwrgso.supabase.co
SUPABASE_SERVICE_KEY=sb_publishable_oh-OLBt29AfkWdhg5zIOrg_nf1cva3z

PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,https://kidodevai.netlify.app
```

---

### 2. Start the Backend (FastAPI + AMD Cloud + Ngrok)

On your AMD Cloud GPU instance / local server:

```bash
cd backend
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Start Ngrok Secure Tunnel
ngrok http 8000 --url=https://khalilah-piteous-cortez.ngrok-free.dev
```

---

### 3. Start the Frontend (React + Vite)

```bash
# From project root:
npm install
npm run dev
# Application available at http://localhost:5173
```

> **Root CLI Shortcuts:**
> - `npm run dev`: Starts frontend dev server
> - `npm run dev:backend`: Starts FastAPI agent backend
> - `npm run build`: Compiles production frontend bundle

---

## 🛠️ Comprehensive Tech Stack

- **AMD Acceleration:** AMD Instinct MI300X + AMD Radeon GPU ROCm + AMD Cloud GPU (Qwen 2.5 1.5B)
- **AI Tunneling & Network:** Ngrok Secure Tunnel Gateway (`https://khalilah-piteous-cortez.ngrok-free.dev`)
- **AI Inference Engine:** Qwen 2.5, Ollama, & KidoBot Smart Context Engine
- **Model:** Fine-tuned `Qwen 2.5 1.5B` (Blockly XML Code Synthesis & Pedagogy)
- **Backend:** Python 3.10+, FastAPI, Pydantic v2, Uvicorn, HTTPX
- **Frontend:** React 18, Vite, Google Blockly, Vanilla CSS
- **Database & Auth:** Supabase (PostgreSQL, Realtime, RLS)

---

## 📜 License

Released under the **MIT License** for open-source compliance.

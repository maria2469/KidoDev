<div align="center">
  <h1>Kido Dev — Agentic AI Platform</h1>
  <p><strong>Multi-Agent Pedagogical Copilot Powered by AMD Compute (MI300X & ROCm GPU) & Ngrok Tunneling</strong></p>
  <p>🏆 <strong>AMD Hackathon — Track 2: Agentic AI Submission</strong></p>
  <p>🌐 <strong>Live Demo:</strong> <a href="https://kidodevai.netlify.app">kidodevai.netlify.app</a></p>
  <p>🔗 <strong>Backend Ngrok Gateway:</strong> <code>https://khalilah-piteous-cortez.ngrok-free.dev</code></p>
</div>

---

## 📌 Executive Summary

**Kido Dev** is an agentic, gamified educational technology (EdTech) platform designed to teach children visual block-based programming through interactive challenges. 

Built specifically for **Track 2: Agentic AI**, Kido Dev moves beyond standard one-shot LLM prompts by implementing a state-of-the-art **Multi-Agent Architecture** running on **AMD Radeon GPUs (local ROCm)** and **AMD Cloud GPU Instances (Qwen 2.5 1.5B)**.

FastAPI agent services are connected seamlessly to the React frontend client over secure **ngrok tunnels**, providing real-time multi-dimensional grading, Socratic hints, personalized learning pathways, and proactive session engagement observation.

---

## ✨ Working Features & Agentic Capabilities

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
- **Hybrid Inference Fallback Engine:** Features multi-tier fallback (Local AMD ROCm -> KidoBot Smart Context Engine) ensuring children always receive contextual hints.
- **Short & Long-Term Memory:** Tracks past student struggles, hint frequency, and objective completion in Supabase.
- **Clean Kid-Friendly Output:** Strips teacher notes, raw XML, and internal guidelines automatically.

### 👁️ 3. Proactive Engagement Agent (Workspace Observer)
- **Active Workspace Observation:** Monitors student interactions, idle duration, rapid block placements, and session length in real time right inside the Workspace Editor (`MagicStudio`).
- **Proactive Nudge Interventions:**
  - *Idle Encouragement (`encourage`)*: Detects inactivity and delivers supportive guidance (`⚡ ENGAGEMENT AGENT: ENCOURAGE`).
  - *Speed Challenge (`challenge`)*: Detects rapid-fire block dragging and prompts quality over speed (`⚡ ENGAGEMENT AGENT: CHALLENGE`).
  - *Fatigue Break (`break`)*: Detects prolonged session length and suggests healthy physical stretches (`⚡ ENGAGEMENT AGENT: BREAK`).
- **Visual Badging**: Displays a dedicated `⚡ ENGAGEMENT AGENT` badge in KidoBot message bubbles to highlight proactive AI interventions.

### 🤖 4. Multi-Agent Backend Architecture (FastAPI + AMD Cloud + Ngrok)
- **TutorAgent (`/agent/tutor`):** Multi-turn ReAct loop performing XML solution gap diffing against student workspace blocks.
- **GraderAgent (`/agent/grade`):** Multi-dimensional scoring evaluating completed student projects across 4 dimensions:
  - *Correctness (0-25)*: Solution XML tree match.
  - *Efficiency (0-25)*: Minimal block count.
  - *Independence (0-25)*: Minimal AI hint dependency.
  - *Creativity (0-25)*: Exploratory block usage.
- **CurriculumPlannerAgent (`/agent/curriculum` & `/my-path`):** Dynamically builds personalized learning roadmaps based on weak block types and historic scores.
- **EngagementAgent (`/agent/engage`):** Passive session observer detecting fatigue, idle time, or rapid click velocity.

### 🎮 5. Gamified Learning Studio & Worlds
- **Blockly Visual Studio:** Full custom Scratch block suite (`s_when_flag`, `s_move`, `s_repeat`, `s_forever`, `s_if`, `s_say`, etc.) with live stage execution, costume switching, and sound effects.
- **Themed Level Maps:** Multi-world progression maps (Princess, Wizard, and Adventure themes).
- **Interactive Mini-Games:** Canvas-based coding games including *Catch Donut*, *Traffic Control*, and *Maze Runner*.

### 📊 6. Analytics & Dashboards
- **School & Parent Dashboards:** Live progress tracking, engagement scores, and AI business insights.
- **AMD Benchmark Dashboard (`/admin`):** Dedicated Admin panel for live GPU latency and throughput benchmark tests (`/benchmark/run`, `/benchmark/history`, `/benchmark/health`).

---

## 🤖 Multi-Agent & AMD Cloud Architecture Diagram

```text
               ┌──────────────────────────────────────────────┐
               │         Frontend Agent Orchestrator          │
               │    - SpriteGuideAgent (Visual Demonstrator)   │
               │    - EngagementAgent (Workspace Observer)     │
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

## ⚡ Tested & Verified Agent Endpoints

All backend endpoints are verified 100% working over HTTP/HTTPS:

| Endpoint | Method | Purpose | Verified Payload Contract |
|---|---|---|---|
| `/health` | `GET` | Backend health check | `{"status": "healthy"}` |
| `/agent/tutor` | `POST` | Multi-turn ReAct tutor hint | `hint_message`, `next_block_type`, `reasoning_trace`, `tools_used`, `tokens_generated`, `latency_ms` |
| `/agent/grade` | `POST` | 4-Dimensional lesson grading | `score`, `badge`, `feedback`, `correctness_score`, `efficiency_score`, `independence_score`, `creativity_score` |
| `/agent/curriculum` | `POST` | Personalized learning path | `recommended_lessons`, `learning_path_summary`, `skill_gaps`, `strengths`, `next_challenge`, `weekly_goal` |
| `/agent/engage` | `POST` | Disengagement detection | `intervention_needed`, `intervention_type`, `message`, `animation_trigger` |
| `/agent/memory/{child}/{session}` | `DELETE` | Clear short-term memory | `{"status": "cleared", "child_id": "...", "session_id": "..."}` |
| `/benchmark/run` | `POST` | AMD GPU inference benchmark | `response_text`, `tokens_generated`, `latency_ms`, `tokens_per_second`, `gpu_type`, `provider` |
| `/benchmark/history` | `GET` | Supabase telemetry log history | `{"logs": [...]}` |
| `/benchmark/health` | `GET` | Qwen 2.5 inference health | `{"local_qwen": {...}}` |

---

## 🔑 Demo Credentials & Quick Access

Use these credentials to test user dashboards & student studio:

- **Student Studio Access:** Secret Key `TEST1` or `ADMINPARENTCHILD1`
- **Parent Dashboard:** Username `12345678` / Password `12345678`
- **School Admin Dashboard:** Email `adminschool@gmail.com` / Password `adminschool@gmail.com`

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

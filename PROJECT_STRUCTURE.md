# Project Structure & Architecture Guide

Welcome to the Kido Dev project architecture reference. This document provides a high-level walkthrough of the codebase, directories, key components, and backend/frontend split.

---

## 📂 Directory Structure

```text
kidodev/
├── backend/                    # Python FastAPI Agentic AI Backend (AMD MI300X / ROCm)
│   ├── agents/                 # Specialist agents (Tutor, Grader, Curriculum, Engagement, ReAct)
│   ├── inference/              # Qwen 2.5 (AMD ROCm / Cloud) & Ollama LLM clients
│   ├── memory/                 # Short-term (ring-buffer) & Long-term (Supabase) memory
│   ├── models/                 # Pydantic schemas
│   ├── routers/                # Agent & Benchmark API routes
│   ├── tools/                  # Agent tool registry & execution dispatchers
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── start.bat               # Windows startup script
│
├── frontend/                   # React + Vite Frontend Web Application
│   ├── public/                 # Public static assets (videos, sprites, standard assets)
│   ├── src/
│   │   ├── agents/             # Frontend Agent Orchestrator & Memory Store
│   │   ├── assets/             # Component assets & transparent WebP outputs
│   │   ├── components/         # Global reusable UI components (Navbar, Footer, ProtectedRoute)
│   │   ├── pages/              # Main route views
│   │   │   ├── Admin/          # Admin Dashboard, AMD Benchmark, & Live Agent Activity Feed
│   │   │   ├── Auth/           # Auth screens (Parent & School dashboards)
│   │   │   ├── Games/          # Canvas/DOM mini-games (Donut, Traffic, Maze)
│   │   │   ├── MagicStudio/    # Blockly drag-and-drop studio with Multi-turn Agent Hint Panel
│   │   │   ├── Levels.jsx      # Learning world selection hub
│   │   │   └── PersonalizedPath.jsx # AI Curriculum Planner page (/my-path)
│   │   ├── scss/               # Theme-specific SCSS files
│   │   └── utils/              # Client-side utility services & Supabase client
│   ├── index.html              # Main DOM index file
│   ├── vite.config.js          # Vite compiler configuration
│   └── package.json            # Frontend dependencies and build scripts
│
├── supabase/                   # Database migrations
│   └── migrations/             # SQL migration files (002_agent_tables.sql)
│
├── .agents/                    # Agent-specific workflows & instructions
├── package.json                # Root package delegation scripts (npm run dev, npm run build)
└── README.md                   # Project overview & documentation
```

---

## 🚀 Running Frontend & Backend

- **Frontend**: Run `npm run dev` from root or inside `frontend/`
- **Backend**: Run `npm run dev:backend` from root or `python main.py` inside `backend/`
- **Production Build**: Run `npm run build` from root

# Project Structure & Architecture Guide

Welcome to the Kido Dev frontend architecture reference. This document provides a high-level walkthrough of the codebase, directories, key components, and graphical page flow.

---

## 📂 Directory Structure

```text
├── .agents/                    # Agent-specific workflows and workspace instructions
├── dist/                       # Production build directory (compiled static assets)
├── public/                     # Public static assets (videos, sprites, standard assets)
├── src/
│   ├── assets/                 # Component assets, including images and styling inputs
│   │   └── no_bg_output/       # Pre-processed clean transparent WebP/JPG assets
│   ├── components/             # Global reusable components
│   │   ├── Loader/             # Custom animated page/sprite loaders
│   │   ├── Navbar.jsx          # Dynamic Top Navigation Bar
│   │   ├── Footer.jsx          # Interactive clouds & site links footer
│   │   └── ProtectedRoute.jsx  # Parental control timer, payment check, & auth shield
│   ├── pages/                  # Main route views
│   │   ├── Admin/              # Kido Admin settings, content uploaders, & analytics
│   │   ├── Auth/               # Registration & Login components
│   │   │   ├── ParentDashboard/# Parent interface, child management, & time limits
│   │   │   ├── SchoolDashboard/# School class management & key downloads
│   │   │   ├── Auth.jsx        # Login entry point with dynamic background themes
│   │   │   └── auth.css        # Auth styles (frosted cards & theme-aware colors)
│   │   ├── Games/              # Built-in Canvas/DOM Mini-games
│   │   │   ├── CatchDonut.jsx  # Donut catching arcade game
│   │   │   ├── TrafficPatrol.jsx # Logic-based traffic directing
│   │   │   └── CoinMaze.jsx    # Sprite-moving pathing maze
│   │   ├── MagicStudio/        # Core Blockly drag-and-drop programming playground
│   │   ├── Levels.jsx          # World Selection Hub (Beginner, Explorer, etc.)
│   │   └── IslandWorldMap.jsx  # Path connections representing learning nodes
│   ├── scss/                   # Custom theme-specific SCSS files
│   └── utils/                  # Core client-side utility services
│       ├── supabaseClient.js   # Supabase backend client configuration
│       └── ThemeContext.jsx    # React Context managing Forest vs. Princess themes
├── index.html                  # Main DOM index file
├── vite.config.js              # Vite compiler configuration
└── package.json                # Project dependencies and building scripts
```

---

## 📊 Graphical Flow & Node Connections

The following diagram illustrates how a user flows through the app's components, how the `ProtectedRoute` intercepts navigation to verify parental controls, and how the learning nodes are connected inside the play islands.

```mermaid
graph TD
    %% Main Routes
    Landing["Landing Page (Hero.jsx)"] --> AuthPage["Auth Screen (Auth.jsx)"]
    
    %% Role Decisions
    AuthPage -->|Kid Role| LoginKid["Kid Login (Secret Key)"]
    AuthPage -->|Parent/School| LoginAdult["Adult Login (Email/Password)"]
    
    %% Protected Route Interceptor
    LoginKid --> ProtectedShield{"ProtectedRoute.jsx"}
    LoginAdult --> ProtectedShield
    
    %% Auth Guard Checks
    ProtectedShield -->|Payment Pending / Expired| SuspendedScreen["Suspension Screen"]
    ProtectedShield -->|Parental Limit Exceeded| TimeLimitScreen["See You Tomorrow Screen"]
    ProtectedShield -->|Verified Access| RoutingHub{"User Role Routing"}
    
    %% Routing Paths
    RoutingHub -->|Parent| ParentDash["Parent Hub (ParentDashboard.jsx)"]
    RoutingHub -->|School| SchoolDash["School Hub (SchoolDashboard.jsx)"]
    RoutingHub -->|Kid| LevelsHub["Levels Hub (Levels.jsx)"]
    
    %% Parent Controls Flow
    ParentDash -->|Update Time Limits / Keys| DBChildren[("Database: children")]
    DBChildren -->|Sync Limits| ProtectedShield
    
    %% Playland / Island Nodes Flow
    LevelsHub -->|Select Island| WorldMap["Island World Map (IslandWorldMap.jsx)"]
    
    subgraph Playland Island Node Connections
        WorldMap --> Node1["Lesson 1: Intro (Blockly Node)"]
        Node1 --> Connection1["Path Line"]
        Connection1 --> Node2["Lesson 2: Logic Loops"]
        Node2 --> Connection2["Path Line"]
        Connection2 --> NodeGame1["Mini Game: Catch Donut"]
        NodeGame1 --> Connection3["Path Line"]
        Connection3 --> Node3["Lesson 3: Variables"]
        Node3 --> NodeStudio["Playground (MagicStudio)"]
    end
    
    %% Game & Studio Exit
    NodeGame1 -->|Back| WorldMap
    NodeStudio -->|Back| WorldMap
    
    %% Styles
    classDef main fill:#0EA5E9,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef shield fill:#EF4444,stroke:#DC2626,stroke-width:2px,color:#fff;
    classDef hub fill:#10B981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef database fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff;
    
    class Landing,AuthPage,LoginKid,LoginAdult main;
    class ProtectedShield,SuspendedScreen,TimeLimitScreen shield;
    class RoutingHub,ParentDash,SchoolDash,LevelsHub,WorldMap hub;
    class DBChildren database;
```

---

## 🛠️ Key Architectural Subsystems

### 1. The Theme Engine (`ThemeContext.jsx`)
- Controls global visual settings (`forest` vs. `princess`).
- Directly shifts loaded graphics, buttons, background images, and brand accents automatically across all sub-pages.
- When the parent toggles the theme, the login background changes smoothly between `loginbg.jpg` (Forest) and `loginbgbarbie.jpg` (Princess).

### 2. The Parental Control Shield (`ProtectedRoute.jsx`)
- Calculates daily usage in minutes via `localStorage` caches (`kido_usage_${childId}`).
- Implements **multi-tab sync protection** (`kido_usage_last_${childId}`) to prevent double-counting when multiple tabs are open.
- Honors `null` or `0` limits as **No Limit (Default)** to ensure kid accounts are never blocked.
- Evaluates payment status and redirects immediately if account suspension occurs.

### 3. The Gamified Blockly Workspace (`MagicStudio/`)
- Integrates Blockly engine workspaces directly inside a responsive canvas.
- Interprets kid-created blocks programmatically to animate visual sprites on the screen.

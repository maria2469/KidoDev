<div align="center">
  <h1>Kido Dev Platform</h1>
  <p><strong>An Intelligent, Gamified EdTech Platform Built on AMD Compute & Fireworks AI</strong></p>
  <p>🌐 <strong>Live Demo:</strong> <a href="https://kidodevai.netlify.app">kidodevai.netlify.app</a></p>
</div>

---

**Kido Dev** is a state-of-the-art, gamified educational technology (EdTech) platform designed to teach children the fundamentals of programming through interactive, block-based challenges. By combining a premium, highly engaging user interface with blazing-fast Large Language Models, Kido Dev creates an immersive, personalized learning environment where every child gets their own real-time AI tutor.

This project was engineered specifically to showcase the immense power of **AMD Compute Infrastructure** and the **Fireworks AI API**. We have moved beyond basic chatbots to demonstrate complex, live code-synthesis and pedagogical state-analysis happening at lightning speed.

---

## Hackathon Demo Credentials

To fully explore Kido Dev, please use the following credentials to test the different user dashboards:

**School Admin Dashboard**
- **Email:** `adminschool@gmail.com`
- **Password:** `adminschool@gmail.com`

**Parent Dashboard**
- **Email:** `12345678`
- **Password:** `12345678` *(CNIC without dashes)*

**Student (Magic Studio) Login**
- **Secret Key:** `ADMINPARENTCHILD1`

---

## The AMD & Fireworks AI Advantage (Our Core Engine)



The beating heart of Kido Dev is our proprietary, high-performance AI integration. When building an educational platform for children, **latency is the enemy**. Kids lose focus if they have to wait for an AI response. To solve this, we architected our intelligence layer entirely on **AMD-accelerated hardware** via **Fireworks AI**.

### How We Train the Model
We utilize a custom fine-tuned model: `gemma4-26b-a4b-kidtutor-lora`. 
- **Data Curation:** We built a proprietary dataset of thousands of XML trees representing custom Blockly layouts, paired with pedagogical hint-generation strategies.
- **LoRA Fine-Tuning:** Using Low-Rank Adaptation (LoRA), we trained the base Gemma 4 model to explicitly understand our proprietary visual blocks (e.g., `<block type="s_when_flag">`).
- **Behavioral Alignment:** The fine-tuning ensures a strict, professional-yet-encouraging pedagogical tone, explicitly restricting emojis and unhelpful direct answers.

### How We Deploy It
- **Fireworks AI Integration:** The LoRA weights are merged and deployed onto Fireworks AI, an enterprise-grade inference platform.
- **AMD Instinct Hardware:** All LLM inference is routed through Fireworks AI endpoints heavily optimized to run on state-of-the-art **AMD Instinct GPUs (like the MI300X)**.
- **Serverless Scaling:** This architecture allows us to run a massive 26-Billion parameter model and achieve ultra-low latency without managing physical hardware nodes.

### How We Use It in Production
The AI is utilized as a dynamic code-synthesizer rather than a standard chatbot:

1. **Auto-Solve (Real-time Code Synthesis):**
   Given only a natural language objective (e.g., "Build an interactive defense game"), the Gemma model synthesizes a complete, perfectly formatted **XML Tree**. This raw code is instantly translated into visual blocks and injected live into the child's workspace, demonstrating the sheer computational speed of our AMD backend.

2. **Dynamic AI Tutor (Live State Analysis):**
   When a child is stuck, they click the "AI Hint" button. The platform takes a live JSON snapshot of the child's current workspace state (the exact blocks they have placed). This state is sent to our AMD-powered Gemma model, which dynamically figures out exactly what mistake they made and generates a personalized hint, nudging them to the exact next block they need.

3. **Robust Frontend Integration:**
   We built aggressive JSON sanitizers (`parseAIJson`) natively into our React frontend to guarantee that even the most complex AI outputs parse perfectly and never crash the learning canvas.

---

## Core Platform Features

### Magic Studio (Interactive Learning)
The core of the platform is the **Magic Studio**, where students drag and drop code blocks (powered by Google Blockly) to solve programming puzzles. The environment is rich with custom sprites, stage areas, and instant visual feedback.

### Admin Project Command Center
A powerful, centralized dashboard for educators and administrators to manage the curriculum.
- **AI-Powered Project Generation:** Educators can type a brief idea, and the AI will architect an entire lesson, complete with step-by-step instructions and solution code.
- **Agent Training Matrix:** Define step-by-step logic and tips that train the AI on how to assist students with specific projects.
- **Project Sequencing & Bulk Uploads:** Easily manage class levels, ordering, and structured curriculums via CSV.

---

## Comprehensive Technology Stack

- **AI Inference Hardware**: State-of-the-art **AMD Compute Infrastructure (AMD Instinct GPUs)**
- **AI API Provider**: **Fireworks AI**
- **Language Model**: Custom LoRA Fine-Tuned **Gemma 4 26B**
- **Frontend Framework**: React (Vite)
- **Styling**: Vanilla CSS & Bootstrap (Strictly NO Tailwind CSS for maximum custom aesthetic control)
- **Visual Engine**: Google Blockly (Heavily Customized)
- **Backend / Database**: Supabase (PostgreSQL, Real-time Auth, Storage)

---

## Setup & Installation (Local Development)

Follow these instructions to set up the Kido Dev frontend on your local machine.

### Prerequisites
- Node.js (v16.x or higher)
- npm or yarn
- A Supabase account and project
- A Fireworks AI API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd kido-dev-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project and add your credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # Ensure your Fireworks API key is configured correctly in src/utils/aiClient.js
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Design Philosophy

Kido Dev is built with **children in mind**. Traditional coding platforms feel like IDEs; ours feels like a game. The UI intentionally avoids complex text walls in favor of rich aesthetics, vibrant colors, micro-animations, and game-like elements to capture attention and reward progress. All UI components are custom-styled to ensure a responsive, premium feel that keeps kids coming back.

---

## License & Compliance

This project is fully open-source and released under the **MIT License**, complying completely with hackathon submission guidelines.

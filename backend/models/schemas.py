from pydantic import BaseModel
from typing import Optional, List, Any, Dict


# ─── Shared ───────────────────────────────────────────────────────────────────

class BlockInfo(BaseModel):
    type: str
    count: int = 1


# ─── Tutor Agent ──────────────────────────────────────────────────────────────

class TutorRequest(BaseModel):
    child_id: str
    session_id: str
    lesson_id: str
    objective: str
    workspace_blocks: List[str]   # list of block types currently in workspace
    workspace_xml: Optional[str] = None
    conversation_history: List[Dict[str, str]] = []  # [{role, content}]
    user_message: Optional[str] = None               # follow-up question from child


class TutorResponse(BaseModel):
    hint_message: str
    next_block_type: Optional[str] = None
    reasoning_trace: List[str] = []
    tools_used: List[str] = []
    tokens_generated: int = 0
    latency_ms: int = 0
    gpu_type: str = "AMD MI300X via Fireworks AI"
    agent_memory_note: Optional[str] = None          # e.g. "I remember you struggled with loops"


# ─── Grader Agent ─────────────────────────────────────────────────────────────

class GradeRequest(BaseModel):
    child_id: str
    lesson_id: str
    workspace_xml: str
    helped_block_types: List[str] = []
    time_seconds: int = 0


class GradeResponse(BaseModel):
    score: int
    badge: str
    feedback: str
    correctness_score: int
    efficiency_score: int
    independence_score: int
    creativity_score: int
    reasoning: str
    tokens_generated: int = 0
    latency_ms: int = 0


# ─── Curriculum Agent ─────────────────────────────────────────────────────────

class CurriculumRequest(BaseModel):
    child_id: str
    completed_lessons: List[Dict[str, Any]] = []
    weak_block_types: List[str] = []
    strong_block_types: List[str] = []
    current_level: str = "Bronze"
    total_xp: int = 0


class CurriculumResponse(BaseModel):
    recommended_lessons: List[Dict[str, Any]] = []
    learning_path_summary: str
    skill_gaps: List[str] = []
    strengths: List[str] = []
    next_challenge: str
    weekly_goal: str
    reasoning_trace: List[str] = []


# ─── Engagement Agent ─────────────────────────────────────────────────────────

class EngagementRequest(BaseModel):
    child_id: str
    session_id: str
    lesson_id: str
    idle_seconds: int = 0
    hint_count: int = 0
    block_placements_last_minute: int = 0
    session_duration_seconds: int = 0


class EngagementResponse(BaseModel):
    intervention_needed: bool
    intervention_type: Optional[str] = None   # "encourage" | "challenge" | "break" | None
    message: Optional[str] = None
    animation_trigger: Optional[str] = None   # "wave" | "dance" | "think"


# ─── Benchmark ────────────────────────────────────────────────────────────────

class BenchmarkRequest(BaseModel):
    prompt: str
    use_local: bool = False   # True = use Ollama/ROCm, False = Fireworks


class BenchmarkResponse(BaseModel):
    response_text: str
    tokens_generated: int
    latency_ms: int
    tokens_per_second: float
    gpu_type: str
    model_name: str
    provider: str   # "Fireworks AI (AMD MI300X)" or "Local Ollama (AMD ROCm)"


# ─── Agent Log ────────────────────────────────────────────────────────────────

class AgentLog(BaseModel):
    child_id: Optional[str] = None
    agent_name: str
    action: str
    tool_used: Optional[str] = None
    tokens_generated: int = 0
    latency_ms: int = 0
    gpu_type: str = "AMD MI300X"

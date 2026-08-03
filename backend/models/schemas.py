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
    gpu_type: str = "AMD ROCm GPU (Qwen2.5-1.5B)"
    agent_memory_note: Optional[str] = None          # e.g. "I remember you struggled with loops"





# ─── Curriculum Agent ─────────────────────────────────────────────────────────

class HomeworkAssignment(BaseModel):
    title: str                          # "Loop Master Challenge"
    objective: str                      # "Build a sprite that walks in a square using repeat loops"
    target_block_types: List[str] = []  # ["s_repeat", "s_move", "s_turn_r"]
    difficulty: str = "medium"          # "easy" | "medium" | "hard"
    estimated_minutes: int = 10
    reason: str = ""                    # "You needed hints on loops 3 times"


class CurriculumRequest(BaseModel):
    child_id: str
    completed_lessons: List[Dict[str, Any]] = []
    weak_block_types: List[str] = []
    strong_block_types: List[str] = []
    current_level: str = "Bronze"
    total_xp: int = 0


class CurriculumResponse(BaseModel):
    recommended_lessons: List[Dict[str, Any]] = []
    homework_assignments: List[Dict[str, Any]] = []
    learning_path_summary: str
    skill_gaps: List[str] = []
    strengths: List[str] = []
    next_challenge: str
    weekly_goal: str
    reasoning_trace: List[str] = []


# ─── Business Insights Agent ──────────────────────────────────────────────────

class BusinessInsightsRequest(BaseModel):
    total_students: int = 0
    active_subscriptions: int = 0
    total_revenue: float = 0.0
    average_score: float = 0.0
    total_completed_missions: int = 0
    school_count: int = 0


class BusinessInsightsResponse(BaseModel):
    executive_summary: str
    health_score: int
    financial_kpis: Dict[str, Any] = {}
    growth_recommendations: List[str] = []
    platform_improvements: List[str] = []
    monetization_opportunities: List[str] = []
    risk_analysis: List[str] = []
    projected_mrr_growth: str
    reasoning_trace: List[str] = []





# ─── Agent Log ────────────────────────────────────────────────────────────────

class AgentLog(BaseModel):
    child_id: Optional[str] = None
    agent_name: str
    action: str
    tool_used: Optional[str] = None
    tokens_generated: int = 0
    latency_ms: int = 0
    gpu_type: str = "AMD MI300X"

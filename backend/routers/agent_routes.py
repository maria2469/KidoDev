"""
Agent Routes — FastAPI router for all /agent/* endpoints.
Includes explicit console logging for live execution tracking.
"""
from fastapi import APIRouter, HTTPException
from models.schemas import (
    TutorRequest, TutorResponse,
    GradeRequest, GradeResponse,
    CurriculumRequest, CurriculumResponse,
    EngagementRequest, EngagementResponse,
)
import agents.tutor_agent as tutor_agent
import agents.grader_agent as grader_agent
import agents.curriculum_agent as curriculum_agent
import agents.engagement_agent as engagement_agent

router = APIRouter(prefix="/agent", tags=["Agents"])


@router.post("/tutor", response_model=TutorResponse, summary="Tutor Agent — Multi-turn AI hint")
async def tutor_endpoint(req: TutorRequest):
    """
    Multi-turn TutorAgent endpoint.
    Maintains session memory, analyzes workspace gap, delivers a contextual hint.
    """
    print(f"\n[AgentRoutes] === POST /agent/tutor ===")
    print(f"   Child ID: {req.child_id} | Session: {req.session_id}")
    print(f"   Message: {req.user_message or 'Hint request'}")
    print(f"   Workspace Blocks: {len(req.workspace_blocks or [])} blocks")
    try:
        res = await tutor_agent.run(req)
        print(f"   [TutorAgent] Response: '{res.hint_message[:60]}...' (Next Block: {res.next_block_type})")
        return res
    except Exception as e:
        print(f"   [TutorAgent ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade", response_model=GradeResponse, summary="Grader Agent — Multi-dimensional scoring")
async def grade_endpoint(req: GradeRequest):
    """
    GraderAgent endpoint.
    Returns correctness + efficiency + independence + creativity scores.
    """
    print(f"\n[AgentRoutes] === POST /agent/grade ===")
    print(f"   Child ID: {req.child_id} | Lesson: {req.lesson_id}")
    print(f"   Time Spent: {req.time_seconds}s")
    try:
        res = await grader_agent.run(req)
        print(f"   [GraderAgent] Score: {res.score}/100 | Badge: {res.badge}")
        return res
    except Exception as e:
        print(f"   [GraderAgent ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum", response_model=CurriculumResponse, summary="Curriculum Planner Agent")
async def curriculum_endpoint(req: CurriculumRequest):
    """
    CurriculumPlannerAgent endpoint.
    Returns personalized learning path based on student history.
    """
    print(f"\n[AgentRoutes] === POST /agent/curriculum ===")
    print(f"   Child ID: {req.child_id}")
    print(f"   Current Level: {req.current_level} | Total XP: {req.total_xp}")
    print(f"   Completed Lessons: {len(req.completed_lessons or [])}")
    try:
        res = await curriculum_agent.run(req)
        print(f"   [CurriculumAgent] Success -> Recommended {len(res.recommended_lessons)} lessons")
        print(f"   [CurriculumAgent] Summary: '{res.learning_path_summary[:70]}...'")
        return res
    except Exception as e:
        print(f"   [CurriculumAgent ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/engage", response_model=EngagementResponse, summary="Engagement Agent — Session observer")
async def engagement_endpoint(req: EngagementRequest):
    """
    EngagementAgent endpoint.
    Detects disengagement and returns intervention recommendations.
    """
    print(f"\n[AgentRoutes] === POST /agent/engage ===")
    print(f"   Child ID: {req.child_id} | Idle Time: {req.idle_time_seconds}s")
    try:
        res = await engagement_agent.run(req)
        print(f"   [EngagementAgent] Action: {res.recommended_action} | Score: {res.engagement_score}")
        return res
    except Exception as e:
        print(f"   [EngagementAgent ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{child_id}/{session_id}", summary="Clear session memory")
async def clear_session_memory(child_id: str, session_id: str):
    """Clear short-term memory for a completed session."""
    print(f"\n[AgentRoutes] === DELETE /agent/memory/{child_id}/{session_id} ===")
    from memory.short_term import short_term_memory
    short_term_memory.clear_session(child_id, session_id)
    return {"status": "cleared", "child_id": child_id, "session_id": session_id}

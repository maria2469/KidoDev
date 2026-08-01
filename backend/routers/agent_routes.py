"""
Agent Routes — FastAPI router for all /agent/* endpoints.
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
    Powered by Qwen 2.5 on AMD GPU.
    """
    try:
        return await tutor_agent.run(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/grade", response_model=GradeResponse, summary="Grader Agent — Multi-dimensional scoring")
async def grade_endpoint(req: GradeRequest):
    """
    GraderAgent endpoint.
    Returns correctness + efficiency + independence + creativity scores.
    """
    try:
        return await grader_agent.run(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum", response_model=CurriculumResponse, summary="Curriculum Planner Agent")
async def curriculum_endpoint(req: CurriculumRequest):
    """
    CurriculumPlannerAgent endpoint.
    Returns personalized learning path based on student history.
    """
    try:
        return await curriculum_agent.run(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/engage", response_model=EngagementResponse, summary="Engagement Agent — Session observer")
async def engagement_endpoint(req: EngagementRequest):
    """
    EngagementAgent endpoint.
    Detects disengagement and returns intervention recommendations.
    """
    try:
        return await engagement_agent.run(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{child_id}/{session_id}", summary="Clear session memory")
async def clear_session_memory(child_id: str, session_id: str):
    """Clear short-term memory for a completed session."""
    from memory.short_term import short_term_memory
    short_term_memory.clear_session(child_id, session_id)
    return {"status": "cleared", "child_id": child_id, "session_id": session_id}

"""
Agent Routes — FastAPI router for all /agent/* endpoints.
Includes explicit console logging for live execution tracking.

Every request may carry a `device_id`. When present, the run is adapted to that
device's capability tier and recorded as an episode in that device's own
telemetry/memory space, so concurrent visitors never share state.
"""
import time

from fastapi import APIRouter, HTTPException
from models.schemas import (
    TutorRequest, TutorResponse,
    CurriculumRequest, CurriculumResponse,
    BusinessInsightsRequest, BusinessInsightsResponse,
)
import agents.tutor_agent as tutor_agent
import agents.curriculum_agent as curriculum_agent
import agents.business_insights_agent as business_insights_agent
from telemetry.device_registry import device_store

router = APIRouter(prefix="/agent", tags=["Agents"])


@router.post("/tutor", response_model=TutorResponse, summary="Tutor Agent — Multi-turn AI hint")
async def tutor_endpoint(req: TutorRequest):
    """
    Multi-turn TutorAgent endpoint.
    Maintains session memory, analyzes workspace gap, delivers a contextual hint.
    """
    adaptation = device_store.adaptation(req.device_id)
    print(f"\n[AgentRoutes] === POST /agent/tutor ===")
    print(f"   Child ID: {req.child_id} | Session: {req.session_id} | Device: {req.device_id} ({adaptation['tier']})")
    print(f"   Message: {req.user_message or 'Hint request'}")
    print(f"   Workspace Blocks: {len(req.workspace_blocks or [])} blocks")
    started = time.time()
    try:
        res = await tutor_agent.run(req, adaptation)
        print(f"   [TutorAgent] Response: '{res.hint_message[:60]}...' (Next Block: {res.next_block_type})")

        device_store.record_turn(req.device_id, req.session_id, "user", req.user_message or "Hint request")
        device_store.record_turn(req.device_id, req.session_id, "assistant", res.hint_message)
        if res.agent_memory_note:
            device_store.add_observation(req.device_id, res.agent_memory_note)
        episode = device_store.record_episode(
            req.device_id, "TutorAgent", f"Hint for lesson {req.lesson_id}",
            latency_ms=int((time.time() - started) * 1000),
            tokens_generated=res.tokens_generated,
            provider=res.gpu_type,
            session_id=req.session_id,
            detail={"next_block_type": res.next_block_type, "blocks_placed": len(req.workspace_blocks or [])},
        )
        if episode:
            res.episode_id = episode["episode_id"]
        return res
    except Exception as e:
        print(f"   [TutorAgent ERROR] {e}")
        device_store.record_episode(
            req.device_id, "TutorAgent", f"Hint for lesson {req.lesson_id}", status="error",
            latency_ms=int((time.time() - started) * 1000), session_id=req.session_id,
            detail={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curriculum", response_model=CurriculumResponse, summary="Curriculum Planner Agent")
async def curriculum_endpoint(req: CurriculumRequest):
    """
    CurriculumPlannerAgent endpoint.
    Returns personalized learning path based on student history.
    """
    adaptation = device_store.adaptation(req.device_id)
    print(f"\n[AgentRoutes] === POST /agent/curriculum ===")
    print(f"   Child ID: {req.child_id} | Device: {req.device_id} ({adaptation['tier']})")
    print(f"   Current Level: {req.current_level} | Total XP: {req.total_xp}")
    print(f"   Completed Lessons: {len(req.completed_lessons or [])}")
    started = time.time()
    try:
        res = await curriculum_agent.run(req, adaptation)
        print(f"   [CurriculumAgent] Success -> Recommended {len(res.recommended_lessons)} lessons")
        print(f"   [CurriculumAgent] Summary: '{res.learning_path_summary[:70]}...'")
        device_store.record_episode(
            req.device_id, "CurriculumAgent", f"Learning path for {req.child_id}",
            latency_ms=int((time.time() - started) * 1000),
            detail={"recommended": len(res.recommended_lessons), "homework": len(res.homework_assignments)},
        )
        return res
    except Exception as e:
        print(f"   [CurriculumAgent ERROR] {e}")
        device_store.record_episode(
            req.device_id, "CurriculumAgent", f"Learning path for {req.child_id}", status="error",
            latency_ms=int((time.time() - started) * 1000), detail={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/business-insights", response_model=BusinessInsightsResponse, summary="Business Insights Agent — Growth & platform optimization advisor")
async def business_insights_endpoint(req: BusinessInsightsRequest):
    """
    BusinessInsightsAgent endpoint.
    Analyzes platform metrics and delivers strategic recommendations for growth, monetization, and retention.
    """
    adaptation = device_store.adaptation(req.device_id)
    print(f"\n[AgentRoutes] === POST /agent/business-insights ===")
    print(f"   Students: {req.total_students} | Paid Subscriptions: {req.active_subscriptions}")
    print(f"   Revenue (PKR): {req.total_revenue} | Avg Score: {req.average_score}% | Device: {req.device_id}")
    started = time.time()
    try:
        res = await business_insights_agent.run(req, adaptation)
        print(f"   [BusinessInsightsAgent] Summary: '{res.executive_summary[:70]}...' | Health Score: {res.health_score}/100")
        device_store.record_episode(
            req.device_id, "BusinessInsightsAgent", "Executive platform briefing",
            latency_ms=int((time.time() - started) * 1000),
            detail={"health_score": res.health_score},
        )
        return res
    except Exception as e:
        print(f"   [BusinessInsightsAgent ERROR] {e}")
        device_store.record_episode(
            req.device_id, "BusinessInsightsAgent", "Executive platform briefing", status="error",
            latency_ms=int((time.time() - started) * 1000), detail={"error": str(e)},
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/memory/{child_id}/{session_id}", summary="Clear session memory")
async def clear_session_memory(child_id: str, session_id: str):
    """Clear short-term memory for a completed session."""
    print(f"\n[AgentRoutes] === DELETE /agent/memory/{child_id}/{session_id} ===")
    from memory.short_term import short_term_memory
    short_term_memory.clear_session(child_id, session_id)
    return {"status": "cleared", "child_id": child_id, "session_id": session_id}

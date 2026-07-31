"""
Curriculum Planner Agent — Personalized learning path generator.
Analyzes a child's history and plans the optimal next lessons.
"""
import json
import re
from typing import List, Dict, Any

from inference import fireworks_client
from memory.long_term import load_memory, log_agent_action
from tools.registry import get_all_lessons, get_completed_lessons, get_student_profile
from models.schemas import CurriculumRequest, CurriculumResponse


SYSTEM_PROMPT = """You are an expert curriculum designer for a kids coding education platform.
CRITICAL RULE: DO NOT use any emojis.
Your task: Analyze a student's learning history and create a personalized learning path.

Given:
- Student profile (XP, level, badges)
- Completed lessons with scores
- Weak and strong block types (from agent memory)
- All available lessons

Create a personalized learning plan. Respond ONLY with valid JSON:
{
  "recommended_lessons": [
    {"lesson_id": "L1P2", "title": "Lesson title", "reason": "Why this lesson is recommended", "priority": "high"}
  ],
  "learning_path_summary": "2-3 sentence summary of the student's progress and next steps.",
  "skill_gaps": ["skill gap 1", "skill gap 2"],
  "strengths": ["strength 1", "strength 2"],
  "next_challenge": "The specific skill or concept to focus on next.",
  "weekly_goal": "A realistic goal for the next 7 days."
}
"""


async def run(req: CurriculumRequest) -> CurriculumResponse:
    """Main entry point for CurriculumPlannerAgent."""

    reasoning_trace = []

    # ── 1. Load all context ───────────────────────────────────────────────────
    reasoning_trace.append("Loading student profile and lesson database...")
    all_lessons = await get_all_lessons()
    completed = await get_completed_lessons(req.child_id)
    long_mem = await load_memory(req.child_id)
    profile = await get_student_profile(req.child_id)

    reasoning_trace.append(f"Found {len(all_lessons)} total lessons, {len(completed)} completed")

    # ── 2. Build context for the planner ─────────────────────────────────────
    completed_ids = {c["lesson_id"] for c in completed}
    uncompleted = [l for l in all_lessons if l.get("id") not in completed_ids]
    reasoning_trace.append(f"Identified {len(uncompleted)} uncompleted lessons")

    weak_blocks = req.weak_block_types or long_mem.get("weak_block_types", [])
    strong_blocks = req.strong_block_types or long_mem.get("strong_block_types", [])

    avg_score = 0
    if completed:
        avg_score = sum(c.get("score", 0) for c in completed) / len(completed)

    user_prompt = f"""Student Profile:
- Level: {req.current_level or profile.get('level', 'Bronze')}
- Total XP: {req.total_xp or profile.get('total_xp', 0)}
- Average Score: {avg_score:.1f}
- Weak Block Types: {', '.join(weak_blocks) or 'Unknown'}
- Strong Block Types: {', '.join(strong_blocks) or 'Unknown'}

Completed Lessons ({len(completed)}):
{json.dumps(completed[-10:], indent=2)}

All Available Lessons ({len(all_lessons)} total). Uncompleted ({len(uncompleted)}):
{json.dumps(uncompleted[:15], indent=2)}

Create a personalized curriculum plan for this student. Recommend 3-5 specific uncompleted lessons from the list above, prioritized by their current skill level and gaps."""

    result = await fireworks_client.get_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=1024,
        temperature=0.4,
    )

    raw = result.get("text", "").strip()
    reasoning_trace.append("Generated personalized curriculum via AMD MI300X inference")

    # ── 3. Parse response ─────────────────────────────────────────────────────
    recommended = []
    summary = "Keep up the great work and focus on completing new lessons!"
    skill_gaps = weak_blocks[:3]
    strengths = strong_blocks[:3]
    next_challenge = "Try using loop blocks in your next project."
    weekly_goal = "Complete 2 new lessons this week."

    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
        recommended = parsed.get("recommended_lessons", recommended)
        summary = parsed.get("learning_path_summary", summary)
        skill_gaps = parsed.get("skill_gaps", skill_gaps)
        strengths = parsed.get("strengths", strengths)
        next_challenge = parsed.get("next_challenge", next_challenge)
        weekly_goal = parsed.get("weekly_goal", weekly_goal)
    except Exception:
        # Fallback: recommend first 3 uncompleted lessons
        for lesson in uncompleted[:3]:
            recommended.append({
                "lesson_id": lesson.get("id", ""),
                "title": lesson.get("title", "Untitled"),
                "reason": "This lesson is next in your curriculum.",
                "priority": "medium",
            })

    reasoning_trace.append(f"Recommended {len(recommended)} lessons for this student")

    # ── 4. Log ────────────────────────────────────────────────────────────────
    await log_agent_action(
        child_id=req.child_id,
        agent_name="CurriculumPlannerAgent",
        action="Generated personalized learning path",
        tool_used="get_all_lessons,get_completed_lessons",
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
    )

    return CurriculumResponse(
        recommended_lessons=recommended,
        learning_path_summary=summary,
        skill_gaps=skill_gaps,
        strengths=strengths,
        next_challenge=next_challenge,
        weekly_goal=weekly_goal,
        reasoning_trace=reasoning_trace,
    )

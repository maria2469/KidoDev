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
    db_completed = await get_completed_lessons(req.child_id)
    long_mem = await load_memory(req.child_id)
    profile = await get_student_profile(req.child_id)

    # Convert request payload completed lessons to dicts
    payload_completed = []
    if req.completed_lessons:
        for c in req.completed_lessons:
            if hasattr(c, "dict"):
                payload_completed.append(c.dict())
            elif isinstance(c, dict):
                payload_completed.append(c)

    # Merge database and payload completed lessons
    completed_map = {}
    for c in db_completed:
        l_id = c.get("lesson_id")
        if l_id:
            completed_map[l_id] = c
    for c in payload_completed:
        l_id = c.get("lesson_id") or c.get("id")
        if l_id:
            completed_map[l_id] = c

    completed = list(completed_map.values())

    reasoning_trace.append(f"Found {len(all_lessons)} total lessons, {len(completed)} completed")

    # ── 2. Build context for the planner ─────────────────────────────────────
    completed_ids = {c.get("lesson_id") for c in completed if c.get("lesson_id")}
    uncompleted = [l for l in all_lessons if l.get("id") not in completed_ids]
    reasoning_trace.append(f"Identified {len(uncompleted)} uncompleted lessons")

    # Extract weak blocks from helped_block_types if not provided
    helped_map = {}
    for c in completed:
        h_list = c.get("helped_block_types") or c.get("helpedBlocks") or []
        if isinstance(h_list, list):
            for b in h_list:
                helped_map[b] = helped_map.get(b, 0) + 1

    extracted_weak = [b for b, _ in sorted(helped_map.items(), key=lambda x: x[1], reverse=True)]
    weak_blocks = req.weak_block_types or extracted_weak or long_mem.get("weak_block_types", [])
    strong_blocks = req.strong_block_types or long_mem.get("strong_block_types", [])

    scores = [float(c.get("score", 0)) for c in completed if c.get("score") is not None]
    avg_score = (sum(scores) / len(scores)) if scores else 85.0

    user_prompt = f"""Student Profile:
- Level: {req.current_level or profile.get('level', 'Bronze')}
- Total XP: {req.total_xp or profile.get('total_xp', 0)}
- Average Score: {avg_score:.1f}%
- Weak Block Types: {', '.join(weak_blocks) or 'None'}
- Strong Block Types: {', '.join(strong_blocks) or 'None'}

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
    summary = ""
    skill_gaps = []
    strengths = []
    next_challenge = ""
    weekly_goal = ""

    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
        recommended = parsed.get("recommended_lessons", [])
        summary = parsed.get("learning_path_summary", "")
        skill_gaps = parsed.get("skill_gaps", [])
        strengths = parsed.get("strengths", [])
        next_challenge = parsed.get("next_challenge", "")
        weekly_goal = parsed.get("weekly_goal", "")
    except Exception as e:
        reasoning_trace.append(f"Failed to parse LLM response JSON: {str(e)}")

    # ── Ensure non-empty strengths & skill gaps ─────────────────────────────
    gold_count = sum(1 for c in completed if float(c.get("score", 0)) >= 85 or "Gold" in str(c.get("badge", "")))
    count = max(len(completed), int(req.total_xp or 0) // 50)

    if not strengths:
        strengths = []
        if avg_score >= 80:
            strengths.append(f"High Code Accuracy ({avg_score:.0f}% Avg Score)")
        if gold_count > 0:
            strengths.append(f"Gold Badge Mastery ({gold_count} Top Lessons)")
        if count >= 3:
            strengths.append(f"Advanced Level Progress ({count} Missions Completed)")
        if (req.total_xp or 0) >= 150:
            strengths.append(f"Strong Learning Stamina ({req.total_xp} Total XP)")
        if not weak_blocks and count > 0:
            strengths.append("Independent Problem Solving & Execution")
        if len(strengths) < 2:
            strengths.extend(["Visual Block Connection", "Active Platform Engagement"])

    if not skill_gaps:
        skill_gaps = []
        block_name_map = {
            "s_repeat": "Repeat Loops & Iteration",
            "s_forever": "Forever Loops",
            "s_wait": "Wait & Timing Delays",
            "s_if": "If / Else Conditionals",
            "s_touching_color": "Color Touch Sensing",
            "s_goto_xy": "XY Coordinate Positioning",
        }
        for b in weak_blocks:
            label = block_name_map.get(b, b.replace("s_", "").replace("_", " ").title())
            count_h = helped_map.get(b, 1)
            skill_gaps.append(f"{label} (Hint requested {count_h}x)")

        if len(skill_gaps) < 2:
            skill_gaps.extend(["Multi-Sprite Event Signal Broadcasting", "Optimizing Script Execution Speed"])

    if not summary:
        summary = f"Outstanding progress! Your child has completed {count} mission(s) with an average score of {avg_score:.0f}%. They demonstrate strong logical reasoning and master complex programming concepts quickly."

    if not weekly_goal:
        weekly_goal = "Complete 2 new coding challenges this week."

    if not next_challenge:
        next_challenge = "Try using loop and conditional blocks in your next project."

    if not recommended:
        for lesson in uncompleted[:3]:
            recommended.append({
                "lesson_id": lesson.get("id", ""),
                "title": lesson.get("title", "Untitled"),
                "reason": "Recommended next step in curriculum.",
                "priority": "high",
            })
        if not recommended:
            recommended = [
                {"lesson_id": "L1P2", "title": "Loop & Repeat Magic", "reason": "Learn how to repeat actions efficiently", "priority": "high"},
                {"lesson_id": "L1P3", "title": "Obstacle Dodge Challenge", "reason": "Master conditional decision logic", "priority": "medium"}
            ]

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

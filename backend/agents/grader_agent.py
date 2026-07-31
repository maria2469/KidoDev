"""
Grader Agent — Multi-dimensional scoring with natural language feedback.
Evaluates: correctness + efficiency + independence + creativity.
"""
import re
import json
from typing import List, Dict, Any

from inference import fireworks_client
from memory.long_term import update_memory, log_agent_action, load_memory
from models.schemas import GradeRequest, GradeResponse


SYSTEM_PROMPT = """You are an expert Blockly coding evaluator for a kids educational platform.
CRITICAL RULE: DO NOT use any emojis.
You will receive:
1. The student's workspace blocks
2. The correct solution blocks
3. Contextual data (help used, time taken)

Evaluate across 4 dimensions (each 0-25):
- Correctness: How well do their blocks match the solution?
- Efficiency: Did they use minimal blocks to achieve the goal?
- Independence: Did they figure it out without AI help?
- Creativity: Did they add extra blocks showing exploration?

Respond ONLY with valid JSON:
{
  "correctness_score": 20,
  "efficiency_score": 18,
  "independence_score": 22,
  "creativity_score": 5,
  "total_score": 65,
  "badge": "Silver Medal",
  "feedback": "Two or three encouraging sentences about what they did well and what to improve. No emojis.",
  "reasoning": "Brief internal reasoning about the scores."
}
"""


async def run(req: GradeRequest) -> GradeResponse:
    """Main entry point for GraderAgent."""

    # Extract blocks from XML
    student_blocks = _extract_blocks(req.workspace_xml)
    helped_set = set(req.helped_block_types)

    # Fetch solution for comparison
    from tools.registry import get_solution_xml, get_lesson_details
    solution_data = await get_solution_xml(req.lesson_id)
    solution_xml = solution_data.get("xml", "")
    solution_blocks = _extract_blocks(solution_xml)

    # Compute raw metrics
    student_set = set(student_blocks)
    sol_set = set(solution_blocks)

    matching = student_set & sol_set
    missing = sol_set - student_set
    extra = student_set - sol_set
    helped_in_workspace = student_set & helped_set

    # Build grading prompt
    user_prompt = f"""Student blocks: {', '.join(student_blocks) or 'None'}
Solution blocks: {', '.join(solution_blocks) or 'Not available'}
Matching blocks: {', '.join(matching) or 'None'}
Missing blocks: {', '.join(missing) or 'None'}
Extra/creative blocks: {', '.join(extra) or 'None'}
Blocks placed with AI help: {', '.join(helped_in_workspace) or 'None'}
Time taken: {req.time_seconds} seconds
Total block count: {len(student_blocks)}

Grade this student's work now."""

    result = await fireworks_client.get_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=512,
        temperature=0.2,
    )

    raw = result.get("text", "").strip()

    # Parse JSON response
    score = 0
    badge = "Participant"
    feedback = "Good effort! Keep practicing."
    correctness = 0
    efficiency = 0
    independence = 0
    creativity = 0
    reasoning = ""

    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
        correctness = int(parsed.get("correctness_score", 0))
        efficiency = int(parsed.get("efficiency_score", 0))
        independence = int(parsed.get("independence_score", 0))
        creativity = int(parsed.get("creativity_score", 0))
        score = min(100, correctness + efficiency + independence + creativity)
        badge = _get_badge(score)
        feedback = parsed.get("feedback", feedback)
        reasoning = parsed.get("reasoning", "")
    except Exception:
        # Fallback to simple scoring
        if solution_blocks:
            match_ratio = len(matching) / max(len(sol_set), 1)
            help_penalty = len(helped_in_workspace) / max(len(student_set), 1)
            score = max(0, int(match_ratio * 80 * (1 - help_penalty * 0.3)))
        else:
            score = min(100, len(student_blocks) * 12)
        badge = _get_badge(score)
        correctness = score // 4
        efficiency = score // 4
        independence = score // 4
        creativity = score - (score // 4 * 3)

    # Update student long-term memory with performance
    long_mem = await load_memory(req.child_id)
    weak = list(set(long_mem.get("weak_block_types", []) + list(missing)[:3]))[:10]
    strong = list(set(long_mem.get("strong_block_types", []) + list(matching)[:3]))[:10]
    await update_memory(req.child_id, {"weak_block_types": weak, "strong_block_types": strong})

    # Log
    await log_agent_action(
        child_id=req.child_id,
        agent_name="GraderAgent",
        action=f"Graded lesson {req.lesson_id} — score {score}",
        tool_used="get_solution_xml",
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
    )

    return GradeResponse(
        score=score,
        badge=badge,
        feedback=feedback,
        correctness_score=correctness,
        efficiency_score=efficiency,
        independence_score=independence,
        creativity_score=creativity,
        reasoning=reasoning,
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
    )


def _extract_blocks(xml: str) -> List[str]:
    if not xml:
        return []
    types = re.findall(r'type="([^"]+)"', xml)
    return [t for t in types if t not in ("math_number", "text")]


def _get_badge(score: int) -> str:
    if score >= 90:
        return "Gold Medal"
    elif score >= 70:
        return "Silver Medal"
    elif score >= 50:
        return "Bronze Medal"
    elif score >= 30:
        return "Participant"
    return "Keep Trying"

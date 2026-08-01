"""
Grader Agent — Multi-dimensional scoring with natural language feedback.
Evaluates: correctness + efficiency + independence + creativity.
Powered by Qwen 2.5 on AMD GPU.
"""
import re
import json
from typing import List, Dict, Any

from inference import qwen_client
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

Respond ONLY with valid JSON matching this exact format:
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


def _parse_grader_json(raw_text: str) -> dict:
    """Robust JSON extractor for Qwen LLM output."""
    if not raw_text:
        return {}
    clean = re.sub(r"```(?:json|JSON)?|```", "", raw_text).strip()
    clean = re.sub(r"[\u0000-\u001F]+", " ", clean)
    try:
        return json.loads(clean)
    except Exception:
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return {}


async def run(req: GradeRequest) -> GradeResponse:
    """Main entry point for GraderAgent."""

    # Extract blocks from XML
    student_blocks = _extract_blocks(req.workspace_xml)
    helped_set = set(req.helped_block_types or [])

    # Fetch solution for comparison
    from tools.registry import get_solution_xml
    solution_data = await get_solution_xml(req.lesson_id)
    solution_xml = (solution_data.get("xml") or "") if solution_data else ""
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
Time taken: {req.time_seconds or 0} seconds
Total block count: {len(student_blocks)}

Grade this student's work now."""

    result = await qwen_client.get_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=512,
        temperature=0.2,
    )

    raw = result.get("text", "").strip()

    # Parse JSON response
    parsed = _parse_grader_json(raw)
    
    score = 0
    badge = "Participant"
    feedback = "Good effort! Keep practicing."
    correctness = 0
    efficiency = 0
    independence = 0
    creativity = 0
    reasoning = ""

    if parsed:
        correctness = int(parsed.get("correctness_score", 0))
        efficiency = int(parsed.get("efficiency_score", 0))
        independence = int(parsed.get("independence_score", 0))
        creativity = int(parsed.get("creativity_score", 0))
        
        parsed_total = parsed.get("total_score") or parsed.get("score")
        if parsed_total is not None:
            score = min(100, max(0, int(parsed_total)))
        else:
            score = min(100, max(0, correctness + efficiency + independence + creativity))
            
        badge = parsed.get("badge") or _get_badge(score)
        feedback = parsed.get("feedback") or feedback
        reasoning = parsed.get("reasoning", "")
    else:
        # Fallback to smart rule-based scoring if LLM fails
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

    # Update student long-term memory safely if child_id is provided
    if req.child_id:
        try:
            long_mem = await load_memory(req.child_id)
            weak_existing = long_mem.get("weak_block_types") or []
            strong_existing = long_mem.get("strong_block_types") or []
            
            weak = list(set(weak_existing + list(missing)[:3]))[:10]
            strong = list(set(strong_existing + list(matching)[:3]))[:10]
            await update_memory(req.child_id, {"weak_block_types": weak, "strong_block_types": strong})
        except Exception as e:
            print(f"[GraderAgent] Memory update warning: {e}")

    # Log agent action
    gpu_label = result.get("gpu_type", "AMD ROCm GPU (Qwen2.5-1.5B)")
    await log_agent_action(
        child_id=req.child_id,
        agent_name="GraderAgent",
        action=f"Graded lesson {req.lesson_id} — score {score}",
        tool_used="get_solution_xml",
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
        gpu_type=gpu_label,
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

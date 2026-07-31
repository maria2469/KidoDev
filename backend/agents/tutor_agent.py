"""
Tutor Agent — Multi-turn, memory-aware coding tutor for kids.
Uses ReAct loop to reason about workspace state before giving a hint.
"""
import json
import re
from typing import Dict, Any, List

from inference import fireworks_client
from memory.short_term import short_term_memory
from memory.long_term import load_memory, update_memory, append_observation, log_agent_action
from tools.registry import (
    get_workspace_blocks, get_solution_xml, get_lesson_details,
    get_agent_memory, get_student_profile,
)
from models.schemas import TutorRequest, TutorResponse


SYSTEM_PROMPT = """You are KidoBot — a warm, encouraging AI coding tutor for children aged 6-14.

Your personality:
- Friendly but professional. No emojis. No baby talk.
- Never give direct answers — always GUIDE the child to figure it out themselves.
- Celebrate small wins enthusiastically.
- Keep hints short (2-3 sentences max).

The student is working on a Blockly visual coding challenge.
Your goal: Look at what blocks they have, understand what they need next, and give ONE specific nudge.

CRITICAL RULES:
- DO NOT use emojis.
- DO NOT give the full solution.
- Suggest the NEXT SINGLE block they should add.
- If you know their memory (past struggles), reference it naturally.
- Always end with an encouraging phrase.
"""


async def run(req: TutorRequest) -> TutorResponse:
    """Main entry point for TutorAgent."""

    # ── 1. Load context in parallel ──────────────────────────────────────────
    workspace_info = await get_workspace_blocks(req.workspace_blocks)
    solution_data = await get_solution_xml(req.lesson_id)
    lesson_data = await get_lesson_details(req.lesson_id)
    long_mem = await get_agent_memory(req.child_id)

    # ── 2. Short-term memory — load prior conversation ───────────────────────
    prior_history = short_term_memory.get_context_messages(req.child_id, req.session_id)
    hint_count = short_term_memory.get_hint_count(req.child_id, req.session_id)

    # ── 3. Build memory context string ───────────────────────────────────────
    weak_blocks = long_mem.get("weak_block_types", [])
    strong_blocks = long_mem.get("strong_block_types", [])
    observations = long_mem.get("observations", [])

    memory_context = ""
    if weak_blocks:
        memory_context += f"This student has struggled with: {', '.join(weak_blocks)}. "
    if strong_blocks:
        memory_context += f"They are good at: {', '.join(strong_blocks)}. "
    if observations:
        memory_context += f"Past observations: {'; '.join(observations[-3:])}."
    if hint_count > 0:
        memory_context += f" This is hint #{hint_count + 1} in this session."

    # ── 4. Compute gap between student blocks and solution ───────────────────
    gap_info = _compute_gap(req.workspace_blocks, solution_data.get("xml", ""))

    # ── 5. Build the reasoning prompt ────────────────────────────────────────
    reasoning_trace = []
    reasoning_trace.append(f"Analyzing workspace: {len(req.workspace_blocks)} blocks placed")
    reasoning_trace.append(f"Solution gap: {len(gap_info['missing'])} blocks missing")
    if memory_context:
        reasoning_trace.append(f"Memory context loaded: {memory_context[:80]}...")

    # ── 6. Build messages ────────────────────────────────────────────────────
    messages = []
    # Inject session history
    for m in prior_history[-6:]:   # last 6 messages for context
        messages.append(m)

    # Build user turn
    child_question = req.user_message or "I need a hint for my next block."

    context_block = f"""
Lesson: {lesson_data.get('title', req.lesson_id)}
Objective: {req.objective}

Student's current blocks: {', '.join(req.workspace_blocks) if req.workspace_blocks else 'None placed yet'}

Missing blocks needed: {', '.join(gap_info['missing'][:3]) if gap_info['missing'] else 'Student may have all blocks!'}

Student memory: {memory_context or 'First time using the tutor.'}

Student says: "{child_question}"

Give a helpful, encouraging hint about which block to add next. Do NOT show XML or code. Suggest the next block type by name (e.g., 's_forever') and explain it in simple words.
Respond in this exact JSON format:
{{
  "message": "Your encouraging hint here (2-3 sentences)",
  "next_block_type": "s_block_type_name",
  "memory_note": "A note referencing past memory, or null"
}}
"""

    result = await fireworks_client.get_completion(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=context_block,
        max_tokens=512,
        temperature=0.7,
    )

    raw = result.get("text", "").strip()
    reasoning_trace.append("Generated hint via AMD MI300X inference")

    # ── 7. Parse response ─────────────────────────────────────────────────────
    hint_message = "Great job working on this! Try adding the next block from the Control section."
    next_block_type = gap_info["missing"][0] if gap_info["missing"] else None
    memory_note = None

    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
        hint_message = parsed.get("message", hint_message)
        next_block_type = parsed.get("next_block_type", next_block_type)
        memory_note = parsed.get("memory_note")
    except Exception:
        # Fallback: use raw text as message
        if raw:
            hint_message = raw[:400]

    # ── 8. Update memory ──────────────────────────────────────────────────────
    short_term_memory.push(req.child_id, req.session_id, "user", child_question)
    short_term_memory.push(req.child_id, req.session_id, "assistant", hint_message)

    # Update long-term weak blocks
    if gap_info["missing"] and gap_info["missing"][0] not in weak_blocks:
        await append_observation(req.child_id, f"Struggled with {gap_info['missing'][0]}")

    # Increment hint count in long-term memory
    await update_memory(req.child_id, {"hint_count": long_mem.get("hint_count", 0) + 1})

    # ── 9. Log action ─────────────────────────────────────────────────────────
    await log_agent_action(
        child_id=req.child_id,
        agent_name="TutorAgent",
        action=f"Delivered hint for lesson {req.lesson_id}",
        tool_used="get_solution_xml,get_agent_memory",
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
    )

    return TutorResponse(
        hint_message=hint_message,
        next_block_type=next_block_type,
        reasoning_trace=reasoning_trace,
        tools_used=["get_workspace_blocks", "get_solution_xml", "get_agent_memory"],
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
        gpu_type=result.get("gpu_type", "AMD MI300X via Fireworks AI"),
        agent_memory_note=memory_note,
    )


def _compute_gap(student_blocks: List[str], solution_xml: str) -> Dict[str, List[str]]:
    """Extract missing blocks by diffing student blocks against solution XML."""
    if not solution_xml:
        return {"missing": [], "extra": [], "matching": student_blocks}

    import re
    solution_blocks = re.findall(r'type="([^"]+)"', solution_xml)
    solution_blocks = [b for b in solution_blocks if b not in ("math_number", "text")]
    solution_set = list(dict.fromkeys(solution_blocks))   # preserve order, dedupe
    student_set = set(student_blocks)

    missing = [b for b in solution_set if b not in student_set]
    extra = [b for b in student_blocks if b not in set(solution_blocks)]
    matching = [b for b in student_blocks if b in set(solution_blocks)]

    return {"missing": missing, "extra": extra, "matching": matching}

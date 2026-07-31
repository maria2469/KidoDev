"""
Engagement Agent — Passive session observer for detecting disengagement.
Monitors idle time, rapid interactions, and fatigue signals.
"""
from memory.long_term import log_agent_action, update_memory
from models.schemas import EngagementRequest, EngagementResponse

# Thresholds
IDLE_THRESHOLD_SECONDS = 120       # 2 minutes idle = encourage
RAPID_THRESHOLD_PER_MIN = 20       # too fast = challenge
FATIGUE_THRESHOLD_SECONDS = 1200   # 20 mins = suggest break
HIGH_HINT_THRESHOLD = 5            # 5+ hints = needs more support


async def run(req: EngagementRequest) -> EngagementResponse:
    """Evaluate session state and decide if intervention is needed."""

    intervention_type = None
    message = None
    animation_trigger = None

    # ── Fatigue check ─────────────────────────────────────────────────────────
    if req.session_duration_seconds >= FATIGUE_THRESHOLD_SECONDS:
        intervention_type = "break"
        message = "You have been coding for a while. Take a short break, stretch, and come back refreshed."
        animation_trigger = "wave"

    # ── Idle check ────────────────────────────────────────────────────────────
    elif req.idle_seconds >= IDLE_THRESHOLD_SECONDS:
        if req.hint_count >= HIGH_HINT_THRESHOLD:
            intervention_type = "encourage"
            message = "You are doing great. Sometimes the trickiest problems need a fresh look. Try reading the objective again."
            animation_trigger = "think"
        else:
            intervention_type = "encourage"
            message = "Hey there! Still working on it? You are closer than you think. Check the hint if you need a nudge."
            animation_trigger = "wave"

    # ── Rapid-fire check (not engaging, just clicking) ───────────────────────
    elif req.block_placements_last_minute >= RAPID_THRESHOLD_PER_MIN:
        intervention_type = "challenge"
        message = "Impressive speed! Now slow down and make sure each block is in the right place. Quality beats quantity."
        animation_trigger = "dance"

    # ── High hint usage ───────────────────────────────────────────────────────
    elif req.hint_count >= HIGH_HINT_THRESHOLD:
        intervention_type = "encourage"
        message = "You have asked for several hints — that shows great persistence. Try to solve the next step on your own before asking again."
        animation_trigger = "think"

    needed = intervention_type is not None

    if needed:
        # Update memory with emotion signal
        emotion = "frustrated" if req.hint_count >= HIGH_HINT_THRESHOLD else "disengaged"
        await update_memory(req.child_id, {"last_emotion": emotion})

        await log_agent_action(
            child_id=req.child_id,
            agent_name="EngagementAgent",
            action=f"Triggered {intervention_type} intervention",
            tool_used=None,
            tokens_generated=0,
            latency_ms=0,
        )

    return EngagementResponse(
        intervention_needed=needed,
        intervention_type=intervention_type,
        message=message,
        animation_trigger=animation_trigger,
    )

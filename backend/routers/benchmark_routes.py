"""
Benchmark Routes — AMD GPU performance measurement endpoints.
"""
import time
from fastapi import APIRouter
from models.schemas import BenchmarkRequest, BenchmarkResponse
from inference import qwen_client
from memory.long_term import log_agent_action

router = APIRouter(prefix="/benchmark", tags=["AMD GPU Benchmark"])

AMD_BENCHMARK_PROMPT = "Explain what a loop is to a 7-year-old child in simple words. Keep it to 2 sentences."


@router.post("/run", response_model=BenchmarkResponse, summary="Run AMD GPU inference benchmark")
async def run_benchmark(req: BenchmarkRequest):
    """
    Run an AMD GPU benchmark prompt using Qwen2.5 (AMD ROCm).
    Returns tokens/sec, latency, and model metadata.
    """
    result = await qwen_client.get_completion(
        system_prompt="You are a helpful coding tutor for kids.",
        user_prompt=req.prompt or AMD_BENCHMARK_PROMPT,
    )

    await log_agent_action(
        child_id=None,
        agent_name="BenchmarkRunner",
        action="AMD GPU benchmark",
        tool_used="qwen2.5_rocm",
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
        gpu_type=result.get("gpu_type", "AMD ROCm GPU (Qwen2.5-1.5B)"),
    )

    return BenchmarkResponse(
        response_text=result.get("text", ""),
        tokens_generated=result.get("tokens_generated", 0),
        latency_ms=result.get("latency_ms", 0),
        tokens_per_second=result.get("tokens_per_second", 0.0),
        gpu_type=result.get("gpu_type", "AMD ROCm GPU (Qwen2.5-1.5B)"),
        model_name=result.get("model", "qwen2.5-1.5b"),
        provider=result.get("provider", "Local Qwen2.5 (AMD ROCm)"),
    )


@router.get("/history", summary="Get recent benchmark logs from Supabase")
async def get_benchmark_history(limit: int = 20):
    """Fetch recent agent_logs rows for the AMD benchmark dashboard."""
    import os
    from supabase import create_client

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"logs": [], "error": "Database not configured"}

    try:
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        res = sb.table("agent_logs") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return {"logs": res.data or []}
    except Exception as e:
        return {"logs": [], "error": str(e)}


@router.get("/health", summary="Check inference backends health")
async def health_check():
    """Check availability of Qwen2.5 on AMD GPU."""
    local_ok = await qwen_client.check_health()
    return {
        "local_qwen": {
            "status": "available" if local_ok else "not_running",
            "gpu": "AMD ROCm (Qwen2.5-1.5B)",
            "model": qwen_client.QWEN_MODEL,
            "path": qwen_client.QWEN_MODEL_PATH,
            "hint": f"Local model loaded from {qwen_client.QWEN_MODEL_PATH}",
        },
    }

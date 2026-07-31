"""
Local Ollama Client — AMD ROCm GPU Inference
Used for local AMD GPU demo / benchmark comparison.
"""
import os
import time
import httpx

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


async def get_completion(system_prompt: str, user_prompt: str, max_tokens: int = 512) -> dict:
    """
    Call local Ollama server (AMD ROCm backend).
    Returns same shape as fireworks_client.get_completion().
    """
    url = f"{OLLAMA_HOST}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {"num_predict": max_tokens},
    }

    start_ms = time.time() * 1000
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        end_ms = time.time() * 1000
        latency = int(end_ms - start_ms)

        content = data.get("message", {}).get("content", "")
        # Ollama returns eval_count for tokens generated
        tokens_out = data.get("eval_count", len(content.split()))
        tps = round(tokens_out / max(latency / 1000, 0.001), 1)

        return {
            "text": content,
            "tokens_generated": tokens_out,
            "latency_ms": latency,
            "tokens_per_second": tps,
            "model": OLLAMA_MODEL,
            "gpu_type": "AMD Radeon GPU (ROCm)",
            "provider": "Local Ollama (AMD ROCm)",
            "error": None,
        }

    except httpx.ConnectError:
        return {
            "text": "Ollama not running locally. Start with: ollama serve",
            "tokens_generated": 0,
            "latency_ms": 0,
            "tokens_per_second": 0,
            "model": OLLAMA_MODEL,
            "gpu_type": "AMD Radeon GPU (ROCm)",
            "provider": "Local Ollama (AMD ROCm)",
            "error": "Ollama server not reachable at " + OLLAMA_HOST,
        }
    except Exception as e:
        return {
            "text": "",
            "tokens_generated": 0,
            "latency_ms": 0,
            "tokens_per_second": 0,
            "model": OLLAMA_MODEL,
            "gpu_type": "AMD Radeon GPU (ROCm)",
            "provider": "Local Ollama (AMD ROCm)",
            "error": str(e),
        }


async def check_health() -> bool:
    """Check if local Ollama server is running."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{OLLAMA_HOST}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False

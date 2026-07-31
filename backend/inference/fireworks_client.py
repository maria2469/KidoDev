"""
Fireworks AI Client — AMD MI300X Inference
Handles streaming + non-streaming completions with benchmark metrics.
"""
import os
import time
import httpx
from typing import Optional

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY", "")
MODEL_ID = os.getenv(
    "FIREWORKS_MODEL",
    "accounts/tomarianoor-9npw0j9i/models/gemma4-26b-a4b-kidtutor-lora#accounts/tomarianoor-9npw0j9i/deployments/nuhyho9n"
)
FALLBACK_MODEL = "accounts/fireworks/models/llama-v3p1-8b-instruct"


async def get_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    use_fallback: bool = False,
) -> dict:
    """
    Call Fireworks AI and return response + benchmark metrics.
    Returns: { text, tokens_generated, latency_ms, tokens_per_second, model }
    """
    model = FALLBACK_MODEL if use_fallback else MODEL_ID
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {FIREWORKS_API_KEY}",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_k": 40,
        "presence_penalty": 0,
        "frequency_penalty": 0,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    start_ms = time.time() * 1000
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(FIREWORKS_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        end_ms = time.time() * 1000
        latency = int(end_ms - start_ms)

        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        tokens_out = usage.get("completion_tokens", len(content.split()))
        tps = round(tokens_out / max(latency / 1000, 0.001), 1)

        return {
            "text": content,
            "tokens_generated": tokens_out,
            "latency_ms": latency,
            "tokens_per_second": tps,
            "model": model,
            "gpu_type": "AMD MI300X via Fireworks AI",
            "provider": "Fireworks AI",
            "error": None,
        }

    except httpx.HTTPStatusError as e:
        # Try fallback model once
        if not use_fallback:
            return await get_completion(system_prompt, user_prompt, max_tokens, temperature, use_fallback=True)
        return {
            "text": "",
            "tokens_generated": 0,
            "latency_ms": 0,
            "tokens_per_second": 0,
            "model": model,
            "gpu_type": "AMD MI300X via Fireworks AI",
            "provider": "Fireworks AI",
            "error": str(e),
        }
    except Exception as e:
        return {
            "text": "",
            "tokens_generated": 0,
            "latency_ms": 0,
            "tokens_per_second": 0,
            "model": model,
            "gpu_type": "AMD MI300X via Fireworks AI",
            "provider": "Fireworks AI",
            "error": str(e),
        }

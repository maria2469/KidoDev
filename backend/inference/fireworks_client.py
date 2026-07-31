"""
Fireworks AI Client — AMD MI300X Inference
Handles streaming + non-streaming completions with benchmark metrics.
"""
import os
import time
from pathlib import Path
import httpx
from typing import Optional
from dotenv import load_dotenv

# Load backend/.env explicitly relative to file location
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()

FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
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
    api_key = os.getenv("FIREWORKS_API_KEY", "")
    primary_model = os.getenv(
        "FIREWORKS_MODEL",
        "accounts/tomarianoor-9npw0j9i/models/gemma4-26b-a4b-kidtutor-lora#accounts/tomarianoor-9npw0j9i/deployments/nuhyho9n"
    )
    model = FALLBACK_MODEL if use_fallback else primary_model

    if not api_key:
        print("[FireworksClient] WARNING: FIREWORKS_API_KEY is not set in backend/.env")

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
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
        if not api_key:
            raise ValueError("FIREWORKS_API_KEY is missing")

        async with httpx.AsyncClient(timeout=15.0) as client:
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

    except Exception as e:
        # Try fallback model once on primary model error
        if not use_fallback and api_key and "suspended" not in str(e).lower() and "412" not in str(e):
            print(f"[FireworksClient] Primary model '{model}' failed ({e}). Retrying with fallback '{FALLBACK_MODEL}'...")
            return await get_completion(system_prompt, user_prompt, max_tokens, temperature, use_fallback=True)

        # Check local Ollama fallback if available
        try:
            from inference import ollama_client
            if await ollama_client.check_health():
                print("[FireworksClient] Fireworks unavailable. Routing to local Ollama (AMD ROCm)...")
                return await ollama_client.get_completion(system_prompt, user_prompt, max_tokens)
        except Exception as o_err:
            print(f"[FireworksClient] Ollama fallback check failed: {o_err}")

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


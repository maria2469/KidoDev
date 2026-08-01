"""
Fireworks AI Client — Compatibility Wrapper
Redirects 100% of completion calls to local Qwen 2.5 on AMD GPU.
"""
from typing import Optional
from inference import qwen_client

MODEL_ID = "qwen2.5-1.5b"
FALLBACK_MODEL = "qwen2.5-1.5b"

async def get_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    use_fallback: bool = False,
) -> dict:
    """
    Redirect all legacy calls directly to Qwen 2.5 on AMD GPU.
    """
    return await qwen_client.get_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=temperature,
    )

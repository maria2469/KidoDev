"""
Fireworks AI Client — Compatibility Wrapper
Redirects completion calls to the inference routing engine.
"""
from typing import Optional
from inference import qwen_client

MODEL_ID = qwen_client.QWEN_MODEL
FALLBACK_MODEL = qwen_client.QWEN_MODEL

async def get_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    use_fallback: bool = False,
) -> dict:
    """
    Redirect all calls to the inference routing engine.
    """
    return await qwen_client.get_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=temperature,
    )

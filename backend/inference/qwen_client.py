"""
Qwen Inference Client — Multi-Provider Routing Engine
Supports: Ollama (local), vLLM/OpenAI-compat, HuggingFace Transformers.

INFERENCE_MODE controls provider selection:
  "ollama"       — Use Ollama's native /api/chat (default for local dev)
  "vllm"         — Use vLLM/OpenAI-compatible /v1/chat/completions
  "transformers" — Use local HuggingFace transformers pipeline
  "auto"         — Try Ollama → vLLM → Transformers in order (default)
"""
import os
import time
import httpx
from pathlib import Path

INFERENCE_MODE = os.getenv("INFERENCE_MODE", "auto").lower()
QWEN_MODEL_PATH = os.getenv("QWEN_MODEL_PATH", "/workspace/workspace/KidoDev/models/qwen2.5-1.5b")
QWEN_HOST = os.getenv("QWEN_HOST", "http://localhost:11434")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen2.5-1.5b")

_model_cache = {}


def _get_local_pipeline():
    """Lazily load local HuggingFace pipeline for Qwen2.5 if transformers & torch are installed."""
    if "pipe" in _model_cache:
        return _model_cache["pipe"]

    model_dir = Path(QWEN_MODEL_PATH)
    if not model_dir.exists():
        return None

    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

        tokenizer = AutoTokenizer.from_pretrained(str(model_dir), trust_remote_code=True)
        model = AutoModelForCausalLM.from_pretrained(
            str(model_dir),
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto" if torch.cuda.is_available() else "cpu",
            trust_remote_code=True
        )
        pipe = pipeline("text-generation", model=model, tokenizer=tokenizer)
        _model_cache["pipe"] = pipe
        return pipe
    except ImportError:
        # PyTorch or Transformers not installed in current environment; suppress warning
        return None
    except Exception as e:
        print(f"[QwenClient] Local transformers pipeline load error: {e}")
        return None


async def _try_ollama(system_prompt, user_prompt, max_tokens, temperature):
    """Try Ollama's native /api/chat endpoint."""
    from inference import ollama_client
    result = await ollama_client.get_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    if result.get("error") is None and result.get("text"):
        return result
    return None


async def _try_vllm(system_prompt, user_prompt, max_tokens, temperature):
    """Try vLLM or any OpenAI-compatible /v1/chat/completions endpoint."""
    start_ms = time.time() * 1000

    hosts_to_try = []
    if QWEN_HOST and "8000" not in QWEN_HOST:  # Avoid querying FastAPI app on 8000
        hosts_to_try.append(QWEN_HOST)
    hosts_to_try.append("http://localhost:11434")

    for host in list(dict.fromkeys(hosts_to_try)):
        url = f"{host}/v1/chat/completions"
        payload = {
            "model": QWEN_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    end_ms = time.time() * 1000
                    latency = int(end_ms - start_ms)
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    tokens_out = data.get("usage", {}).get("completion_tokens", len(content.split()))
                    tps = round(tokens_out / max(latency / 1000, 0.001), 1)

                    return {
                        "text": content,
                        "tokens_generated": tokens_out,
                        "latency_ms": latency,
                        "tokens_per_second": tps,
                        "model": QWEN_MODEL,
                        "gpu_type": "vLLM / OpenAI-Compatible Inference",
                        "provider": f"vLLM ({host})",
                        "error": None,
                    }
        except Exception:
            pass

    return None


def _try_transformers_sync(system_prompt, user_prompt, max_tokens, temperature):
    """Try local HuggingFace transformers pipeline (synchronous)."""
    start_ms = time.time() * 1000

    pipe = _get_local_pipeline()
    if pipe is None:
        return None

    try:
        prompt_text = f"<|im_start|>system\n{system_prompt}<|im_end|>\n<|im_start|>user\n{user_prompt}<|im_end|>\n<|im_start|>assistant\n"
        out = pipe(prompt_text, max_new_tokens=max_tokens, do_sample=True, temperature=temperature)
        gen_text = out[0]["generated_text"].replace(prompt_text, "").replace("<|im_end|>", "").strip()

        end_ms = time.time() * 1000
        latency = int(end_ms - start_ms)
        tokens_out = len(gen_text.split())
        tps = round(tokens_out / max(latency / 1000, 0.001), 1)

        return {
            "text": gen_text,
            "tokens_generated": tokens_out,
            "latency_ms": latency,
            "tokens_per_second": tps,
            "model": "qwen2.5-1.5b",
            "gpu_type": "HuggingFace Transformers (Local)",
            "provider": "HuggingFace Transformers",
            "error": None,
        }
    except Exception as e:
        print(f"[QwenClient] HuggingFace local execution error: {e}")
        return None


async def get_completion(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
    **kwargs
) -> dict:
    """
    Route inference to the active provider based on INFERENCE_MODE.
    Modes: "ollama", "vllm", "transformers", "auto"
    """
    start_ms = time.time() * 1000

    # ── Explicit mode routing ────────────────────────────────────────────────
    if INFERENCE_MODE == "ollama":
        result = await _try_ollama(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

    elif INFERENCE_MODE == "vllm":
        result = await _try_vllm(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

    elif INFERENCE_MODE == "transformers":
        result = _try_transformers_sync(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

    elif INFERENCE_MODE == "auto":
        # Auto mode: try Ollama → vLLM → Transformers
        result = await _try_ollama(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

        result = await _try_vllm(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

        result = _try_transformers_sync(system_prompt, user_prompt, max_tokens, temperature)
        if result:
            return result

    # ── Fallback — no provider succeeded ─────────────────────────────────────
    model_exists = Path(QWEN_MODEL_PATH).exists()
    return {
        "text": "",
        "tokens_generated": 0,
        "latency_ms": int((time.time() * 1000) - start_ms),
        "tokens_per_second": 0.0,
        "model": QWEN_MODEL,
        "gpu_type": "KidoBot Smart Context Engine (Fallback)",
        "provider": "KidoBot Fallback Engine",
        "error": None if model_exists else f"No inference provider available (mode={INFERENCE_MODE})",
    }


async def check_health() -> bool:
    """Check if any inference backend is ready."""
    # Check Ollama first
    from inference import ollama_client
    if await ollama_client.check_health():
        return True

    # Check local model path
    if Path(QWEN_MODEL_PATH).exists():
        return True

    # Check vLLM / OpenAI-compat endpoint
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{QWEN_HOST}/v1/models")
            return resp.status_code == 200
    except Exception:
        return False


def get_active_provider() -> str:
    """Return a human-readable string describing the active inference mode."""
    if INFERENCE_MODE == "ollama":
        from inference import ollama_client
        return f"Ollama ({ollama_client.OLLAMA_MODEL} @ {ollama_client.OLLAMA_HOST})"
    elif INFERENCE_MODE == "vllm":
        return f"vLLM ({QWEN_MODEL} @ {QWEN_HOST})"
    elif INFERENCE_MODE == "transformers":
        return f"HuggingFace Transformers ({QWEN_MODEL_PATH})"
    else:
        return f"Auto-detect (Ollama → vLLM → Transformers)"

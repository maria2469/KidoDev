"""
Ollama Compatibility Wrapper — Redirects to Qwen2.5 Client
"""
from inference import qwen_client

get_completion = qwen_client.get_completion
check_health = qwen_client.check_health
OLLAMA_MODEL = qwen_client.QWEN_MODEL
OLLAMA_HOST = qwen_client.QWEN_HOST

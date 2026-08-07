"""
Device Registry — per-device isolated agent state.

Every browser (judge, parent, student, phone) gets its own `device_id`. All
telemetry, agent episodes and conversation memory are stored under that id, so
two people using the same backend never see each other's data, and each one
gets an agent configuration adapted to the hardware they are actually running on.

State is in-process and ephemeral: it lives for the lifetime of the server and
is evicted after DEVICE_TTL_SECONDS of inactivity.
"""
import os
import platform
import time
import uuid
from collections import deque
from threading import RLock
from typing import Any, Dict, List, Optional

DEVICE_TTL_SECONDS = int(os.getenv("DEVICE_TTL_SECONDS", 6 * 60 * 60))
MAX_EPISODES_PER_DEVICE = 100
MAX_TURNS_PER_SESSION = 20
MAX_DEVICES = 500

# ─── Adaptation profiles ──────────────────────────────────────────────────────

TIER_PROFILES: Dict[str, Dict[str, Any]] = {
    "high": {
        "tier_label": "High Performance",
        "max_tokens": 512,
        "temperature": 0.7,
        "react_max_iterations": 5,
        "hint_detail": "rich",
        "reasoning_trace_depth": "full",
        "history_turns": 10,
        "animation_level": "full",
        "telemetry_poll_ms": 2000,
        "prefetch_lessons": True,
    },
    "balanced": {
        "tier_label": "Balanced",
        "max_tokens": 320,
        "temperature": 0.7,
        "react_max_iterations": 3,
        "hint_detail": "standard",
        "reasoning_trace_depth": "summary",
        "history_turns": 6,
        "animation_level": "reduced",
        "telemetry_poll_ms": 4000,
        "prefetch_lessons": True,
    },
    "lite": {
        "tier_label": "Lite (low-power device)",
        "max_tokens": 192,
        "temperature": 0.6,
        "react_max_iterations": 2,
        "hint_detail": "concise",
        "reasoning_trace_depth": "minimal",
        "history_turns": 3,
        "animation_level": "off",
        "telemetry_poll_ms": 8000,
        "prefetch_lessons": False,
    },
}

SOFTWARE_RENDERERS = ("swiftshader", "llvmpipe", "software", "microsoft basic")


def score_device(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Score a client device profile and pick a tier + the reasons behind it."""
    score = 0
    reasons: List[str] = []

    cores = profile.get("cpu_cores") or 0
    if cores >= 8:
        score += 2
        reasons.append(f"{cores} CPU threads")
    elif cores >= 4:
        score += 1
        reasons.append(f"{cores} CPU threads")
    elif cores:
        reasons.append(f"only {cores} CPU threads")

    mem = profile.get("device_memory_gb") or 0
    if mem >= 8:
        score += 2
        reasons.append(f"{mem:g} GB RAM")
    elif mem >= 4:
        score += 1
        reasons.append(f"{mem:g} GB RAM")
    elif mem:
        reasons.append(f"only {mem:g} GB RAM")

    renderer = (profile.get("gpu_renderer") or "").lower()
    if renderer:
        if any(sr in renderer for sr in SOFTWARE_RENDERERS):
            score -= 2
            reasons.append("software GPU rendering")
        else:
            score += 1
            reasons.append(f"hardware GPU ({profile.get('gpu_renderer')})")

    if profile.get("is_mobile"):
        score -= 1
        reasons.append("mobile/touch device")

    downlink = profile.get("downlink_mbps") or 0
    if downlink and downlink < 2:
        score -= 1
        reasons.append(f"slow network ({downlink:g} Mbps)")

    if profile.get("prefers_reduced_motion"):
        reasons.append("prefers reduced motion")

    battery = profile.get("battery_level")
    if battery is not None and battery <= 0.2 and not profile.get("battery_charging"):
        score -= 1
        reasons.append("battery below 20%")

    if score >= 4:
        tier = "high"
    elif score >= 1:
        tier = "balanced"
    else:
        tier = "lite"

    return {"tier": tier, "score": score, "reasons": reasons}


def adaptation_for(profile: Dict[str, Any]) -> Dict[str, Any]:
    """Full adaptation config for a device profile."""
    scored = score_device(profile)
    config = dict(TIER_PROFILES[scored["tier"]])
    if profile.get("prefers_reduced_motion"):
        config["animation_level"] = "off"
    config.update({
        "tier": scored["tier"],
        "capability_score": scored["score"],
        "reasons": scored["reasons"],
    })
    return config


# ─── Host runtime snapshot ────────────────────────────────────────────────────

def host_runtime() -> Dict[str, Any]:
    """Snapshot of the machine actually serving inference (shared by all devices)."""
    info: Dict[str, Any] = {
        "hostname": platform.node(),
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "cpu_arch": platform.machine(),
        "cpu_count": os.cpu_count(),
    }

    try:
        import psutil

        info["cpu_percent"] = psutil.cpu_percent(interval=None)
        vm = psutil.virtual_memory()
        info["memory_total_gb"] = round(vm.total / 1024 ** 3, 2)
        info["memory_used_percent"] = vm.percent
        info["process_memory_mb"] = round(psutil.Process().memory_info().rss / 1024 ** 2, 1)
    except Exception:
        info["cpu_percent"] = None

    gpu: Dict[str, Any] = {"available": False, "backend": "cpu"}
    try:
        import torch

        if torch.cuda.is_available():
            gpu = {
                "available": True,
                "backend": "ROCm" if getattr(torch.version, "hip", None) else "CUDA",
                "name": torch.cuda.get_device_name(0),
                "count": torch.cuda.device_count(),
                "memory_allocated_mb": round(torch.cuda.memory_allocated(0) / 1024 ** 2, 1),
            }
    except Exception:
        pass
    info["gpu"] = gpu
    return info


# ─── Store ────────────────────────────────────────────────────────────────────

class DeviceStore:
    """Thread-safe, per-device state: profile, episodes, memory and counters."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._devices: Dict[str, Dict[str, Any]] = {}

    # -- lifecycle -------------------------------------------------------
    def register(self, profile: Dict[str, Any], device_id: Optional[str] = None) -> Dict[str, Any]:
        now = time.time()
        did = device_id or profile.get("device_id") or f"dev_{uuid.uuid4().hex[:12]}"
        with self._lock:
            self._evict_locked()
            existing = self._devices.get(did)
            state = existing or {
                "device_id": did,
                "created_at": now,
                "episodes": deque(maxlen=MAX_EPISODES_PER_DEVICE),
                "sessions": {},
                "observations": [],
                "counters": {
                    "episodes": 0,
                    "errors": 0,
                    "tokens_generated": 0,
                    "latency_ms_total": 0,
                    "by_agent": {},
                },
                "client_metrics": {},
            }
            state["profile"] = {**(existing or {}).get("profile", {}), **profile, "device_id": did}
            state["adaptation"] = adaptation_for(state["profile"])
            state["last_seen"] = now
            self._devices[did] = state
            return self._public_locked(state)

    def touch(self, device_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """Mark a device as active; auto-registers unknown ids with an empty profile."""
        if not device_id:
            return None
        with self._lock:
            state = self._devices.get(device_id)
            if state is None:
                self.register({}, device_id=device_id)
                state = self._devices[device_id]
            state["last_seen"] = time.time()
            return state

    def get(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._devices.get(device_id)

    def adaptation(self, device_id: Optional[str]) -> Dict[str, Any]:
        state = self.touch(device_id) if device_id else None
        if not state:
            return adaptation_for({})
        return state["adaptation"]

    def forget(self, device_id: str) -> bool:
        with self._lock:
            return self._devices.pop(device_id, None) is not None

    def reset_memory(self, device_id: str) -> bool:
        with self._lock:
            state = self._devices.get(device_id)
            if not state:
                return False
            state["episodes"].clear()
            state["sessions"].clear()
            state["observations"].clear()
            state["counters"] = {
                "episodes": 0,
                "errors": 0,
                "tokens_generated": 0,
                "latency_ms_total": 0,
                "by_agent": {},
            }
            return True

    # -- recording -------------------------------------------------------
    def record_episode(
        self,
        device_id: Optional[str],
        agent: str,
        action: str,
        status: str = "ok",
        latency_ms: int = 0,
        tokens_generated: int = 0,
        provider: str = "",
        session_id: Optional[str] = None,
        detail: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        state = self.touch(device_id)
        if not state:
            return None
        with self._lock:
            counters = state["counters"]
            counters["episodes"] += 1
            if status != "ok":
                counters["errors"] += 1
            counters["tokens_generated"] += tokens_generated
            counters["latency_ms_total"] += latency_ms
            counters["by_agent"][agent] = counters["by_agent"].get(agent, 0) + 1

            episode = {
                "episode_id": f"ep_{counters['episodes']:05d}",
                "sequence": counters["episodes"],
                "device_id": state["device_id"],
                "session_id": session_id,
                "agent": agent,
                "action": action,
                "status": status,
                "latency_ms": latency_ms,
                "tokens_generated": tokens_generated,
                "provider": provider,
                "tier": state["adaptation"]["tier"],
                "timestamp": time.time(),
                "detail": detail or {},
            }
            state["episodes"].append(episode)
            return episode

    def record_turn(self, device_id: Optional[str], session_id: str, role: str, content: str) -> None:
        state = self.touch(device_id)
        if not state or not session_id:
            return
        with self._lock:
            session = state["sessions"].setdefault(
                session_id, {"started_at": time.time(), "turns": deque(maxlen=MAX_TURNS_PER_SESSION)}
            )
            session["turns"].append({"role": role, "content": content, "ts": time.time()})

    def add_observation(self, device_id: Optional[str], observation: str) -> None:
        state = self.touch(device_id)
        if not state or not observation:
            return
        with self._lock:
            obs = state["observations"]
            if observation not in obs:
                obs.append(observation)
                del obs[:-20]

    def update_client_metrics(self, device_id: str, metrics: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        state = self.touch(device_id)
        if not state:
            return None
        with self._lock:
            state["client_metrics"] = {**metrics, "reported_at": time.time()}
            return state

    # -- views -----------------------------------------------------------
    def telemetry(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            state = self._devices.get(device_id)
            if not state:
                return None
            counters = state["counters"]
            episodes = counters["episodes"]
            recent = list(state["episodes"])[-10:]
            return {
                "device_id": device_id,
                "profile": state["profile"],
                "adaptation": state["adaptation"],
                "client_metrics": state["client_metrics"],
                "session_count": len(state["sessions"]),
                "uptime_seconds": int(time.time() - state["created_at"]),
                "last_seen_seconds_ago": int(time.time() - state["last_seen"]),
                "counters": {
                    **{k: v for k, v in counters.items() if k != "latency_ms_total"},
                    "avg_latency_ms": int(counters["latency_ms_total"] / episodes) if episodes else 0,
                    "total_latency_ms": counters["latency_ms_total"],
                },
                "recent_episodes": recent,
                "host": host_runtime(),
            }

    def episodes(self, device_id: str, limit: int = 50) -> Optional[List[Dict[str, Any]]]:
        with self._lock:
            state = self._devices.get(device_id)
            if not state:
                return None
            return list(state["episodes"])[-limit:]

    def memory(self, device_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            state = self._devices.get(device_id)
            if not state:
                return None
            sessions = [
                {
                    "session_id": sid,
                    "started_at": s["started_at"],
                    "turn_count": len(s["turns"]),
                    "turns": list(s["turns"]),
                }
                for sid, s in state["sessions"].items()
            ]
            return {
                "device_id": device_id,
                "short_term": sessions,
                "observations": list(state["observations"]),
                "total_turns": sum(s["turn_count"] for s in sessions),
            }

    def list_devices(self) -> List[Dict[str, Any]]:
        with self._lock:
            self._evict_locked()
            return [
                {
                    "device_id": did,
                    "tier": s["adaptation"]["tier"],
                    "label": s["profile"].get("label") or s["profile"].get("os_name") or "unknown device",
                    "episodes": s["counters"]["episodes"],
                    "last_seen_seconds_ago": int(time.time() - s["last_seen"]),
                }
                for did, s in self._devices.items()
            ]

    # -- internals -------------------------------------------------------
    def _public_locked(self, state: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "device_id": state["device_id"],
            "profile": state["profile"],
            "adaptation": state["adaptation"],
            "registered_at": state["created_at"],
            "host": host_runtime(),
        }

    def _evict_locked(self) -> None:
        cutoff = time.time() - DEVICE_TTL_SECONDS
        for did in [d for d, s in self._devices.items() if s["last_seen"] < cutoff]:
            self._devices.pop(did, None)
        if len(self._devices) > MAX_DEVICES:
            oldest = sorted(self._devices.items(), key=lambda kv: kv[1]["last_seen"])
            for did, _ in oldest[: len(self._devices) - MAX_DEVICES]:
                self._devices.pop(did, None)


device_store = DeviceStore()

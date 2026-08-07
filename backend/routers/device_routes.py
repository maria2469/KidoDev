"""
Device Routes — per-visitor telemetry, episodes and memory.

Each browser registers its own hardware profile and receives a `device_id`.
Everything below is scoped to that id, so every judge/parent/student sees only
their own live data and gets agent behaviour tuned to their own machine.
"""
from fastapi import APIRouter, HTTPException

from models.schemas import (
    DeviceRegisterRequest, DeviceRegisterResponse, DeviceHeartbeatRequest,
)
from telemetry.device_registry import device_store, host_runtime

router = APIRouter(prefix="/device", tags=["Device Telemetry"])


@router.post("/register", response_model=DeviceRegisterResponse, summary="Register a device and get its adapted agent config")
async def register_device(req: DeviceRegisterRequest):
    profile = req.profile.model_dump()
    registered = device_store.register(profile, device_id=req.device_id or profile.get("device_id"))
    print(f"[DeviceRoutes] Registered {registered['device_id']} "
          f"tier={registered['adaptation']['tier']} ({profile.get('label') or profile.get('os_name')})")
    return registered


@router.post("/{device_id}/heartbeat", summary="Report live client metrics and pull a fresh telemetry snapshot")
async def heartbeat(device_id: str, req: DeviceHeartbeatRequest):
    if device_store.update_client_metrics(device_id, req.model_dump(exclude_none=True)) is None:
        raise HTTPException(status_code=404, detail="Unknown device_id — register first")
    return device_store.telemetry(device_id)


@router.get("/{device_id}/telemetry", summary="Live telemetry for this device only")
async def get_telemetry(device_id: str):
    data = device_store.telemetry(device_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Unknown device_id — register first")
    return data


@router.get("/{device_id}/episodes", summary="Agent episode log for this device only")
async def get_episodes(device_id: str, limit: int = 50):
    episodes = device_store.episodes(device_id, limit=max(1, min(limit, 100)))
    if episodes is None:
        raise HTTPException(status_code=404, detail="Unknown device_id — register first")
    return {"device_id": device_id, "count": len(episodes), "episodes": episodes}


@router.get("/{device_id}/memory", summary="Agent memory (sessions, turns, observations) for this device only")
async def get_memory(device_id: str):
    memory = device_store.memory(device_id)
    if memory is None:
        raise HTTPException(status_code=404, detail="Unknown device_id — register first")
    return memory


@router.delete("/{device_id}/memory", summary="Reset this device's memory and episode history")
async def reset_memory(device_id: str):
    if not device_store.reset_memory(device_id):
        raise HTTPException(status_code=404, detail="Unknown device_id")
    return {"status": "reset", "device_id": device_id}


@router.delete("/{device_id}", summary="Forget this device entirely")
async def forget_device(device_id: str):
    if not device_store.forget(device_id):
        raise HTTPException(status_code=404, detail="Unknown device_id")
    return {"status": "forgotten", "device_id": device_id}


@router.get("", summary="Active devices connected to this backend")
async def list_devices():
    devices = device_store.list_devices()
    return {"count": len(devices), "devices": devices, "host": host_runtime()}

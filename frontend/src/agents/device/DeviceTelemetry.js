/**
 * Device Telemetry — Frontend
 *
 * Every visitor's browser fingerprints its own hardware, registers it with the
 * backend and receives a `device_id` plus an adaptation profile (tier, token
 * budget, animation level, poll interval). That id is attached to every agent
 * request, so telemetry, episodes and memory are isolated per device: a judge
 * on a phone and a judge on a workstation each see only their own live data,
 * served by agents tuned to the machine they are actually using.
 */

const BACKEND_URL = import.meta.env.VITE_AGENT_BACKEND_URL || 'http://localhost:8000';
const isNgrok = BACKEND_URL.includes('ngrok');
const STORAGE_KEY = 'kd_device_id';

const HEADERS = {
  'Content-Type': 'application/json',
  ...(isNgrok && { 'ngrok-skip-browser-warning': 'true' }),
};

let _deviceId = null;
let _adaptation = null;
let _registration = null;
let _registerPromise = null;
let _heartbeatTimer = null;
const _listeners = new Set();

// ─── Live browser metrics (FPS sampler) ───────────────────────────────────────

let _fps = 0;
let _frames = 0;
let _fpsWindowStart = 0;

function startFpsSampler() {
  if (typeof window === 'undefined' || !window.requestAnimationFrame) return;
  _fpsWindowStart = performance.now();
  const tick = (now) => {
    _frames += 1;
    const elapsed = now - _fpsWindowStart;
    if (elapsed >= 1000) {
      _fps = Math.round((_frames * 1000) / elapsed);
      _frames = 0;
      _fpsWindowStart = now;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

// ─── Hardware / browser fingerprint ───────────────────────────────────────────

function detectGpu() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return {};
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { gpu_vendor: gl.getParameter(gl.VENDOR), gpu_renderer: gl.getParameter(gl.RENDERER) };
    return {
      gpu_vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
      gpu_renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
    };
  } catch {
    return {};
  }
}

function detectOs(ua) {
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown OS';
}

function detectBrowser(ua) {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Unknown browser';
}

async function collectProfile() {
  if (typeof navigator === 'undefined') return {};
  const ua = navigator.userAgent || '';
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
  const os = detectOs(ua);
  const browser = detectBrowser(ua);
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  const profile = {
    label: `${browser} on ${os}`,
    os_name: os,
    browser,
    user_agent: ua,
    cpu_cores: navigator.hardwareConcurrency || null,
    device_memory_gb: navigator.deviceMemory || null,
    screen_width: window.screen?.width || null,
    screen_height: window.screen?.height || null,
    pixel_ratio: window.devicePixelRatio || null,
    is_mobile: isMobile,
    touch_support: (navigator.maxTouchPoints || 0) > 0,
    network_type: conn.effectiveType || null,
    downlink_mbps: conn.downlink || null,
    prefers_reduced_motion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    language: navigator.language || null,
    ...detectGpu(),
  };

  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      profile.battery_level = battery.level;
      profile.battery_charging = battery.charging;
    }
  } catch {
    // battery API unavailable — device still scores on CPU/RAM/GPU
  }

  return profile;
}

// ─── Registration ─────────────────────────────────────────────────────────────

function notify() {
  _listeners.forEach((fn) => {
    try {
      fn({ deviceId: _deviceId, adaptation: _adaptation, registration: _registration });
    } catch {
      // a broken listener must not stop the others
    }
  });
}

/** Register this browser with the backend (idempotent, cached per tab). */
export async function registerDevice() {
  if (_registerPromise) return _registerPromise;

  _registerPromise = (async () => {
    const profile = await collectProfile();
    let stored = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked (private mode) — a fresh id is issued instead
    }

    const res = await fetch(`${BACKEND_URL}/device/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ device_id: stored, profile }),
    });
    if (!res.ok) throw new Error(`Device registration failed: ${res.status}`);

    _registration = await res.json();
    _deviceId = _registration.device_id;
    _adaptation = _registration.adaptation;
    try {
      localStorage.setItem(STORAGE_KEY, _deviceId);
    } catch {
      // ignore — id stays in memory for this tab
    }

    startFpsSampler();
    startHeartbeat();
    notify();
    return _registration;
  })().catch((err) => {
    console.warn('[DeviceTelemetry] registration failed:', err);
    _registerPromise = null;
    return null;
  });

  return _registerPromise;
}

export function getDeviceId() {
  return _deviceId;
}

export function getAdaptation() {
  return _adaptation;
}

/** Subscribe to device id / adaptation changes. Returns an unsubscribe fn. */
export function onDeviceChange(listener) {
  _listeners.add(listener);
  if (_deviceId) listener({ deviceId: _deviceId, adaptation: _adaptation, registration: _registration });
  return () => _listeners.delete(listener);
}

// ─── Heartbeat (live client metrics) ──────────────────────────────────────────

function currentClientMetrics() {
  const conn = navigator.connection || {};
  const mem = performance.memory;
  return {
    fps: _fps || null,
    js_heap_used_mb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    js_heap_limit_mb: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : null,
    downlink_mbps: conn.downlink || null,
    network_type: conn.effectiveType || null,
    active_page: window.location?.pathname || null,
  };
}

async function sendHeartbeat() {
  if (!_deviceId) return null;
  const body = currentClientMetrics();
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      body.battery_level = battery.level;
      body.battery_charging = battery.charging;
    }
  } catch {
    // no battery API on this device
  }

  try {
    const res = await fetch(`${BACKEND_URL}/device/${_deviceId}/heartbeat`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function startHeartbeat() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  const interval = _adaptation?.telemetry_poll_ms || 4000;
  _heartbeatTimer = setInterval(sendHeartbeat, interval);
  sendHeartbeat();
}

export function stopHeartbeat() {
  if (_heartbeatTimer) clearInterval(_heartbeatTimer);
  _heartbeatTimer = null;
}

// ─── Device-scoped reads ──────────────────────────────────────────────────────

async function getJson(path) {
  if (!_deviceId) await registerDevice();
  if (!_deviceId) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/device/${_deviceId}${path}`, { headers: HEADERS });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** Live telemetry for THIS device (counters, adaptation, host runtime). */
export function fetchDeviceTelemetry() {
  return getJson('/telemetry');
}

/** Agent episode log for THIS device. */
export function fetchDeviceEpisodes(limit = 25) {
  return getJson(`/episodes?limit=${limit}`);
}

/** Conversation memory + observations for THIS device. */
export function fetchDeviceMemory() {
  return getJson('/memory');
}

/** Wipe this device's episodes, memory and counters (keeps the device id). */
export async function resetDeviceMemory() {
  if (!_deviceId) return false;
  try {
    const res = await fetch(`${BACKEND_URL}/device/${_deviceId}/memory`, { method: 'DELETE', headers: HEADERS });
    return res.ok;
  } catch {
    return false;
  }
}

/** Client-side snapshot, no network needed — used by the live UI badge. */
export function getLiveClientMetrics() {
  return currentClientMetrics();
}

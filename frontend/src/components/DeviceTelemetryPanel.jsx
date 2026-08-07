import React, { useCallback, useEffect, useState } from 'react';
import {
  registerDevice, getAdaptation, getDeviceId, getLiveClientMetrics,
  fetchDeviceTelemetry, fetchDeviceEpisodes, fetchDeviceMemory, resetDeviceMemory,
} from '../agents/device/DeviceTelemetry';

/**
 * Floating panel showing the telemetry of the visitor's OWN device: hardware
 * profile, the agent tier chosen for it, live browser metrics, the agent
 * episode log and the conversation memory recorded for this device only.
 * Two judges on two machines see two completely different panels.
 */

const TIER_COLORS = { high: '#22C55E', balanced: '#F59E0B', lite: '#38BDF8' };
const TABS = ['Overview', 'Episodes', 'Memory'];

const card = {
  background: '#0F172A',
  border: '1px solid #1E293B',
  borderRadius: 14,
  color: '#F8FAFC',
  fontFamily: 'sans-serif',
};

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, padding: '3px 0' }}>
      <span style={{ color: '#94A3B8' }}>{label}</span>
      <span style={{ fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value ?? '—'}</span>
    </div>
  );
}

export default function DeviceTelemetryPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [deviceId, setDeviceId] = useState(getDeviceId());
  const [telemetry, setTelemetry] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [memory, setMemory] = useState(null);
  const [live, setLive] = useState({});

  useEffect(() => {
    registerDevice().then((reg) => reg && setDeviceId(reg.device_id));
  }, []);

  const refresh = useCallback(async () => {
    const [t, e, m] = await Promise.all([
      fetchDeviceTelemetry(),
      fetchDeviceEpisodes(25),
      fetchDeviceMemory(),
    ]);
    setTelemetry(t);
    setEpisodes(e?.episodes || []);
    setMemory(m);
    setLive(getLiveClientMetrics());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const pollMs = getAdaptation()?.telemetry_poll_ms || 4000;
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, pollMs);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [open, refresh]);

  const adaptation = telemetry?.adaptation || getAdaptation();
  const profile = telemetry?.profile || {};
  const host = telemetry?.host || {};
  const counters = telemetry?.counters || {};
  const tier = adaptation?.tier || 'unknown';
  const tierColor = TIER_COLORS[tier] || '#64748B';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Show live telemetry for this device"
        style={{
          ...card,
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 9000,
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: tierColor, boxShadow: `0 0 8px ${tierColor}` }} />
        My Device: {tier.toUpperCase()}
      </button>
    );
  }

  return (
    <div
      style={{
        ...card,
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9000,
        width: 340,
        maxHeight: '70vh',
        overflowY: 'auto',
        padding: 14,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>My Device Telemetry</div>
          <div style={{ fontSize: 10, color: '#64748B' }}>{deviceId || 'registering...'}</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 16, cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'inline-block',
          padding: '3px 10px',
          borderRadius: 10,
          background: `${tierColor}22`,
          color: tierColor,
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {adaptation?.tier_label || tier} · score {adaptation?.capability_score ?? '—'}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '5px 0',
              borderRadius: 8,
              border: '1px solid #1E293B',
              background: tab === t ? '#1E293B' : 'transparent',
              color: tab === t ? '#F8FAFC' : '#94A3B8',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div>
          <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '6px 0' }}>YOUR HARDWARE</div>
          <Row label="Device" value={profile.label} />
          <Row label="CPU threads" value={profile.cpu_cores} />
          <Row label="RAM" value={profile.device_memory_gb ? `${profile.device_memory_gb} GB` : null} />
          <Row label="GPU" value={profile.gpu_renderer} />
          <Row label="Screen" value={profile.screen_width ? `${profile.screen_width}×${profile.screen_height} @${profile.pixel_ratio}x` : null} />
          <Row label="Network" value={profile.network_type ? `${profile.network_type} · ${profile.downlink_mbps ?? '?'} Mbps` : null} />

          <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '10px 0 6px' }}>LIVE (THIS BROWSER)</div>
          <Row label="FPS" value={live.fps} />
          <Row label="JS heap" value={live.js_heap_used_mb ? `${live.js_heap_used_mb} / ${live.js_heap_limit_mb} MB` : null} />
          <Row label="Battery" value={telemetry?.client_metrics?.battery_level != null ? `${Math.round(telemetry.client_metrics.battery_level * 100)}%${telemetry.client_metrics.battery_charging ? ' (charging)' : ''}` : null} />
          <Row label="Page" value={live.active_page} />

          <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '10px 0 6px' }}>AGENT ADAPTATION</div>
          <Row label="Max tokens" value={adaptation?.max_tokens} />
          <Row label="Hint detail" value={adaptation?.hint_detail} />
          <Row label="History turns" value={adaptation?.history_turns} />
          <Row label="Animations" value={adaptation?.animation_level} />
          <Row label="Poll interval" value={adaptation?.telemetry_poll_ms ? `${adaptation.telemetry_poll_ms} ms` : null} />
          {adaptation?.reasons?.length > 0 && (
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>Because: {adaptation.reasons.join(', ')}</div>
          )}

          <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '10px 0 6px' }}>MY AGENT ACTIVITY</div>
          <Row label="Episodes" value={counters.episodes} />
          <Row label="Errors" value={counters.errors} />
          <Row label="Tokens generated" value={counters.tokens_generated} />
          <Row label="Avg latency" value={counters.avg_latency_ms != null ? `${counters.avg_latency_ms} ms` : null} />
          <Row label="Sessions" value={telemetry?.session_count} />

          <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '10px 0 6px' }}>SHARED INFERENCE HOST</div>
          <Row label="Host" value={host.hostname} />
          <Row label="OS / arch" value={host.os ? `${host.os} · ${host.cpu_arch}` : null} />
          <Row label="Host CPU" value={host.cpu_percent != null ? `${host.cpu_percent}% of ${host.cpu_count} cores` : null} />
          <Row label="Host memory" value={host.memory_total_gb ? `${host.memory_used_percent}% of ${host.memory_total_gb} GB` : null} />
          <Row label="GPU" value={host.gpu?.available ? `${host.gpu.name} (${host.gpu.backend})` : 'CPU only'} />
        </div>
      )}

      {tab === 'Episodes' && (
        <div>
          {episodes.length === 0 && <div style={{ fontSize: 11, color: '#64748B' }}>No agent runs yet on this device.</div>}
          {[...episodes].reverse().map((ep) => (
            <div key={ep.episode_id} style={{ borderBottom: '1px solid #1E293B', padding: '6px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                <span>{ep.agent}</span>
                <span style={{ color: ep.status === 'ok' ? '#4ADE80' : '#F87171' }}>{ep.status}</span>
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8' }}>{ep.action}</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>
                {ep.episode_id} · {ep.latency_ms} ms · {ep.tokens_generated} tok · tier {ep.tier}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Memory' && (
        <div>
          <Row label="Total turns" value={memory?.total_turns} />
          {(memory?.observations || []).length > 0 && (
            <>
              <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800, margin: '8px 0 4px' }}>OBSERVATIONS</div>
              {memory.observations.map((o) => (
                <div key={o} style={{ fontSize: 10, color: '#CBD5E1', padding: '2px 0' }}>• {o}</div>
              ))}
            </>
          )}
          {(memory?.short_term || []).map((s) => (
            <div key={s.session_id} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#38BDF8', fontWeight: 800 }}>SESSION {s.session_id} ({s.turn_count})</div>
              {s.turns.map((t, i) => (
                <div key={`${s.session_id}-${i}`} style={{ fontSize: 10, color: t.role === 'user' ? '#F8FAFC' : '#94A3B8', padding: '2px 0' }}>
                  <b>{t.role}:</b> {t.content}
                </div>
              ))}
            </div>
          ))}
          {!memory?.total_turns && <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>No conversation memory yet on this device.</div>}
          <button
            onClick={async () => { await resetDeviceMemory(); refresh(); }}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '6px 0',
              borderRadius: 8,
              border: '1px solid #7F1D1D',
              background: 'transparent',
              color: '#FCA5A5',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reset my device memory
          </button>
        </div>
      )}
    </div>
  );
}

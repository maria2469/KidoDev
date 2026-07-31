import React, { useState, useEffect, useRef } from 'react';
import { runBenchmark, fetchBenchmarkHistory, fetchBackendHealth } from '../../../agents/AgentOrchestrator';

const AMD_RED = '#E31937';
const AMD_DARK = '#1a0a0a';

export default function AmdBenchmark() {
    const [health, setHealth] = useState(null);
    const [logs, setLogs] = useState([]);
    const [benchResult, setBenchResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [useLocal, setUseLocal] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');
    const [liveMetrics, setLiveMetrics] = useState({ tps: 0, latency: 0, tokens: 0 });
    const intervalRef = useRef(null);

    useEffect(() => {
        loadHealth();
        loadHistory();
        intervalRef.current = setInterval(loadHistory, 15_000);
        return () => clearInterval(intervalRef.current);
    }, []);

    async function loadHealth() {
        const h = await fetchBackendHealth();
        setHealth(h);
    }

    async function loadHistory() {
        const data = await fetchBenchmarkHistory();
        if (data?.logs) setLogs(data.logs.slice(0, 20));
    }

    async function handleRunBenchmark() {
        if (isRunning) return;
        setIsRunning(true);
        setBenchResult(null);
        const prompt = customPrompt || 'Explain what a loop is to a 7-year-old in 2 sentences.';
        const result = await runBenchmark(prompt, useLocal);
        setBenchResult(result);
        if (result) {
            setLiveMetrics({ tps: result.tokens_per_second, latency: result.latency_ms, tokens: result.tokens_generated });
        }
        setIsRunning(false);
        loadHistory();
    }

    const avgTps = logs.length ? (logs.reduce((s, l) => s + (l.tokens_generated / Math.max(l.latency_ms / 1000, 0.001)), 0) / logs.length).toFixed(1) : '—';
    const avgLatency = logs.length ? Math.round(logs.reduce((s, l) => s + l.latency_ms, 0) / logs.length) : '—';
    const totalInferences = logs.length;

    return (
        <div style={{ fontFamily: "'Inter', 'Fredoka', sans-serif", padding: '0 4px' }}>
            {/* Hero Header */}
            <div style={{
                background: `linear-gradient(135deg, #0d0d0d 0%, #1a0808 50%, #0d0d0d 100%)`,
                borderRadius: 20,
                padding: '28px 32px',
                marginBottom: 24,
                border: `1px solid ${AMD_RED}33`,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background AMD pattern */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.04,
                    backgroundImage: 'repeating-linear-gradient(45deg, #E31937 0, #E31937 1px, transparent 0, transparent 50%)',
                    backgroundSize: '20px 20px',
                }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                        {/* AMD Logo SVG */}
                        <div style={{
                            background: AMD_RED, borderRadius: 12, padding: '10px 14px',
                            boxShadow: `0 8px 24px ${AMD_RED}55`,
                        }}>
                            <svg width="40" height="20" viewBox="0 0 100 50">
                                <text x="0" y="40" fontWeight="900" fontSize="48" fill="white" fontFamily="Arial">AMD</text>
                            </svg>
                        </div>
                        <div>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 900 }}>
                                AMD GPU Inference Engine
                            </h2>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                                Kido Dev Agentic AI — Powered by AMD Instinct MI300X
                            </p>
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                            <div style={{
                                background: health?.fireworks_ai?.status === 'available'
                                    ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                border: `1px solid ${health?.fireworks_ai?.status === 'available' ? '#22c55e44' : '#ef444444'}`,
                                borderRadius: 20,
                                padding: '6px 14px',
                                color: health?.fireworks_ai?.status === 'available' ? '#4ade80' : '#f87171',
                                fontSize: 11, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}>
                                <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: health?.fireworks_ai?.status === 'available' ? '#22c55e' : '#ef4444',
                                    animation: health?.fireworks_ai?.status === 'available' ? 'livePulse 2s infinite' : 'none',
                                }} />
                                {health?.fireworks_ai?.status === 'available' ? 'AMD MI300X Online' : 'Checking...'}
                            </div>
                        </div>
                    </div>
                    {/* Stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {[
                            { label: 'Avg Tokens/sec', value: avgTps, unit: 'tok/s', color: AMD_RED },
                            { label: 'Avg Latency', value: avgLatency, unit: 'ms', color: '#f59e0b' },
                            { label: 'Total Inferences', value: totalInferences, unit: 'calls', color: '#8b5cf6' },
                            { label: 'Active GPU', value: 'MI300X', unit: 'AMD Instinct', color: '#06b6d4' },
                        ].map((stat, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: `1px solid ${stat.color}33`,
                                borderRadius: 14,
                                padding: '14px 16px',
                            }}>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {stat.label}
                                </div>
                                <div style={{ color: stat.color, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 3 }}>
                                    {stat.unit}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left: Benchmark Runner */}
                <div style={{
                    background: '#fff',
                    borderRadius: 18,
                    padding: 24,
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}>
                    <h3 style={{ margin: '0 0 16px', fontWeight: 900, fontSize: 16, color: '#1E293B' }}>
                        Live Inference Benchmark
                    </h3>
                    {/* Backend selector */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        {[
                            { val: false, label: 'Fireworks AI (AMD MI300X)', icon: '☁️' },
                            { val: true, label: 'Local Ollama (AMD ROCm)', icon: '🖥️' },
                        ].map(opt => (
                            <button
                                key={String(opt.val)}
                                onClick={() => setUseLocal(opt.val)}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    borderRadius: 12,
                                    border: `2px solid ${useLocal === opt.val ? AMD_RED : '#e2e8f0'}`,
                                    background: useLocal === opt.val ? '#fff5f5' : '#f8fafc',
                                    color: useLocal === opt.val ? AMD_RED : '#64748b',
                                    fontWeight: 700, fontSize: 11,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        placeholder="Custom prompt (optional)..."
                        rows={3}
                        style={{
                            width: '100%', borderRadius: 12, padding: '10px 14px',
                            border: '2px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
                            resize: 'none', boxSizing: 'border-box',
                            transition: 'border-color 0.2s', outline: 'none',
                        }}
                        onFocus={e => e.target.style.borderColor = AMD_RED}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button
                        onClick={handleRunBenchmark}
                        disabled={isRunning}
                        style={{
                            width: '100%',
                            marginTop: 12,
                            padding: '12px 0',
                            background: isRunning
                                ? '#94a3b8'
                                : `linear-gradient(135deg, ${AMD_RED}, #c41230)`,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 14,
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            boxShadow: isRunning ? 'none' : `0 6px 20px ${AMD_RED}44`,
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {isRunning ? (
                            <>
                                <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span> Running on AMD GPU...
                            </>
                        ) : 'Run AMD Benchmark'}
                    </button>

                    {/* Result card */}
                    {benchResult && (
                        <div style={{
                            marginTop: 16,
                            background: 'linear-gradient(135deg, #0d0d0d, #1a0808)',
                            borderRadius: 14,
                            padding: 16,
                            border: `1px solid ${AMD_RED}44`,
                            animation: 'fadeIn 0.3s ease',
                        }}>
                            <div style={{ color: AMD_RED, fontWeight: 800, fontSize: 11, marginBottom: 12, letterSpacing: '0.5px' }}>
                                BENCHMARK RESULT
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                {[
                                    { k: 'Tokens/sec', v: `${benchResult.tokens_per_second}` },
                                    { k: 'Latency', v: `${benchResult.latency_ms}ms` },
                                    { k: 'Tokens', v: benchResult.tokens_generated },
                                    { k: 'Provider', v: benchResult.provider?.split(' ')[0] || '—' },
                                ].map((m, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 10, padding: '8px 12px',
                                    }}>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}>{m.k}</div>
                                        <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{m.v}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.6,
                                background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px',
                                fontStyle: 'italic',
                            }}>
                                "{benchResult.response_text?.slice(0, 120)}..."
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Architecture + Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Architecture diagram */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                        borderRadius: 18, padding: 20,
                        border: '1px solid rgba(139,92,246,0.3)',
                    }}>
                        <h3 style={{ margin: '0 0 14px', color: '#fff', fontWeight: 800, fontSize: 14 }}>
                            Multi-Agent Architecture
                        </h3>
                        {[
                            { name: 'AgentOrchestrator', color: '#8b5cf6', tools: 'Routes requests to specialists' },
                            { name: 'TutorAgent', color: '#06b6d4', tools: 'ReAct loop · Memory · Tool use' },
                            { name: 'GraderAgent', color: '#22c55e', tools: '4-dim scoring · NL feedback' },
                            { name: 'CurriculumAgent', color: '#f59e0b', tools: 'Learning path · Gap analysis' },
                            { name: 'EngagementAgent', color: '#ef4444', tools: 'Idle detection · Interventions' },
                        ].map((agent, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                marginBottom: 8,
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: 10, padding: '8px 12px',
                                border: `1px solid ${agent.color}33`,
                            }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: agent.color, flexShrink: 0,
                                    boxShadow: `0 0 6px ${agent.color}`,
                                }} />
                                <div>
                                    <div style={{ color: agent.color, fontSize: 11, fontWeight: 800 }}>{agent.name}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{agent.tools}</div>
                                </div>
                            </div>
                        ))}
                        <div style={{
                            marginTop: 12, padding: '8px 12px',
                            background: `${AMD_RED}22`, borderRadius: 10,
                            border: `1px solid ${AMD_RED}44`,
                        }}>
                            <div style={{ color: AMD_RED, fontSize: 10, fontWeight: 800, marginBottom: 2 }}>
                                AMD GPU LAYER
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                                Fireworks AI (AMD MI300X) · Local Ollama (AMD ROCm)
                            </div>
                        </div>
                    </div>

                    {/* Recent inference log */}
                    <div style={{
                        background: '#fff', borderRadius: 18, padding: 20,
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        flex: 1,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#1E293B' }}>
                                Live Agent Log
                            </h3>
                            <span style={{
                                background: '#f1f5f9', borderRadius: 20, padding: '3px 10px',
                                fontSize: 11, fontWeight: 700, color: '#64748b',
                            }}>
                                Auto-refresh 15s
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                            {logs.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                                    No agent actions yet. Run the benchmark or use the AI tutor in Magic Studio.
                                </p>
                            ) : logs.map((log, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px',
                                    background: i % 2 === 0 ? '#f8fafc' : '#fff',
                                    borderRadius: 10, border: '1px solid #f1f5f9',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12, color: '#1E293B' }}>
                                            {log.agent_name}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>
                                            {log.action?.slice(0, 40)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 12, color: AMD_RED }}>
                                            {log.tokens_generated}tok
                                        </div>
                                        <div style={{ fontSize: 10, color: '#94a3b8' }}>
                                            {log.latency_ms}ms
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}
                @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
            `}</style>
        </div>
    );
}

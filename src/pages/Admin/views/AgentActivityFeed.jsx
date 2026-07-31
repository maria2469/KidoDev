import React, { useState, useEffect } from 'react';
import { fetchBenchmarkHistory } from '../../../agents/AgentOrchestrator';
import { supabase } from '../../../utils/supabaseClient';

export default function AgentActivityFeed() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const agentColors = {
        TutorAgent: { bg: 'rgba(6,182,212,0.12)', border: '#06b6d444', text: '#06b6d4', dot: '#06b6d4' },
        GraderAgent: { bg: 'rgba(34,197,94,0.1)', border: '#22c55e44', text: '#22c55e', dot: '#22c55e' },
        CurriculumPlannerAgent: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b44', text: '#f59e0b', dot: '#f59e0b' },
        EngagementAgent: { bg: 'rgba(239,68,68,0.1)', border: '#ef444444', text: '#ef4444', dot: '#ef4444' },
        BenchmarkRunner: { bg: 'rgba(227,25,55,0.1)', border: '#E3193744', text: '#E31937', dot: '#E31937' },
    };

    useEffect(() => {
        loadLogs();
        // Real-time subscription for live feed
        const channel = supabase
            .channel('agent_logs_feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_logs' }, payload => {
                setLogs(prev => [payload.new, ...prev].slice(0, 50));
            })
            .subscribe();

        const interval = setInterval(loadLogs, 20_000);
        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, []);

    async function loadLogs() {
        setLoading(true);
        const data = await fetchBenchmarkHistory();
        if (data?.logs) setLogs(data.logs);
        setLoading(false);
    }

    const agents = ['all', 'TutorAgent', 'GraderAgent', 'CurriculumPlannerAgent', 'EngagementAgent', 'BenchmarkRunner'];
    const filtered = filter === 'all' ? logs : logs.filter(l => l.agent_name === filter);

    function timeAgo(ts) {
        if (!ts) return '—';
        const diff = Date.now() - new Date(ts).getTime();
        if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
        if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
        return `${Math.round(diff / 3600_000)}h ago`;
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: 24,
            }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#1E293B' }}>
                        Agent Activity Feed
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                        Live stream of all AI agent actions across all students
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                        animation: 'livePulse 2s infinite',
                    }} />
                    <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 700 }}>Live</span>
                </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { name: 'Tutor', count: logs.filter(l => l.agent_name === 'TutorAgent').length, color: '#06b6d4' },
                    { name: 'Grader', count: logs.filter(l => l.agent_name === 'GraderAgent').length, color: '#22c55e' },
                    { name: 'Curriculum', count: logs.filter(l => l.agent_name === 'CurriculumPlannerAgent').length, color: '#f59e0b' },
                    { name: 'Engagement', count: logs.filter(l => l.agent_name === 'EngagementAgent').length, color: '#ef4444' },
                    { name: 'Benchmark', count: logs.filter(l => l.agent_name === 'BenchmarkRunner').length, color: '#E31937' },
                ].map(s => (
                    <div key={s.name} style={{
                        background: '#fff', borderRadius: 14, padding: '12px 16px',
                        border: '1px solid #f1f5f9', textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{s.name}</div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {agents.map(a => {
                    const c = agentColors[a] || {};
                    return (
                        <button
                            key={a}
                            onClick={() => setFilter(a)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 20,
                                border: `2px solid ${filter === a ? (c.dot || '#8b5cf6') : '#e2e8f0'}`,
                                background: filter === a ? (c.bg || 'rgba(139,92,246,0.1)') : '#fff',
                                color: filter === a ? (c.text || '#8b5cf6') : '#64748b',
                                fontWeight: 700, fontSize: 11,
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            {a === 'all' ? 'All Agents' : a.replace('Agent', '').replace('Runner', '')}
                        </button>
                    );
                })}
            </div>

            {/* Feed */}
            {loading && logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    Loading activity feed...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 40,
                    background: '#f8fafc', borderRadius: 16,
                    color: '#94a3b8',
                }}>
                    No activity yet. Run the benchmark or use the AI Tutor in Magic Studio to see live actions here.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map((log, i) => {
                        const c = agentColors[log.agent_name] || { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', dot: '#94a3b8' };
                        const tps = log.latency_ms > 0
                            ? (log.tokens_generated / (log.latency_ms / 1000)).toFixed(1)
                            : 0;
                        return (
                            <div key={i} style={{
                                display: 'flex', gap: 14, alignItems: 'flex-start',
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                borderRadius: 14, padding: '12px 16px',
                                transition: 'all 0.2s',
                                animation: i === 0 ? 'slideIn 0.3s ease' : 'none',
                            }}>
                                {/* Agent dot */}
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: c.dot, flexShrink: 0, marginTop: 4,
                                    boxShadow: `0 0 8px ${c.dot}66`,
                                }} />
                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: c.text, fontWeight: 800, fontSize: 12 }}>
                                            {log.agent_name}
                                        </span>
                                        <span style={{ color: '#94a3b8', fontSize: 10 }}>
                                            {timeAgo(log.created_at)}
                                        </span>
                                    </div>
                                    <p style={{ margin: '3px 0 6px', fontSize: 12, color: '#334155', fontWeight: 500 }}>
                                        {log.action}
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {log.tool_used && (
                                            <span style={{
                                                background: 'rgba(139,92,246,0.1)',
                                                border: '1px solid rgba(139,92,246,0.2)',
                                                borderRadius: 6, padding: '2px 8px',
                                                fontSize: 10, fontWeight: 600, color: '#8b5cf6',
                                            }}>
                                                Tools: {log.tool_used}
                                            </span>
                                        )}
                                        {log.tokens_generated > 0 && (
                                            <span style={{
                                                background: 'rgba(227,25,55,0.08)',
                                                border: '1px solid rgba(227,25,55,0.2)',
                                                borderRadius: 6, padding: '2px 8px',
                                                fontSize: 10, fontWeight: 600, color: '#E31937',
                                            }}>
                                                {log.tokens_generated} tokens · {log.latency_ms}ms · {tps} tok/s
                                            </span>
                                        )}
                                        <span style={{
                                            background: 'rgba(0,0,0,0.04)',
                                            borderRadius: 6, padding: '2px 8px',
                                            fontSize: 10, fontWeight: 600, color: '#94a3b8',
                                        }}>
                                            {log.gpu_type || 'AMD MI300X'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <style>{`
                @keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.3}}
                @keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
            `}</style>
        </div>
    );
}

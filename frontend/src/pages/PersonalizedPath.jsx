import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { requestCurriculum } from '../agents/AgentOrchestrator';
import { initSession } from '../agents/memory/AgentMemoryStore';

export default function PersonalizedPath() {
    const [loading, setLoading] = useState(true);
    const [curriculumData, setCurriculumData] = useState(null);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadPath();
    }, []);

    async function loadPath() {
        setLoading(true);
        try {
            const kidChildId = localStorage.getItem('kido_child_id');
            const { data: { user } } = await supabase.auth.getUser();
            const userId = kidChildId || user?.id;

            if (!userId) {
                setError('Please log in to view your learning path.');
                setLoading(false);
                return;
            }

            // Initialize agent session
            initSession(userId);

            // Load student profile + completed lessons
            const [profileRes, completedRes] = await Promise.all([
                supabase.from('child_profiles').select('total_xp, level, badges').eq('id', userId).maybeSingle(),
                supabase.from('lesson_completions').select('lesson_id, score, badge').eq(kidChildId ? 'child_id' : 'user_id', userId),
            ]);

            const p = profileRes.data || { total_xp: 0, level: 'Bronze', badges: [] };
            setProfile(p);

            const completed = completedRes.data || [];

            // Request personalized curriculum from the agent
            const curriculum = await requestCurriculum({
                completedLessons: completed,
                weakBlockTypes: [],
                strongBlockTypes: [],
                level: p.level,
                totalXp: p.total_xp,
            });

            setCurriculumData(curriculum);
        } catch (err) {
            console.error('[PersonalizedPath]', err);
            setError('Could not load your learning path. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    const levelColors = {
        Bronze: { bg: 'linear-gradient(135deg, #cd7f32, #a0522d)', text: '#fff' },
        Silver: { bg: 'linear-gradient(135deg, #c0c0c0, #808080)', text: '#fff' },
        Gold: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', text: '#1a1a1a' },
        Platinum: { bg: 'linear-gradient(135deg, #E5E4E2, #9E9E9E)', text: '#1a1a1a' },
        Diamond: { bg: 'linear-gradient(135deg, #b9f2ff, #00BFFF)', text: '#1a1a1a' },
    };
    const levelStyle = levelColors[profile?.level] || levelColors.Bronze;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            padding: '32px 24px',
            fontFamily: "'Inter', 'Fredoka', sans-serif",
        }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 12, padding: '8px 18px', color: '#fff',
                        fontWeight: 700, fontSize: 13, cursor: 'pointer',
                        marginBottom: 24, transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}
                >
                    ← Back
                </button>

                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 32, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                        My Learning Journey
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 16 }}>
                        Powered by KidoBot CurriculumAgent — AMD MI300X
                    </p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 80 }}>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: '50%',
                                border: '3px solid rgba(139,92,246,0.3)',
                                borderTopColor: '#8b5cf6',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto',
                            }} />
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.5)' }}>
                            CurriculumAgent is analyzing your learning history...
                        </p>
                        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    </div>
                ) : error ? (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 16, padding: 24, color: '#f87171', textAlign: 'center',
                    }}>
                        {error}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Profile + Summary card */}
                        {profile && (
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20,
                            }}>
                                {/* Level card */}
                                <div style={{
                                    background: levelStyle.bg,
                                    borderRadius: 20, padding: '24px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 48 }}>
                                        {profile.level === 'Diamond' ? '💎' : profile.level === 'Gold' ? '🥇' : profile.level === 'Platinum' ? '🔱' : profile.level === 'Silver' ? '🥈' : '🥉'}
                                    </div>
                                    <div style={{ color: levelStyle.text, fontWeight: 900, fontSize: 22, marginTop: 8 }}>
                                        {profile.level}
                                    </div>
                                    <div style={{ color: `${levelStyle.text}aa`, fontSize: 13 }}>
                                        {profile.total_xp} XP Total
                                    </div>
                                </div>

                                {/* Summary card */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 20, padding: '24px',
                                }}>
                                    <div style={{ color: 'rgba(167,139,250,0.8)', fontWeight: 800, fontSize: 11, marginBottom: 10, letterSpacing: '0.5px' }}>
                                        AI CURRICULUM SUMMARY
                                    </div>
                                    <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
                                        {curriculumData?.learning_path_summary || 'Keep up the great work! Complete more lessons to unlock a personalized path.'}
                                    </p>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <div style={{
                                            background: 'rgba(34,197,94,0.15)',
                                            border: '1px solid rgba(34,197,94,0.25)',
                                            borderRadius: 10, padding: '8px 14px',
                                            flex: 1,
                                        }}>
                                            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 11, marginBottom: 2 }}>WEEKLY GOAL</div>
                                            <div style={{ color: '#fff', fontSize: 12 }}>{curriculumData?.weekly_goal || 'Complete 2 new lessons'}</div>
                                        </div>
                                        <div style={{
                                            background: 'rgba(245,158,11,0.15)',
                                            border: '1px solid rgba(245,158,11,0.25)',
                                            borderRadius: 10, padding: '8px 14px',
                                            flex: 1,
                                        }}>
                                            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 11, marginBottom: 2 }}>NEXT CHALLENGE</div>
                                            <div style={{ color: '#fff', fontSize: 12 }}>{curriculumData?.next_challenge || 'Try loop blocks'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Skills analysis */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Strengths */}
                            <div style={{
                                background: 'rgba(34,197,94,0.08)',
                                border: '1px solid rgba(34,197,94,0.2)',
                                borderRadius: 18, padding: 20,
                            }}>
                                <h3 style={{ color: '#4ade80', margin: '0 0 14px', fontWeight: 800, fontSize: 14 }}>
                                    Your Strengths
                                </h3>
                                {(curriculumData?.strengths?.length > 0) ? (
                                    curriculumData.strengths.map((s, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            marginBottom: 8,
                                        }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: '#22c55e', flexShrink: 0,
                                            }} />
                                            <span style={{ color: '#fff', fontSize: 13 }}>{s}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                                        Complete more lessons to discover your strengths.
                                    </p>
                                )}
                            </div>

                            {/* Skill Gaps */}
                            <div style={{
                                background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 18, padding: 20,
                            }}>
                                <h3 style={{ color: '#f87171', margin: '0 0 14px', fontWeight: 800, fontSize: 14 }}>
                                    Areas to Improve
                                </h3>
                                {(curriculumData?.skill_gaps?.length > 0) ? (
                                    curriculumData.skill_gaps.map((g, i) => (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            marginBottom: 8,
                                        }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: '#ef4444', flexShrink: 0,
                                            }} />
                                            <span style={{ color: '#fff', fontSize: 13 }}>{g}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>
                                        No specific gaps identified yet. Keep learning!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Recommended Lessons */}
                        {curriculumData?.recommended_lessons?.length > 0 && (
                            <div>
                                <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: '0 0 16px' }}>
                                    Recommended for You
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {curriculumData.recommended_lessons.map((lesson, i) => {
                                        const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
                                        const pc = priorityColors[lesson.priority] || '#8b5cf6';
                                        return (
                                            <div key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: 16,
                                                background: 'rgba(255,255,255,0.05)',
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 16, padding: '16px 20px',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                }}
                                                onClick={() => navigate(`/studio/${lesson.lesson_id}`)}
                                            >
                                                {/* Number */}
                                                <div style={{
                                                    width: 44, height: 44, borderRadius: 14,
                                                    background: `${pc}22`,
                                                    border: `2px solid ${pc}44`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: pc, fontWeight: 900, fontSize: 18, flexShrink: 0,
                                                }}>
                                                    {i + 1}
                                                </div>
                                                {/* Content */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>
                                                        {lesson.title || lesson.lesson_id}
                                                    </div>
                                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                                                        {lesson.reason}
                                                    </div>
                                                </div>
                                                {/* Priority badge */}
                                                <div style={{
                                                    background: `${pc}22`,
                                                    border: `1px solid ${pc}44`,
                                                    borderRadius: 20, padding: '4px 12px',
                                                    color: pc, fontSize: 10, fontWeight: 800,
                                                    textTransform: 'uppercase', letterSpacing: '0.5px',
                                                    flexShrink: 0,
                                                }}>
                                                    {lesson.priority}
                                                </div>
                                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }}>→</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Refresh button */}
                        <button
                            onClick={loadPath}
                            style={{
                                alignSelf: 'center',
                                background: 'rgba(139,92,246,0.2)',
                                border: '1px solid rgba(139,92,246,0.4)',
                                borderRadius: 14, padding: '12px 28px',
                                color: '#c4b5fd', fontWeight: 800, fontSize: 13,
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.35)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                        >
                            Regenerate My Path
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

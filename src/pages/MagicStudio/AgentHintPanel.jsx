// AgentHintPanel.jsx — Multi-turn AI Agent Panel for Magic Studio
// Replaces the simple one-shot SittingCatHelpButton with a full conversational interface
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { requestHint } from '../../agents/AgentOrchestrator';

// ─── Cat SVG (reused from SittingCatHelpButton) ─────────────────────────────
function CatSvg({ size = 36, isThinking = false }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"
            style={{ width: size, height: size, overflow: 'visible' }}>
            <style>{`
                .scp-head { transform-box:fill-box; transform-origin:center 40%;
                    animation: ${isThinking ? 'scpThink 0.8s ease-in-out infinite' : 'scpTilt 6s ease-in-out infinite'}; }
                .scp-eyes { transform-box:fill-box; transform-origin:center;
                    animation: scpBlink 3.5s ease-in-out infinite; }
                @keyframes scpTilt { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-2deg)} 75%{transform:rotate(2deg)} }
                @keyframes scpThink { 0%,100%{transform:rotate(-8deg) translateY(-2px)} 50%{transform:rotate(8deg) translateY(2px)} }
                @keyframes scpBlink { 0%,88%,92%,100%{transform:scaleY(1)} 90%{transform:scaleY(0.1)} }
            `}</style>
            <defs>
                <radialGradient id="cpHG" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#FFE090" /><stop offset="100%" stopColor="#FFA830" />
                </radialGradient>
            </defs>
            <ellipse cx="50" cy="76" rx="26" ry="12" fill="#E87818" />
            <g className="scp-head">
                <polygon points="26,38 18,14 40,30" fill="#CC6810" />
                <polygon points="28,37 21,18 37,30" fill="#FFC050" />
                <polygon points="74,38 82,14 60,30" fill="#CC6810" />
                <polygon points="72,37 79,18 63,30" fill="#FFA830" />
                <circle cx="50" cy="44" r="24" fill="url(#cpHG)" />
                <ellipse cx="50" cy="53" rx="13" ry="9" fill="#FFF5E0" />
                <g className="scp-eyes">
                    <circle cx="40" cy="42" r="5" fill="white" />
                    <circle cx="40" cy="42" r="3" fill="#0D0500" />
                    <circle cx="38" cy="40" r="1.5" fill="white" />
                    <circle cx="60" cy="42" r="5" fill="white" />
                    <circle cx="60" cy="42" r="3" fill="#0D0500" />
                    <circle cx="58" cy="40" r="1.5" fill="white" />
                </g>
                <ellipse cx="34" cy="48" rx="6" ry="3.5" fill="#FFB8C8" opacity="0.6" />
                <ellipse cx="66" cy="48" rx="6" ry="3.5" fill="#FFB8C8" opacity="0.6" />
                <path d="M 47,51 L 53,51 L 50,54 Z" fill="#FF9999" />
            </g>
        </svg>
    );
}

// ─── Typing dots animation ────────────────────────────────────────────────────
function ThinkingDots() {
    return (
        <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', padding: '6px 12px' }}>
            {[0, 0.2, 0.4].map((delay, i) => (
                <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#ff9800',
                    animation: `dotBounce 1.2s ease-in-out ${delay}s infinite`,
                }} />
            ))}
            <style>{`@keyframes dotBounce{0%,80%,100%{transform:scale(0.5);opacity:0.5}40%{transform:scale(1);opacity:1}}`}</style>
        </span>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function AgentHintPanel({
    isMobile,
    workspaceBlocks = [],
    objective = '',
    lessonId = '',
    onBlockHighlight,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [lastTrace, setLastTrace] = useState([]);
    const [showTrace, setShowTrace] = useState(false);
    const [gpuInfo, setGpuInfo] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const sendHintRequest = useCallback(async (userMessage = null) => {
        if (isThinking) return;
        setIsThinking(true);

        // Add user message to chat if it's a follow-up
        if (userMessage) {
            setMessages(prev => [...prev, { role: 'user', content: userMessage, ts: Date.now() }]);
            setInputValue('');
        }

        try {
            const result = await requestHint({
                workspaceBlocks,
                objective,
                lessonId,
                userMessage,
            });

            const agentMsg = {
                role: 'assistant',
                content: result.hintMessage,
                nextBlock: result.nextBlockType,
                memoryNote: result.agentMemoryNote,
                tokensGenerated: result.tokensGenerated,
                latencyMs: result.latencyMs,
                gpuType: result.gpuType,
                ts: Date.now(),
            };

            setMessages(prev => [...prev, agentMsg]);
            setLastTrace(result.reasoningTrace || []);
            setGpuInfo({ tokens: result.tokensGenerated, latency: result.latencyMs, gpu: result.gpuType });

            // Highlight next block if callback provided
            if (result.nextBlockType && onBlockHighlight) {
                onBlockHighlight(result.nextBlockType);
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I had trouble thinking just now. Try again in a moment!',
                ts: Date.now(),
            }]);
        } finally {
            setIsThinking(false);
        }
    }, [workspaceBlocks, objective, lessonId, isThinking, onBlockHighlight]);

    const handleOpenAndHint = () => {
        setIsOpen(true);
        if (messages.length === 0) {
            sendHintRequest(null);
        }
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isThinking) return;
        sendHintRequest(inputValue.trim());
    };

    const size = isMobile ? 38 : 44;

    return (
        <>
            {/* ── Trigger Button ── */}
            <button
                onClick={handleOpenAndHint}
                data-kido-help-btn
                title="AI Agent Tutor"
                id="agent-hint-btn"
                style={{
                    background: isOpen
                        ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                        : 'linear-gradient(135deg, #ff9800, #ffa726)',
                    border: '2px solid #fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: '3px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    width: size,
                    height: size,
                    transition: 'all 0.2s ease',
                    boxShadow: isOpen
                        ? '0 4px 14px rgba(124,58,237,0.4)'
                        : '0 4px 10px rgba(255,152,0,0.3)',
                }}
            >
                <CatSvg size={size - 8} isThinking={isThinking && isOpen} />
                {isThinking && isOpen && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#22c55e', border: '2px solid #fff',
                        animation: 'pulse 1s ease-in-out infinite',
                    }} />
                )}
                <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7}}`}</style>
            </button>

            {/* ── Panel Overlay ── */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: isMobile ? 60 : 80,
                    right: isMobile ? 8 : 16,
                    width: isMobile ? 'calc(100vw - 16px)' : 360,
                    maxHeight: '65vh',
                    background: 'linear-gradient(160deg, #1e1b4b 0%, #0f172a 100%)',
                    border: '1px solid rgba(124,58,237,0.4)',
                    borderRadius: 20,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 9999,
                    overflow: 'hidden',
                    animation: 'panelIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
                }}>
                    <style>{`
                        @keyframes panelIn{from{opacity:0;transform:translateY(12px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
                        .agent-msg-bubble{animation:msgIn 0.2s ease forwards}
                        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
                        .agent-input:focus{outline:none;border-color:rgba(124,58,237,0.7)!important;}
                        .agent-send-btn:hover{background:rgba(124,58,237,0.9)!important;}
                        .agent-trace-btn:hover{background:rgba(255,255,255,0.08)!important;}
                    `}</style>

                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(139,92,246,0.2))',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CatSvg size={28} isThinking={isThinking} />
                            <div>
                                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px' }}>
                                    KidoBot Agent
                                </div>
                                <div style={{ color: 'rgba(167,139,250,0.9)', fontSize: 10, fontWeight: 600 }}>
                                    {isThinking ? 'Reasoning on AMD MI300X...' : 'Ready to help'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {lastTrace.length > 0 && (
                                <button
                                    className="agent-trace-btn"
                                    onClick={() => setShowTrace(v => !v)}
                                    title="View agent reasoning trace"
                                    style={{
                                        background: showTrace ? 'rgba(124,58,237,0.3)' : 'transparent',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: 8,
                                        padding: '4px 8px',
                                        color: 'rgba(167,139,250,0.9)',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    Trace
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)', border: 'none',
                                    borderRadius: 8, width: 28, height: 28,
                                    color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 700,
                                }}
                            >✕</button>
                        </div>
                    </div>

                    {/* GPU Badge */}
                    {gpuInfo && (
                        <div style={{
                            padding: '4px 16px',
                            background: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', gap: 6,
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                            }} />
                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, letterSpacing: '0.3px' }}>
                                {gpuInfo.gpu} · {gpuInfo.tokens} tokens · {gpuInfo.latency}ms
                            </span>
                        </div>
                    )}

                    {/* Trace panel */}
                    {showTrace && lastTrace.length > 0 && (
                        <div style={{
                            padding: '8px 16px',
                            background: 'rgba(0,0,0,0.4)',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            maxHeight: 100,
                            overflowY: 'auto',
                        }}>
                            <div style={{ color: 'rgba(167,139,250,0.8)', fontSize: 9, fontWeight: 800, marginBottom: 4 }}>
                                REASONING TRACE
                            </div>
                            {lastTrace.map((step, i) => (
                                <div key={i} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, lineHeight: 1.6 }}>
                                    {step}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {messages.length === 0 && isThinking && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <CatSvg size={24} isThinking />
                                <div style={{
                                    background: 'rgba(255,255,255,0.07)', borderRadius: '12px 12px 12px 4px',
                                    padding: '8px 12px',
                                }}>
                                    <ThinkingDots />
                                </div>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={idx} className="agent-msg-bubble" style={{
                                display: 'flex',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                gap: 8,
                                alignItems: 'flex-start',
                            }}>
                                {msg.role === 'assistant' && <CatSvg size={24} />}
                                <div style={{
                                    maxWidth: '82%',
                                    background: msg.role === 'user'
                                        ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                                        : 'rgba(255,255,255,0.08)',
                                    borderRadius: msg.role === 'user'
                                        ? '12px 12px 4px 12px'
                                        : '12px 12px 12px 4px',
                                    padding: '10px 13px',
                                    border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                                }}>
                                    {/* Memory note badge */}
                                    {msg.memoryNote && (
                                        <div style={{
                                            background: 'rgba(124,58,237,0.3)',
                                            borderRadius: 6,
                                            padding: '3px 8px',
                                            marginBottom: 6,
                                            fontSize: 9,
                                            fontWeight: 700,
                                            color: 'rgba(167,139,250,0.9)',
                                            letterSpacing: '0.3px',
                                        }}>
                                            MEMORY: {msg.memoryNote}
                                        </div>
                                    )}
                                    <p style={{
                                        margin: 0,
                                        color: '#fff',
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                        fontWeight: 500,
                                    }}>
                                        {msg.content}
                                    </p>
                                    {/* Next block chip */}
                                    {msg.nextBlock && (
                                        <div style={{
                                            display: 'inline-block',
                                            marginTop: 8,
                                            background: 'rgba(34,197,94,0.15)',
                                            border: '1px solid rgba(34,197,94,0.3)',
                                            borderRadius: 8,
                                            padding: '4px 10px',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: '#4ade80',
                                            fontFamily: 'monospace',
                                        }}>
                                            Next: {msg.nextBlock}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isThinking && messages.length > 0 && (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <CatSvg size={24} isThinking />
                                <div style={{
                                    background: 'rgba(255,255,255,0.07)',
                                    borderRadius: '12px 12px 12px 4px',
                                    padding: '8px 12px',
                                }}>
                                    <ThinkingDots />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick prompts */}
                    {messages.length > 0 && !isThinking && (
                        <div style={{
                            padding: '6px 14px',
                            display: 'flex', gap: 6, overflowX: 'auto',
                            flexShrink: 0,
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            {['Why?', 'Show another way', 'What block next?'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => sendHintRequest(q)}
                                    style={{
                                        background: 'rgba(124,58,237,0.2)',
                                        border: '1px solid rgba(124,58,237,0.3)',
                                        borderRadius: 20,
                                        padding: '4px 10px',
                                        color: 'rgba(167,139,250,0.9)',
                                        fontSize: 10, fontWeight: 700,
                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.4)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,58,237,0.2)'}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={handleSendMessage} style={{
                        display: 'flex', gap: 8, padding: '10px 14px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(0,0,0,0.3)',
                        flexShrink: 0,
                    }}>
                        <input
                            ref={inputRef}
                            className="agent-input"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Ask a follow-up question..."
                            disabled={isThinking}
                            style={{
                                flex: 1,
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 12,
                                padding: '8px 12px',
                                color: '#fff',
                                fontSize: 12,
                                fontFamily: 'inherit',
                                transition: 'border-color 0.2s',
                            }}
                        />
                        <button
                            type="submit"
                            className="agent-send-btn"
                            disabled={!inputValue.trim() || isThinking}
                            style={{
                                background: 'rgba(124,58,237,0.7)',
                                border: 'none', borderRadius: 12,
                                width: 36, height: 36,
                                color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16,
                                opacity: (!inputValue.trim() || isThinking) ? 0.4 : 1,
                                transition: 'all 0.2s',
                            }}
                        >
                            ↑
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

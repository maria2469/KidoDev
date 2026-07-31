/**
 * Agent Orchestrator — Frontend
 * Central coordinator that routes requests to the appropriate backend agent.
 * Falls back to direct Fireworks AI calls if the backend is unavailable.
 */

import { generateLiveHint, generateLiveSolution } from '../utils/aiClient';
import {
  getSessionId, getChildId, getSessionState, addToConversation,
  getConversationHistory, incrementHintCount,
} from './memory/AgentMemoryStore';

const BACKEND_URL = import.meta.env.VITE_AGENT_BACKEND_URL || 'http://localhost:8000';

let _backendAvailable = null; // null = unchecked, true/false = known

// ─── Backend Health Check ──────────────────────────────────────────────────────
async function checkBackend() {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

// Reset cache every 60s in case backend comes back online
setInterval(() => { _backendAvailable = null; }, 60_000);

// ─── Generic Agent Request ─────────────────────────────────────────────────────
async function agentRequest(path, body) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Agent API error: ${res.status}`);
  }
  return res.json();
}

// ─── TutorAgent ───────────────────────────────────────────────────────────────
/**
 * Request a hint from the TutorAgent (multi-turn, memory-aware).
 * Falls back to direct Fireworks call if backend is down.
 *
 * @param {object} params
 * @param {string[]} params.workspaceBlocks  - Block types currently in workspace
 * @param {string}  params.objective         - Lesson objective
 * @param {string}  params.lessonId          - Lesson ID
 * @param {string}  [params.userMessage]     - Follow-up from child, or null
 * @returns {Promise<{hintMessage, nextBlockType, reasoningTrace, toolsUsed, tokensGenerated, latencyMs, gpuType, agentMemoryNote}>}
 */
export async function requestHint({ workspaceBlocks, objective, lessonId, userMessage }) {
  const childId = getChildId();
  const sessionId = getSessionId();

  if (!childId || !sessionId) {
    // Fallback: direct Fireworks call
    return _fallbackHint(workspaceBlocks, objective);
  }

  const backendOk = await checkBackend();

  if (!backendOk) {
    console.warn('[AgentOrchestrator] Backend offline — using fallback');
    return _fallbackHint(workspaceBlocks, objective);
  }

  incrementHintCount();
  const history = getConversationHistory();

  try {
    const result = await agentRequest('/agent/tutor', {
      child_id: childId,
      session_id: sessionId,
      lesson_id: lessonId,
      objective,
      workspace_blocks: workspaceBlocks,
      conversation_history: history,
      user_message: userMessage || null,
    });

    // Store in conversation history
    if (userMessage) addToConversation('user', userMessage);
    addToConversation('assistant', result.hint_message);

    return {
      hintMessage: result.hint_message,
      nextBlockType: result.next_block_type,
      reasoningTrace: result.reasoning_trace || [],
      toolsUsed: result.tools_used || [],
      tokensGenerated: result.tokens_generated || 0,
      latencyMs: result.latency_ms || 0,
      gpuType: result.gpu_type || 'AMD MI300X via Fireworks AI',
      agentMemoryNote: result.agent_memory_note || null,
    };
  } catch (err) {
    console.error('[AgentOrchestrator] TutorAgent error:', err);
    return _fallbackHint(workspaceBlocks, objective);
  }
}

async function _fallbackHint(workspaceBlocks, objective) {
  try {
    const result = await generateLiveHint(workspaceBlocks, objective);
    return {
      hintMessage: result?.message || 'Try adding the next block from the toolbox.',
      nextBlockType: result?.blockType || null,
      reasoningTrace: ['Fallback: Direct Fireworks AI call (backend offline)'],
      toolsUsed: ['fireworks_direct'],
      tokensGenerated: 0,
      latencyMs: 0,
      gpuType: 'AMD MI300X via Fireworks AI',
      agentMemoryNote: null,
    };
  } catch {
    return {
      hintMessage: 'Try adding the next block from the toolbox. You can do it!',
      nextBlockType: null,
      reasoningTrace: ['Fallback: Static response'],
      toolsUsed: [],
      tokensGenerated: 0,
      latencyMs: 0,
      gpuType: 'AMD MI300X via Fireworks AI',
      agentMemoryNote: null,
    };
  }
}

// ─── GraderAgent ──────────────────────────────────────────────────────────────
/**
 * Request multi-dimensional grading from GraderAgent.
 * Falls back to standard grading if backend is down.
 */
export async function requestGrade({ lessonId, workspaceXml, helpedBlockTypes, timeSeconds }) {
  const childId = getChildId();
  const backendOk = await checkBackend();

  if (!childId || !backendOk) {
    return null; // caller uses existing getGrade() fallback
  }

  try {
    const result = await agentRequest('/agent/grade', {
      child_id: childId,
      lesson_id: lessonId,
      workspace_xml: workspaceXml,
      helped_block_types: helpedBlockTypes || [],
      time_seconds: timeSeconds || 0,
    });

    return {
      score: result.score,
      badge: result.badge,
      feedback: result.feedback,
      correctnessScore: result.correctness_score,
      efficiencyScore: result.efficiency_score,
      independenceScore: result.independence_score,
      creativityScore: result.creativity_score,
      reasoning: result.reasoning,
      tokensGenerated: result.tokens_generated,
      latencyMs: result.latency_ms,
    };
  } catch (err) {
    console.error('[AgentOrchestrator] GraderAgent error:', err);
    return null;
  }
}

// ─── CurriculumPlannerAgent ────────────────────────────────────────────────────
export async function requestCurriculum({ completedLessons, weakBlockTypes, strongBlockTypes, level, totalXp }) {
  const childId = getChildId();
  const backendOk = await checkBackend();

  if (!childId || !backendOk) return null;

  try {
    return await agentRequest('/agent/curriculum', {
      child_id: childId,
      completed_lessons: completedLessons || [],
      weak_block_types: weakBlockTypes || [],
      strong_block_types: strongBlockTypes || [],
      current_level: level || 'Bronze',
      total_xp: totalXp || 0,
    });
  } catch (err) {
    console.error('[AgentOrchestrator] CurriculumAgent error:', err);
    return null;
  }
}

// ─── EngagementAgent ──────────────────────────────────────────────────────────
export async function checkEngagement({ lessonId }) {
  const childId = getChildId();
  const sessionId = getSessionId();
  const backendOk = await checkBackend();

  if (!childId || !sessionId || !backendOk) return null;

  const state = getSessionState();

  try {
    const result = await agentRequest('/agent/engage', {
      child_id: childId,
      session_id: sessionId,
      lesson_id: lessonId,
      idle_seconds: state.idleSeconds,
      hint_count: state.hintCount,
      block_placements_last_minute: state.blockPlacementsLastMinute,
      session_duration_seconds: state.sessionDurationSeconds,
    });
    return result;
  } catch {
    return null;
  }
}

// ─── AMD Benchmark ────────────────────────────────────────────────────────────
export async function runBenchmark(prompt = '', useLocal = false) {
  try {
    const res = await fetch(`${BACKEND_URL}/benchmark/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, use_local: useLocal }),
      signal: AbortSignal.timeout(60_000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function fetchBenchmarkHistory() {
  try {
    const res = await fetch(`${BACKEND_URL}/benchmark/history?limit=30`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? await res.json() : { logs: [] };
  } catch {
    return { logs: [] };
  }
}

export async function fetchBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/benchmark/health`, { signal: AbortSignal.timeout(4000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

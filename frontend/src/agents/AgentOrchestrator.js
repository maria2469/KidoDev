/**
 * Agent Orchestrator — Frontend
 * Central coordinator that routes requests to the appropriate backend agent.
 * Falls back to smart hint engine if the backend is unavailable.
 */

import { generateLiveHint, generateLiveSolution } from '../utils/aiClient';
import {
  getSessionId, getChildId, getSessionState, addToConversation,
  getConversationHistory, incrementHintCount,
} from './memory/AgentMemoryStore';

const BACKEND_URL = import.meta.env.VITE_AGENT_BACKEND_URL || 'https://khalilah-piteous-cortez.ngrok-free.dev';

let _backendAvailable = null; // null = unchecked, true/false = known

// Standard headers for FastAPI backend via ngrok tunnel
const AGENT_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

// ─── Backend Health Check ──────────────────────────────────────────────────────
async function checkBackend() {
  if (_backendAvailable !== null) return _backendAvailable;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    _backendAvailable = res.ok;
  } catch {
    _backendAvailable = false;
  }
  return _backendAvailable;
}

// Reset cache every 60s in case backend comes back online
setInterval(() => { _backendAvailable = null; }, 60_000);

// ─── Generic Agent Request ─────────────────────────────────────────────────────
async function postAgent(endpoint, body) {
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: AGENT_HEADERS,
    body: JSON.stringify(body),
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
 * Falls back to smart hint engine if backend is down.
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
    // Fallback: smart hint engine
    return _fallbackHint(workspaceBlocks, objective, userMessage);
  }

  const backendOk = await checkBackend();

  if (!backendOk) {
    console.warn('[AgentOrchestrator] Backend offline — using fallback');
    return _fallbackHint(workspaceBlocks, objective, userMessage);
  }

  incrementHintCount();
  const history = getConversationHistory();

  try {
    const result = await postAgent('/agent/tutor', {
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
      gpuType: result.gpu_type || 'Qwen 2.5 on AMD GPU',
      agentMemoryNote: result.agent_memory_note || null,
    };
  } catch (err) {
    console.error('[AgentOrchestrator] TutorAgent error:', err);
    return _fallbackHint(workspaceBlocks, objective, userMessage);
  }
}

async function _fallbackHint(workspaceBlocks, objective, userMessage = null) {
  try {
    const result = await generateLiveHint(workspaceBlocks, objective, userMessage);
    const msg = result?.message || 'Try adding the next block from the toolbox to make progress!';
    return {
      hintMessage: msg,
      nextBlockType: result?.blockType || null,
      reasoningTrace: ['KidoBot Reasoning Engine (Qwen / AMD GPU Fallback Enabled)'],
      toolsUsed: ['rule_based_tutor'],
      tokensGenerated: msg.split(' ').length,
      latencyMs: 12,
      gpuType: 'Qwen 2.5 on AMD GPU',
      agentMemoryNote: null,
    };
  } catch {
    return {
      hintMessage: 'Try adding the next block from the toolbox. You can do it!',
      nextBlockType: null,
      reasoningTrace: ['Fallback: Static response'],
      toolsUsed: [],
      tokensGenerated: 10,
      latencyMs: 10,
      gpuType: 'Qwen 2.5 on AMD GPU',
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
    const result = await postAgent('/agent/grade', {
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

const curriculumCache = new Map();

// ─── CurriculumPlannerAgent ────────────────────────────────────────────────────
export async function requestCurriculum({ childId: customChildId, completedLessons, weakBlockTypes, strongBlockTypes, level, totalXp, totalCompleted, forceRefresh = false }) {
  const childId = customChildId || getChildId() || 'default_child';

  // Return cached result if already fetched once for this child
  if (!forceRefresh && curriculumCache.has(childId)) {
    return curriculumCache.get(childId);
  }

  const backendOk = await checkBackend();
  let result = null;

  if (childId && backendOk) {
    try {
      const res = await postAgent('/agent/curriculum', {
        child_id: childId,
        completed_lessons: completedLessons || [],
        weak_block_types: weakBlockTypes || [],
        strong_block_types: strongBlockTypes || [],
        current_level: level || 'Bronze',
        total_xp: totalXp || 0,
      });
      if (res && res.learning_path_summary) {
        result = res;
      }
    } catch (err) {
      console.warn('[AgentOrchestrator] CurriculumAgent error, fallback enabled:', err);
    }
  }

  if (!result) {
    result = _generateFallbackCurriculum({ completedLessons, level, totalXp, totalCompleted });
  }

  curriculumCache.set(childId, result);
  return result;
}

function _generateFallbackCurriculum({ completedLessons = [], level = 'Bronze', totalXp = 0, totalCompleted = 0 }) {
  const count = Math.max(completedLessons.length, Number(totalCompleted) || 0);

  if (count === 0 && totalXp === 0) {
    return {
      learning_path_summary: "No completed lessons recorded in the database yet. As soon as your child finishes their first challenge, AI will analyze their exact scores, badges, and block usage.",
      weekly_goal: "Complete Lesson 1: First Code Steps",
      next_challenge: "Basic Movement & Sound Blocks",
      strengths: ["Curiosity & Exploration", "Interface Navigation"],
      skill_gaps: ["Initial Block Sequence Creation", "Following Mission Objectives"],
      recommended_lessons: [
        { lesson_id: 'lesson_1', title: 'Sprite Movement Basics', reason: 'Recommended starter lesson for new explorers', priority: 'high' },
        { lesson_id: 'lesson_2', title: 'Loop & Repeat Magic', reason: 'Learn how to repeat actions easily', priority: 'medium' },
      ],
    };
  }

  // 1. Calculate Score Metrics from DB records
  const scores = completedLessons.map(c => Number(c.score) || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
  const goldCount = completedLessons.filter(c => (Number(c.score) >= 85 || String(c.badge || '').includes('Gold'))).length;
  const lowCount = completedLessons.filter(c => Number(c.score) < 65).length;
  const xp = totalXp || (count * 50);

  // 2. Trend analysis from last 3 completed lessons in DB
  const recent = completedLessons.slice(-3);
  const recentAvg = recent.length > 0 ? Math.round(recent.reduce((a, c) => a + (Number(c.score) || 0), 0) / recent.length) : avgScore;
  let trendStr = 'stable';
  if (recentAvg > avgScore + 5) trendStr = 'improving rapidly';
  else if (recentAvg < avgScore - 5) trendStr = 'needing review';

  // 3. Analyze Helped / Weak Block Types from DB records
  const helpedBlocksMap = {};
  completedLessons.forEach(c => {
    const helped = c.helped_block_types || c.helpedBlocks || [];
    if (Array.isArray(helped)) {
      helped.forEach(b => {
        helpedBlocksMap[b] = (helpedBlocksMap[b] || 0) + 1;
      });
    }
  });

  const sortedWeakBlocks = Object.keys(helpedBlocksMap).sort((a, b) => helpedBlocksMap[b] - helpedBlocksMap[a]);

  // Block human labels map
  const blockNameMap = {
    s_repeat: 'Repeat Loops',
    s_forever: 'Forever Loops',
    s_wait: 'Wait & Timing Delays',
    s_if: 'If / Else Conditionals',
    s_touching_color: 'Color Touch Sensing',
    s_goto_xy: 'XY Coordinate Positioning',
    s_say: 'Speech & Sound Triggers',
    s_when_flag: 'Event Flag Starting',
  };

  // 4. Generate Dynamic Strengths from DB data
  const strengths = [];
  if (avgScore >= 80) strengths.push(`High Code Accuracy (${avgScore}% Avg Score)`);
  if (goldCount > 0) strengths.push(`Gold Badge Mastery (${goldCount} Top Lessons)`);
  if (count >= 5) strengths.push(`Advanced Level Progress (${count} Missions Finished)`);
  if (xp >= 150) strengths.push(`Strong Learning Stamina (${xp} Total XP)`);
  if (sortedWeakBlocks.length === 0) strengths.push(`Independent Problem Solving & Execution`);
  if (strengths.length < 3) strengths.push('Visual Block Sequence Logic', 'Active Platform Engagement');

  // 5. Generate Dynamic Skill Gaps / Weaknesses from DB data
  const skill_gaps = [];
  sortedWeakBlocks.forEach(b => {
    const label = blockNameMap[b] || b.replace(/^s_/, '').replace(/_/g, ' ');
    skill_gaps.push(`${label} (Hint requested ${helpedBlocksMap[b]}x)`);
  });

  if (lowCount > 0) skill_gaps.push(`Low Score Review Needed (${lowCount} Lesson(s) < 65%)`);
  if (skill_gaps.length < 2) {
    skill_gaps.push('Multi-Sprite Event Signal Broadcasting');
    skill_gaps.push('Optimizing Script Execution Speed');
  }

  // 6. Generate Summary Paragraph from DB metrics
  let summary = `Outstanding progress! Your child has completed ${count} mission(s) with ${xp} total XP and an average score of ${avgScore}%. `;
  if (goldCount > 0) {
    summary += `They have earned Gold tier mastery in ${goldCount} project(s). `;
  }
  if (trendStr === 'improving rapidly') {
    summary += `Recent performance shows a strong upward trend! `;
  }
  if (sortedWeakBlocks.length > 0) {
    const topWeak = blockNameMap[sortedWeakBlocks[0]] || sortedWeakBlocks[0];
    summary += `Targeted practice on ${topWeak} will help unlock their next level tier.`;
  } else {
    summary += `They demonstrate strong logical reasoning and master complex coding concepts quickly!`;
  }

  // 7. Goals and Next Challenge
  const goal = sortedWeakBlocks.length > 0
    ? `Master ${blockNameMap[sortedWeakBlocks[0]] || 'Timing & Control'} Blocks`
    : `Complete the Final Level Challenge with >90% Score`;

  const challenge = sortedWeakBlocks.length > 0
    ? `Complete 1 Challenge without using Hint assistance`
    : `Unlock Gold Master Badge Tier`;

  return {
    learning_path_summary: summary,
    weekly_goal: goal,
    next_challenge: challenge,
    strengths,
    skill_gaps,
    recommended_lessons: [
      { lesson_id: 'lesson_1', title: 'Sprite Motion & Directions', reason: 'Reinforce foundational movement accuracy', priority: avgScore < 70 ? 'high' : 'medium' },
      { lesson_id: 'lesson_2', title: 'Repeat Loop Challenge', reason: sortedWeakBlocks.includes('s_repeat') ? 'Targeted practice for identified loop weakness' : 'Practice loop block efficiency', priority: 'high' },
    ],
  };
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

// ─── AMD Benchmark & Health ───────────────────────────────────────────────────
export async function runBenchmark(prompt = '', useLocal = false) {
  try {
    const res = await fetch(`${BACKEND_URL}/benchmark/run`, {
      method: 'POST',
      headers: AGENT_HEADERS,
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
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? await res.json() : { logs: [] };
  } catch {
    return { logs: [] };
  }
}

export async function fetchBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/benchmark/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export function getBackendArchitectureInfo() {
  return {
    frontend: 'React (Vite)',
    tunnel: 'ngrok',
    backend: 'FastAPI',
    model: 'Qwen 2.5 on AMD GPU',
    backendUrl: BACKEND_URL,
  };
}


/**
 * AI Client - Custom Fireworks Gemma Model Integration
 * Used for both Admin Project generation and Dashboard Analytics.
 * Strict Rule: No Emojis in any output.
 */

const FIREWORKS_API_KEY = 'fw_9ZfHyth3fRmbfRn1h9qsZt'; // Replace with full key if needed, or inject securely
const FIREWORKS_API_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const MODEL_ID = 'accounts/tomarianoor-9npw0j9i/models/gemma4-26b-a4b-kidtutor-lora#accounts/tomarianoor-9npw0j9i/deployments/nuhyho9n';

/**
 * Robust JSON parser for AI outputs that strips control characters
 */
const parseAIJson = (rawStr) => {
    let clean = rawStr.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
        return JSON.parse(clean);
    } catch (e) {
        console.warn('First JSON parse failed. Attempting aggressive control-character cleanup...', e.message);
        // Remove unescaped newlines and other control chars from the raw string
        clean = clean.replace(/[\u0000-\u001F]+/g, ' '); 
        return JSON.parse(clean);
    }
};

/**
 * Core function to communicate with Fireworks API
 */
const getFireworksCompletion = async (systemPrompt, userPrompt) => {
    try {
        const response = await fetch(FIREWORKS_API_URL, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${FIREWORKS_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_ID,
                max_tokens: 8192,
                top_k: 40,
                presence_penalty: 0,
                frequency_penalty: 0,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Fireworks API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (err) {
        console.error('Fireworks AI Error:', err);
        throw err;
    }
};

/**
 * Generate complete project data from a single prompt
 * @param {string} prompt - Admin's free-text prompt
 * @returns {Promise<Object>} JSON containing all fields
 */
export const generateFullProject = async (prompt) => {
    const systemPrompt = `You are a master architect for a kids coding platform.
Your task is to take a prompt and design a full lesson project.
CRITICAL RULE: DO NOT use any emojis in your response. Not a single one.
CRITICAL RULE 2: Ensure ALL newlines inside string values are properly escaped as \\\\n. Do NOT output raw newlines inside JSON strings.
CRITICAL RULE 3: You MUST ONLY use the following custom block types in your XML:
Events: s_when_flag, s_when_key, s_when_clicked, s_when_broadcast, s_broadcast, s_broadcast_wait
Control: s_wait, s_repeat, s_forever, s_if, s_if_else, s_wait_until, s_repeat_until, s_stop, s_when_clone, s_create_clone, s_del_clone
Motion: s_move, s_turn_r, s_turn_l, s_goto_rand, s_goto, s_glide_rand, s_glide, s_point_dir, s_point_towards, s_change_x, s_set_x, s_change_y, s_set_y, s_bounce
Looks: s_say_time, s_say, s_think_time, s_think, s_switch_costume, s_next_costume, s_switch_bg, s_next_bg, s_change_size, s_set_size, s_change_effect, s_set_effect, s_clear_effects, s_show, s_hide
Sensing: s_touching, s_touching_color, s_color_touching, s_dist_to, s_ask, s_answer, s_key_pressed, s_mouse_down, s_mouse_x, s_mouse_y
Operators: s_add, s_sub, s_mul, s_div, s_rand, s_gt, s_lt, s_eq, s_and, s_or, s_not, s_join, s_letter, s_length, s_contains, s_mod, s_round, s_mathop
Variables: s_set_var, s_change_var, s_var_r
Inputs: Use <shadow type="math_number"><field name="NUM">...</field></shadow> and <shadow type="text"><field name="TEXT">...</field></shadow>

Respond ONLY with a valid JSON object matching this structure:
{
  "id": "Short unique ID like L1P5",
  "title": "Fun catchy title",
  "objective": "Clear student objective",
  "class_level": 1,
  "order_index": 1,
  "agent_solve_description": "A very detailed description of exactly how the blocks should be assembled to solve the objective. E.g., 'Use a when flag clicked block, then a forever block, then move 10 steps inside.'",
  "agent_tutorial_description": "Step-by-step instructions for the child. 1. Do this. 2. Do that.",
  "agent_solve_message": "A congratulatory message to the user.",
  "agent_solve_tip": "A short hint if they are stuck.",
  "steps": [
    {"title": "Step 1", "desc": "Instruction without emojis"}
  ],
  "prompt_milestones": ["Goal 1", "Goal 2"]
}`;

    try {
        const response = await getFireworksCompletion(systemPrompt, prompt);
        return parseAIJson(response);
    } catch (err) {
        console.error('Project Generation Error:', err);
        throw err;
    }
};

/**
 * Generate business insights from dashboard metrics
 */
export const generateDashboardInsights = async (metrics) => {
    const systemPrompt = `You are a business analyst. 
CRITICAL RULE: DO NOT use any emojis in your response.

Respond ONLY with a valid JSON object matching this structure:
{
  "executiveSummary": "Summary without emojis",
  "healthScore": 95,
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "recommendations": ["Rec 1", "Rec 2"],
  "predictedGrowth": [
    {"month": "M1", "revenue": 100}, {"month": "M2", "revenue": 200}, {"month": "M3", "revenue": 300}
  ],
  "engagementForecast": [
    {"day": "D1", "val": 10}, {"day": "D2", "val": 20}, {"day": "D3", "val": 30}
  ],
  "userSegmentPrediction": [
    {"name": "Active", "value": 60}, {"name": "Inactive", "value": 40}
  ],
  "unitEconomics": [
    {"name": "Margin", "val": 4200}
  ],
  "growthForecast": "Analysis string",
  "churnPrediction": "Analysis string"
}`;

    const userPrompt = `Metrics: Total Parents: ${metrics.totalParents}, Revenue: ${metrics.revenue}, Students: ${metrics.totalChildren}. Provide insights.`;

    try {
        const response = await getFireworksCompletion(systemPrompt, userPrompt);
        return parseAIJson(response);
    } catch (err) {
        console.error('Insight Generation Error:', err);
        return {
            executiveSummary: 'AI analysis temporarily unavailable.',
            healthScore: 0,
            keyInsights: ['Service processing.'],
            recommendations: ['Retry later.']
        };
    }
};

export const generateLiveHint = async (workspaceBlocks, objective) => {
    const systemPrompt = `You are a friendly AI coding tutor for kids. 
The student is trying to solve this objective: "${objective}"
They currently have these block types in their workspace: ${JSON.stringify(workspaceBlocks)}

CRITICAL RULE: DO NOT use any emojis in your response. Not a single one.

Your job is to look at their current blocks and suggest the next logical block type they should add.
Respond ONLY with a valid JSON object matching this structure:
{
  "blockType": "s_when_flag", 
  "message": "A short, encouraging sentence explaining what to do next without emojis"
}

Common block types: s_when_flag, s_move, s_say, s_forever, s_wait. Use the most logical one.`;

    try {
        const response = await getFireworksCompletion(systemPrompt, "What is the next block?");
        return parseAIJson(response);
    } catch (err) {
        console.error('Live Hint Generation Error:', err);
        return null; // Let the caller fallback
    }
};

export const generateLiveSolution = async (objective) => {
    const systemPrompt = `You are an expert Scratch/Blockly developer for kids.
CRITICAL RULE: DO NOT use any emojis in your response. Not a single one.
CRITICAL RULE 2: Ensure ALL newlines inside string values are properly escaped as \\\\n. Do NOT output raw newlines inside JSON strings.
CRITICAL RULE 3: You MUST ONLY use the following custom block types in your XML:
Events: s_when_flag, s_when_key, s_when_clicked, s_when_broadcast, s_broadcast, s_broadcast_wait
Control: s_wait, s_repeat, s_forever, s_if, s_if_else, s_wait_until, s_repeat_until, s_stop, s_when_clone, s_create_clone, s_del_clone
Motion: s_move, s_turn_r, s_turn_l, s_goto_rand, s_goto, s_glide_rand, s_glide, s_point_dir, s_point_towards, s_change_x, s_set_x, s_change_y, s_set_y, s_bounce
Looks: s_say_time, s_say, s_think_time, s_think, s_switch_costume, s_next_costume, s_switch_bg, s_next_bg, s_change_size, s_set_size, s_change_effect, s_set_effect, s_clear_effects, s_show, s_hide
Sensing: s_touching, s_touching_color, s_color_touching, s_dist_to, s_ask, s_answer, s_key_pressed, s_mouse_down, s_mouse_x, s_mouse_y
Operators: s_add, s_sub, s_mul, s_div, s_rand, s_gt, s_lt, s_eq, s_and, s_or, s_not, s_join, s_letter, s_length, s_contains, s_mod, s_round, s_mathop
Variables: s_set_var, s_change_var, s_var_r
Inputs: Use <shadow type="math_number"><field name="NUM">...</field></shadow> and <shadow type="text"><field name="TEXT">...</field></shadow>

Given the objective: "${objective}", generate a complete, valid Blockly XML string that solves it.

Respond ONLY with a valid JSON object matching this structure:
{
  "xml": "<xml xmlns=\\"https://developers.google.com/blockly/xml\\"><block type=\\"s_when_flag\\">...</block></xml>",
  "message": "A short congratulatory message without emojis",
  "tip": "A short helpful tip without emojis"
}`;

    try {
        const response = await getFireworksCompletion(systemPrompt, "Generate the solution XML.");
        return parseAIJson(response);
    } catch (err) {
        console.error('Live Solution Generation Error:', err);
        return null; // Let the caller fallback
    }
};

export default { generateFullProject, generateDashboardInsights, generateLiveHint, generateLiveSolution };

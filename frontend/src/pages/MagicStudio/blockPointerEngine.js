/* ─────────────────────────────────────────────
   BLOCK POINTER ENGINE (FINAL STABLE VERSION)
───────────────────────────────────────────── */
import { attachHandHint } from "./SpriteGuideAgent";
let lastHighlighted = null;

/* ─────────────────────────────────────────────
   MAIN ENTRY
───────────────────────────────────────────── */

export async function highlightNextBlock(blockType, ws, BLOCK_DB) {
    if (!blockType || !ws) return;

    console.log("🎯 Highlighting block:", blockType);

    const meta = getMeta(blockType, BLOCK_DB);
    if (!meta) return;

    openCategory(ws, meta.category);

    const flyoutWs = await waitForFlyoutBlocks(ws);
    if (!flyoutWs) return;

    const blocks = flyoutWs.getAllBlocks(false);

    const target = blocks.find(b => b.type === blockType);

    if (!target) return;

    scrollToBlock(flyoutWs, target);

    // 🔥 THIS IS THE MISSING PIECE (IMPORTANT FIX)
    attachHandHint(ws, {
        type: blockType,
        category: meta.category,
        label: meta.label
    });
}

/* ─────────────────────────────────────────────
   WAIT FOR FLYOUT (CRITICAL FIX)
───────────────────────────────────────────── */

function waitForFlyout(ws) {
    return new Promise(resolve => {
        let attempts = 0;

        const check = () => {
            const flyout = ws.getFlyout?.();
            const ready = flyout?.getWorkspace()?.getAllBlocks(false)?.length > 0;

            if (ready || attempts > 10) {
                resolve();
            } else {
                attempts++;
                requestAnimationFrame(check);
            }
        };

        check();
    });
}

function waitForFlyoutBlocks(ws) {
    return new Promise(resolve => {
        let attempts = 0;
        const MAX_ATTEMPTS = 30; // ~500ms total

        function check() {
            const flyout = ws.getFlyout?.();
            const flyoutWs = flyout?.getWorkspace();

            const blocks = flyoutWs?.getAllBlocks(false) || [];

            if (blocks.length > 0) {
                console.log("✅ Flyout ready with blocks");
                return resolve(flyoutWs);
            }

            if (attempts >= MAX_ATTEMPTS) {
                console.warn("⏳ Flyout timeout");
                return resolve(null);
            }

            attempts++;
            requestAnimationFrame(check);
        }

        check();
    });
}
/* ─────────────────────────────────────────────
   OPEN CATEGORY (ROBUST)
───────────────────────────────────────────── */

function openCategory(ws, categoryName) {
    const toolbox = ws.getToolbox?.();
    if (!toolbox) {
        console.warn("❌ No toolbox found");
        return;
    }

    const items = toolbox.getToolboxItems();

    for (let item of items) {
        const name = item.getName?.() || item.toolboxItemDef_?.name;

        if (name === categoryName) {
            console.log("📂 Opening category:", name);

            // ✅ CORRECT WAY (modern Blockly)
            toolbox.setSelectedItem(item);

            return;
        }
    }

    console.warn("⚠️ Category not found:", categoryName);
}

/* ─────────────────────────────────────────────
   SCROLL FIX (SAFE)
───────────────────────────────────────────── */

function scrollToBlock(flyoutWs, block) {
    const metrics = flyoutWs.getMetrics();
    if (!metrics) return;

    const pos = block.getRelativeToSurfaceXY();

    flyoutWs.scrollbar?.set(
        pos.x - metrics.viewWidth / 2,
        pos.y - metrics.viewHeight / 2
    );
}

/* ─────────────────────────────────────────────
   GLOW EFFECT (CLEAN)
───────────────────────────────────────────── */

function glowBlock(block) {
    clearGlow();

    const svg = block.getSvgRoot();
    if (!svg) return;

    svg.classList.add("next-block-glow");
    lastHighlighted = svg;

    console.log("✨ Glow applied to:", block.type);
}

export function clearGlow() {
    if (lastHighlighted) {
        lastHighlighted.classList.remove("next-block-glow");
        lastHighlighted = null;
    }
}

/* ─────────────────────────────────────────────
   META LOOKUP (STRICT — USES BLOCK_DB ONLY)
───────────────────────────────────────────── */

function getMeta(type, BLOCK_DB) {
    for (const key in BLOCK_DB) {
        if (BLOCK_DB[key].type === type) {
            return BLOCK_DB[key];
        }
    }
    return null;
}
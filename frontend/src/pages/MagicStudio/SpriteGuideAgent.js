import * as Blockly from 'blockly';
import { CatSprite } from './CatSprite';

let activeAgent = null;

/* ───────────────────────────────────────────────────────────────
   UTILITIES
   ─────────────────────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function waitForFlyoutBlock(ws, type, maxMs = 2500) {
    return new Promise(res => {
        const t0 = Date.now();
        (function tick() {
            const b = ws.getFlyout?.()?.getWorkspace?.()
                ?.getAllBlocks?.(false)?.find(b => b.type === type);
            if (b) return res(b);
            if (Date.now() - t0 > maxMs) return res(null);
            requestAnimationFrame(tick);
        })();
    });
}

/**
 * Polls getRect() every animation frame until the returned rect stops
 * changing for two consecutive frames (i.e. Blockly's flyout layout
 * pass has actually finished), or maxTries is hit.
 *
 * WHY THIS EXISTS: Blockly populates a flyout's blocks one at a time
 * and then reflows/repositions them as a batch. If code reads a
 * block's getBoundingClientRect() the instant the block object is
 * found (even after a short fixed sleep), it can catch a transient,
 * not-yet-final position — which is exactly what caused the cat to
 * visually target the SECOND flyout block's resting spot while trying
 * to grab the FIRST one. Waiting for the rect to be stable removes the
 * race entirely, regardless of how long the flyout's animation takes.
 */
function waitForStableRect(getRect, { maxTries = 30, stableFramesNeeded = 2 } = {}) {
    return new Promise(resolve => {
        let lastRect = null;
        let stableCount = 0;
        let tries = 0;

        const closeEnough = (a, b) =>
            a && b &&
            Math.abs(a.left - b.left) < 0.5 &&
            Math.abs(a.top - b.top) < 0.5 &&
            Math.abs(a.width - b.width) < 0.5 &&
            Math.abs(a.height - b.height) < 0.5;

        function tick() {
            const r = getRect();
            tries++;

            if (r && r.width > 0 && r.height > 0 && closeEnough(r, lastRect)) {
                stableCount++;
            } else {
                stableCount = 0;
            }
            lastRect = r;

            if (stableCount >= stableFramesNeeded || tries >= maxTries) {
                return resolve(lastRect);
            }
            requestAnimationFrame(tick);
        }
        tick();
    });
}

function openCategory(ws, name) {
    for (const item of ws.getToolbox?.()?.getToolboxItems?.() || [])
        if (item.getName?.() === name) { ws.getToolbox().setSelectedItem(item); return; }
}

/* ───────────────────────────────────────────────────────────────
   EDITOR & CONTENT BOUNDS
   ─────────────────────────────────────────────────────────────── */
function getEditorRect(ws) {
    const svg = ws.getParentSvg?.();
    return svg?.getBoundingClientRect()
        ?? document.querySelector('.injectionDiv')?.getBoundingClientRect()
        ?? null;
}

function getContentAreaRect(ws) {
    const edRect = getEditorRect(ws);
    if (!edRect) return null;
    const tbW = document.querySelector('.blocklyToolboxDiv')?.offsetWidth ?? 0;

    // Visible workspace = editor rect minus the toolbox strip on the left.
    const visLeft = edRect.left + tbW;
    const visRight = edRect.right;
    const visTop = edRect.top;
    const visBottom = edRect.bottom;

    // Guard against a degenerate (too-narrow) visible area.
    const safeLeft = visLeft < visRight - 80 ? visLeft : edRect.left;

    return {
        left: safeLeft + 12, right: visRight - 12,
        top: visTop + 12, bottom: visBottom - 12,
        // True center of the visible workspace, so the dropped block is
        // always in view without needing to close the blocks sidebar.
        cx: safeLeft + (visRight - safeLeft) / 2,
        cy: visTop + (visBottom - visTop) / 2,
    };
}

/* ───────────────────────────────────────────────────────────────
   COORDINATE HELPERS
   ─────────────────────────────────────────────────────────────── */
function wsToScreen(ws, wx, wy) {
    const svg = ws.getParentSvg?.(), canvas = ws.getCanvas?.();
    if (!svg || !canvas) return null;
    try {
        const ctm = canvas.getCTM(), r = svg.getBoundingClientRect();
        return {
            x: r.left + ctm.a * wx + ctm.c * wy + ctm.e,
            y: r.top + ctm.b * wx + ctm.d * wy + ctm.f
        };
    } catch (_) { return null; }
}

function screenToWs(ws, sx, sy) {
    const svg = ws.getParentSvg?.(), canvas = ws.getCanvas?.();
    if (!svg || !canvas) return { x: 200, y: 100 };
    try {
        const ctm = canvas.getCTM().inverse(), r = svg.getBoundingClientRect();
        const dx = sx - r.left, dy = sy - r.top;
        return { x: ctm.a * dx + ctm.c * dy + ctm.e, y: ctm.b * dx + ctm.d * dy + ctm.f };
    } catch (_) { return { x: 200, y: 100 }; }
}

/* ───────────────────────────────────────────────────────────────
   CHAIN TAIL DETECTION
   ─────────────────────────────────────────────────────────────── */
const HAT_TYPES = [
    's_when_flag', 's_when_key', 's_when_clicked', 's_when_receive',
    's_when_clone', 's_when_sprite_clicked',
    'event_whenflagclicked', 'event_whenkeypressed',
];

function findChainTail(ws) {
    const roots = ws.getAllBlocks(false).filter(b => !b.getParent?.());
    let best = null, bestDepth = -1, bestIsHat = false;
    for (const root of roots) {
        let tail = root; while (tail.getNextBlock?.()) tail = tail.getNextBlock();
        if (!tail.nextConnection) continue;
        const isHat = HAT_TYPES.includes(root.type);
        let d = 0, b = root; while (b) { d++; b = b.getNextBlock?.(); }
        if ((!bestIsHat && isHat) || (isHat === bestIsHat && d > bestDepth)) { best = tail; bestDepth = d; bestIsHat = isHat; }
    }
    return best;
}

function tailConnectionScreenPos(ws, block) {
    if (!block?.nextConnection) return null;
    try {
        const pos = block.getRelativeToSurfaceXY?.();
        const sz = block.getHeightWidth?.();
        if (!pos || !sz) return null;
        return wsToScreen(ws, pos.x + sz.width * 0.5, pos.y + sz.height);
    } catch (_) { return null; }
}

const blockRect = block => block?.getSvgRoot?.()?.getBoundingClientRect() ?? null;

function placeAndConnect(ws, blockType, tailBlock, fallbackScreen, sourceBlock) {
    let wsX, wsY;
    if (tailBlock) {
        const pos = tailBlock.getRelativeToSurfaceXY?.();
        const sz = tailBlock.getHeightWidth?.();
        if (pos && sz) { wsX = pos.x; wsY = pos.y + sz.height + 2; }
    }
    if (wsX == null && fallbackScreen) {
        const c = screenToWs(ws, fallbackScreen.x, fallbackScreen.y);
        wsX = c.x; wsY = c.y;
    }
    if (wsX == null) { wsX = 120; wsY = 80; }

    let newBlock = null;

    try {
        if (sourceBlock && typeof Blockly.Xml.blockToDom === 'function') {
            // ── Preferred path: clone the real flyout block (with shadows) ──
            const xmlEl = Blockly.Xml.blockToDom(sourceBlock, /* opt_noId */ true);
            xmlEl.setAttribute('x', Math.round(wsX));
            xmlEl.setAttribute('y', Math.round(wsY));
            newBlock = Blockly.Xml.domToBlock(xmlEl, ws);
            // v11: force the position explicitly — domToBlock doesn't
            // reliably apply the x/y attributes set above.
            if (newBlock?.moveTo) {
                try { newBlock.moveTo(new Blockly.utils.Coordinate(wsX, wsY)); }
                catch (_) {
                    // Older Blockly versions: moveTo(x, y) signature instead of Coordinate.
                    try { newBlock.moveTo(wsX, wsY); } catch (_) { }
                }
            } else if (newBlock?.moveBy) {
                const cur = newBlock.getRelativeToSurfaceXY?.() ?? { x: 0, y: 0 };
                try { newBlock.moveBy(wsX - cur.x, wsY - cur.y); } catch (_) { }
            }
        } else {
            // ── Fallback (legacy behaviour): bare type-only block. ──
            // NOTE: this path will NOT have default shadow values
            // (e.g. numeric "10") — only used if sourceBlock is unavailable.
            const dom = Blockly.utils.xml.textToDom(
                `<xml><block type="${blockType}" x="${Math.round(wsX)}" y="${Math.round(wsY)}"></block></xml>`);
            Blockly.Xml.domToWorkspace(dom, ws);
            newBlock = ws.getAllBlocks(false)
                .filter(b => b.type === blockType && !b.getParent?.()).pop();
        }
    } catch (e) {
        console.warn('⚠️ SpriteAgent: place failed', e);
        return null;
    }

    if (tailBlock && newBlock) {
        try {
            if (tailBlock.nextConnection && newBlock.previousConnection)
                tailBlock.nextConnection.connect(newBlock.previousConnection);
        } catch (_) { }
    }
    return newBlock;
}

class SpriteAgent {
    constructor(ws, blockMeta) {
        this.ws = ws; this.block = blockMeta;
        this.dead = false; this.editorRect = null;
        this.cat = null;
    }

    async run() {
        this.editorRect = getEditorRect(this.ws);
        this.cat = new CatSprite(this.editorRect);
        this.cat.createSprite();
        this.cat.createGhost(this.block.label, this.block.category);

        openCategory(this.ws, this.block.category);
        await sleep(180); if (this.dead) return;

        const catEl = this._findCategoryEl(this.block.category);
        const catRect = catEl?.getBoundingClientRect();
        const startX = catRect ? catRect.right + 18 : (this.editorRect?.left ?? 0) + 36;
        const startY = catRect ? catRect.top + catRect.height / 2 : (this.editorRect?.top ?? 0) + 80;

        this.cat.teleport(startX, startY);
        this.cat.setState('idle');
        await sleep(280); if (this.dead) return;

        const flyoutBlock = await waitForFlyoutBlock(this.ws, this.block.type);
        if (this.dead) return;
        if (!flyoutBlock) { this.destroy(); return; }

        try { flyoutBlock.getSvgRoot?.()?.scrollIntoView({ block: 'nearest' }); } catch (_) { }

        const flyoutSvg = flyoutBlock.getSvgRoot?.();
        if (!flyoutSvg) { this.destroy(); return; }

        // ── KEY FIX ──────────────────────────────────────────────
        // Don't read the bounding rect right away. Wait until it's
        // stable across consecutive animation frames, which means
        // Blockly's flyout layout pass has actually finished placing
        // ALL blocks in their final stacked positions. Reading it too
        // early was the cause of the cat targeting the wrong block's
        // (transient) position.
        const flyoutRect = await waitForStableRect(() => flyoutSvg.getBoundingClientRect());
        if (this.dead) return;
        if (!flyoutRect || !flyoutRect.width) { this.destroy(); return; }
        // ─────────────────────────────────────────────────────────

        // The paw's TARGET is the block itself — its left edge, vertically
        // centered — not a padded offset next to it. The cat approaches
        // (runs) toward this exact point so the paw lands on the block
        // with no visible gap once "grab" plays.
        const grabX = flyoutRect.left + 4;
        const grabY = flyoutRect.top + flyoutRect.height / 2;

        this.cat.setState('run');
        // byPaw = true: startX/startY here are treated as the cat's
        // current paw position (approx, since it's coming from idle at
        // the category icon), and grabX/grabY are the paw's true target.
        await this.cat.animateTo(startX, startY, grabX, grabY, 22, 12, () => this.dead, true);
        if (this.dead) return;

        const tailBlock = findChainTail(this.ws);
        let dropSx, dropSy, willConnect = false;

        if (tailBlock) {
            const snap = tailConnectionScreenPos(this.ws, tailBlock);
            if (snap) {
                dropSx = snap.x; dropSy = snap.y;
                willConnect = true;
                this.cat.showSnapTarget(blockRect(tailBlock));
            }
        }
        if (!willConnect) {
            const content = getContentAreaRect(this.ws);
            // Fallback (only used if getContentAreaRect itself returned null,
            // e.g. editor rect unavailable): center in the visible editor.
            dropSx = content?.cx ?? (this.editorRect
                ? this.editorRect.left + this.editorRect.width * 0.55
                : window.innerWidth * 0.55);
            dropSy = content?.cy ?? (this.editorRect
                ? this.editorRect.top + this.editorRect.height * 0.5
                : window.innerHeight * 0.5);
        }

        await sleep(80); if (this.dead) return;

        // "grab" is a one-shot clip — wait for it to actually finish
        // playing instead of a guessed sleep duration. Sprite is already
        // paw-anchored on the block from the animateTo above, so no
        // repositioning happens here (which previously caused a jump/gap).
        this.cat.placeByPaw(grabX, grabY);
        await this.cat.playOnce('grab'); if (this.dead) return;

        this.cat.showGhost();
        this.cat.setState('drag');

        // Drag from the paw's actual grab point to the drop point — both
        // ends are paw/block-anchored, and the ghost is rigidly locked to
        // the paw the whole way, so the hand stays glued to the block for
        // the entire motion.
        await this.cat.animateDrag(grabX, grabY, dropSx, dropSy, 75, 14, () => this.dead);
        if (this.dead) return;

        const placedBlock = placeAndConnect(this.ws, this.block.type,
            willConnect ? tailBlock : null, { x: dropSx, y: dropSy }, flyoutBlock);

        this.cat.removeSnapTarget();
        this.cat.hideGhost();

        // Re-anchor to the REAL, just-placed block's on-screen rect
        // (post-layout, post-connect) rather than trusting the last
        // drag-animation frame — Blockly may snap/reflow slightly on
        // connect, so this keeps the cat glued to the block for cheer.
        await sleep(30); // let Blockly finish its layout pass
        const finalRect = blockRect(placedBlock);
        if (finalRect) {
            this.cat.anchorToBlockRect(finalRect);
        } else {
            this.cat.placeByPawRightOf(dropSx, dropSy);
        }

        // "cheer" is also one-shot — wait for it to finish before cleanup.
        await this.cat.playOnce('cheer');
        this.destroy();
    }

    _findCategoryEl(name) {
        for (const el of document.querySelectorAll('[role="treeitem"],.blocklyTreeRow')) {
            const lbl = el.getAttribute('aria-label') || el.textContent?.trim();
            if (lbl?.includes(name)) return el;
        }
        return null;
    }

    destroy() {
        this.dead = true;
        this.cat?.destroy();
        this.cat = null;
    }
}

/* ───────────────────────────────────────────────────────────────
   PUBLIC API
   ─────────────────────────────────────────────────────────────── */
export function attachHandHint(workspace, block) {
    activeAgent?.destroy(); activeAgent = null;
    if (!workspace || !block) return;
    activeAgent = new SpriteAgent(workspace, block);
    activeAgent.run().catch(e => console.warn('⚠️ SpriteAgent:', e));
    return activeAgent;
}

export function clearHandHint() {
    activeAgent?.destroy(); activeAgent = null;
}
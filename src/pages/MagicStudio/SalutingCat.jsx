// SalutingCat.jsx
import React, { useEffect, useRef } from 'react';

// Total time the salute sequence plays before onDone() fires.
const SEQUENCE_DURATION_MS = 4500;

const COLORS = ['#FFD23F', '#FF6B6B', '#4ECDC4', '#A78BFA', '#FF9F1C', '#5DCAA5', '#F0997B', '#85B7EB'];

function rand(a, b) {
    return a + Math.random() * (b - a);
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = rand(1.5, 5.5);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.color = color;
        this.life = 1;
        this.decay = rand(0.012, 0.022);
        this.size = rand(1.5, 3);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.04;
        this.vx *= 0.985;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(this.life, 0);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

export default function SaluteSprite({ active, onDone }) {
    const canvasRef = useRef(null);
    const textRef = useRef(null);
    const rightArmRef = useRef(null);
    const tailGroupRef = useRef(null);
    const catBodyRef = useRef(null);

    const rafIdsRef = useRef([]);
    const intervalIdsRef = useRef([]);
    const timeoutIdsRef = useRef([]);

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let w = 0;
        let h = 0;

        const resize = () => {
            const r = canvas.getBoundingClientRect();
            w = canvas.width = r.width;
            h = canvas.height = r.height;
        };
        resize();
        window.addEventListener('resize', resize);

        let particles = [];

        const spawnBurst = () => {
            const x = rand(w * 0.1, w * 0.9);
            const y = rand(h * 0.08, h * 0.55);
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            for (let i = 0; i < 55; i++) {
                particles.push(new Particle(x, y, color));
            }
        };

        let frame = 0;
        let fwRafId;
        const fwLoop = () => {
            ctx.clearRect(0, 0, w, h);
            ctx.globalAlpha = 1;
            frame++;
            if (frame % 38 === 0) spawnBurst();
            if (frame % 38 === 19) spawnBurst();
            particles.forEach((p) => {
                p.update();
                p.draw(ctx);
            });
            particles = particles.filter((p) => p.life > 0);
            ctx.globalAlpha = 1;
            fwRafId = requestAnimationFrame(fwLoop);
        };
        rafIdsRef.current.push(() => cancelAnimationFrame(fwRafId));

        spawnBurst();
        const t1 = setTimeout(spawnBurst, 150);
        timeoutIdsRef.current.push(t1);
        fwLoop();

        // ── Best score text bounce-in ──────────────────────────────────────
        const textEl = textRef.current;
        const t2 = setTimeout(() => {
            textEl.style.transition = 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease';
            textEl.style.transform = 'translate(-50%,0) scale(1) rotate(-4deg)';
            textEl.style.opacity = '1';
        }, 150);
        timeoutIdsRef.current.push(t2);

        const pulseInterval = setInterval(() => {
            textEl.style.transition = 'transform 0.35s ease';
            textEl.style.transform = 'translate(-50%,0) scale(1.08) rotate(-4deg)';
            const t = setTimeout(() => {
                textEl.style.transform = 'translate(-50%,0) scale(1) rotate(-4deg)';
            }, 350);
            timeoutIdsRef.current.push(t);
        }, 1400);
        intervalIdsRef.current.push(pulseInterval);

        // ── Salute arm ──────────────────────────────────────────────────────
        const rightArm = rightArmRef.current;
        let saluteUp = false;
        const salute = () => {
            saluteUp = !saluteUp;
            rightArm.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
            rightArm.style.transform = saluteUp ? 'rotate(-14deg)' : 'rotate(0deg)';
        };
        const t3 = setTimeout(salute, 200);
        timeoutIdsRef.current.push(t3);
        const saluteInterval = setInterval(salute, 1400);
        intervalIdsRef.current.push(saluteInterval);

        // ── Tail sway ───────────────────────────────────────────────────────
        const tailGroup = tailGroupRef.current;
        let tailDir = 1;
        const tailInterval = setInterval(() => {
            tailDir *= -1;
            tailGroup.style.transition = 'transform 0.9s ease-in-out';
            tailGroup.style.transform = tailDir > 0 ? 'rotate(8deg)' : 'rotate(-8deg)';
        }, 900);
        intervalIdsRef.current.push(tailInterval);

        // ── Idle bob ────────────────────────────────────────────────────────
        const catBody = catBodyRef.current;
        let bob = 0;
        let bobRafId;
        const bounce = () => {
            bob += 0.08;
            const offset = Math.sin(bob) * 4;
            catBody.style.transform = `translateY(${offset}px)`;
            bobRafId = requestAnimationFrame(bounce);
        };
        bounce();
        rafIdsRef.current.push(() => cancelAnimationFrame(bobRafId));

        // ── End sequence ────────────────────────────────────────────────────
        const endTimer = setTimeout(() => {
            if (typeof onDone === 'function') onDone();
        }, SEQUENCE_DURATION_MS);
        timeoutIdsRef.current.push(endTimer);

        return () => {
            window.removeEventListener('resize', resize);
            rafIdsRef.current.forEach((cancel) => cancel());
            intervalIdsRef.current.forEach((id) => clearInterval(id));
            timeoutIdsRef.current.forEach((id) => clearTimeout(id));
            rafIdsRef.current = [];
            intervalIdsRef.current = [];
            timeoutIdsRef.current = [];
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    if (!active) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#0b1026',
                overflow: 'hidden',
                fontFamily: 'inherit',
            }}
        >
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

            <div
                ref={textRef}
                style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translate(-50%,-20px) scale(0.3) rotate(-8deg)',
                    opacity: 0,
                    fontSize: 50,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: '#FFD23F',
                    WebkitTextStroke: '3px #D8312B',
                    textShadow: '4px 4px 0 #D8312B, 6px 6px 0 rgba(0,0,0,0.35)',
                    fontFamily: "'Comic Sans MS', sans-serif",
                    zIndex: 5,
                    whiteSpace: 'nowrap',
                }}
            >
                BEST SCORE!!!
            </div>

            <svg
                viewBox="0 0 300 320"
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    width: 280,
                    height: 300,
                    transform: 'translate(-50%, 30px)',
                    zIndex: 4,
                }}
            >
                <defs>
                    <radialGradient id="furMain" cx="50%" cy="30%" r="75%">
                        <stop offset="0%" stopColor="#F2A85C" />
                        <stop offset="100%" stopColor="#E08A35" />
                    </radialGradient>
                    <linearGradient id="earGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F2A85C" />
                        <stop offset="100%" stopColor="#D9762E" />
                    </linearGradient>
                </defs>

                <ellipse cx="150" cy="280" rx="62" ry="16" fill="#3a2a1a" opacity="0.2" />

                <g ref={tailGroupRef} style={{ transformOrigin: '210px 250px' }}>
                    <path
                        d="M205 250 Q250 240 252 200 Q254 175 238 165"
                        stroke="#E08A35"
                        strokeWidth="18"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M205 250 Q250 240 252 200 Q254 175 238 165"
                        stroke="#C97A2C"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="2 6"
                        opacity="0.5"
                    />
                </g>

                {/* ── Legs / paws (drawn behind the body so the body edge overlaps the tops) ── */}
                <g id="legs">
                    <path
                        d="M118 265 Q108 280 110 292"
                        stroke="url(#furMain)"
                        strokeWidth="20"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <ellipse cx="109" cy="294" rx="15" ry="9" fill="#FBEAD4" />
                    <path d="M99 293 L119 293" stroke="#E0C19A" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M104 290 L104 297 M109 291 L109 298 M114 290 L114 297" stroke="#E0C19A" strokeWidth="1" strokeLinecap="round" />

                    <path
                        d="M182 265 Q192 280 190 292"
                        stroke="url(#furMain)"
                        strokeWidth="20"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <ellipse cx="191" cy="294" rx="15" ry="9" fill="#FBEAD4" />
                    <path d="M181 293 L201 293" stroke="#E0C19A" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M186 290 L186 297 M191 291 L191 298 M196 290 L196 297" stroke="#E0C19A" strokeWidth="1" strokeLinecap="round" />
                </g>

                <g ref={catBodyRef}>
                    <path
                        d="M95 210 Q88 250 100 275 Q150 295 200 275 Q212 250 205 210 Q200 195 150 192 Q100 195 95 210 Z"
                        fill="url(#furMain)"
                    />
                    <path d="M115 230 Q150 280 185 230 L185 270 Q150 290 115 270 Z" fill="#FBEAD4" opacity="0.9" />
                    <path d="M100 215 Q95 230 98 245" stroke="#C97A2C" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
                    <path d="M202 215 Q207 230 204 245" stroke="#C97A2C" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />

                    <path d="M105 130 L80 60 Q78 50 90 55 L130 95 Z" fill="url(#earGrad)" />
                    <path d="M104 122 L92 78 Q98 80 122 100 Z" fill="#F7C9A8" />
                    <path d="M195 130 L220 60 Q222 50 210 55 L170 95 Z" fill="url(#earGrad)" />
                    <path d="M196 122 L208 78 Q202 80 178 100 Z" fill="#F7C9A8" />

                    <ellipse cx="150" cy="160" rx="78" ry="72" fill="url(#furMain)" />

                    <path d="M88 145 Q105 135 118 142" stroke="#C97A2C" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
                    <path d="M212 145 Q195 135 182 142" stroke="#C97A2C" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.55" />
                    <path d="M95 120 Q112 115 120 125" stroke="#C97A2C" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />
                    <path d="M205 120 Q188 115 180 125" stroke="#C97A2C" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.4" />

                    <path d="M104 178 Q150 198 196 178 L190 215 Q150 232 110 215 Z" fill="#FBEAD4" />

                    <ellipse cx="118" cy="148" rx="27" ry="30" fill="#FCFAF4" />
                    <ellipse cx="182" cy="148" rx="27" ry="30" fill="#FCFAF4" />
                    <path d="M108 122 Q118 118 128 124" stroke="#E8C9A0" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M192 122 Q182 118 172 124" stroke="#E8C9A0" strokeWidth="1.5" fill="none" opacity="0.6" />

                    <ellipse cx="119" cy="151" rx="17" ry="20" fill="#4A3A2A" />
                    <ellipse cx="181" cy="151" rx="17" ry="20" fill="#4A3A2A" />
                    <ellipse cx="119" cy="151" rx="13" ry="16" fill="#6B8E4E" />
                    <ellipse cx="181" cy="151" rx="13" ry="16" fill="#6B8E4E" />
                    <ellipse cx="119" cy="151" rx="6" ry="10" fill="#1a1a1a" />
                    <ellipse cx="181" cy="151" rx="6" ry="10" fill="#1a1a1a" />
                    <circle cx="123" cy="144" r="4" fill="#fff" opacity="0.95" />
                    <circle cx="185" cy="144" r="4" fill="#fff" opacity="0.95" />
                    <circle cx="115" cy="158" r="1.8" fill="#fff" opacity="0.7" />
                    <circle cx="177" cy="158" r="1.8" fill="#fff" opacity="0.7" />

                    <path d="M104 138 Q119 130 134 138" stroke="#3a2c1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M166 138 Q181 130 196 138" stroke="#3a2c1e" strokeWidth="2.5" fill="none" strokeLinecap="round" />

                    <path d="M142 178 Q150 184 158 178 Q156 190 150 192 Q144 190 142 178 Z" fill="#F2956B" />
                    <ellipse cx="150" cy="180" rx="6" ry="4.5" fill="#F2956B" />

                    <path d="M150 188 Q150 196 144 200" stroke="#7a5c3e" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M150 188 Q150 196 156 200" stroke="#7a5c3e" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M132 198 Q142 204 150 200 Q158 204 168 198" stroke="#7a5c3e" strokeWidth="2" fill="none" strokeLinecap="round" />

                    <path
                        d="M95 175 L40 168 M95 182 L38 184 M95 189 L42 200"
                        stroke="#fff"
                        strokeWidth="1.2"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                    <path
                        d="M205 175 L260 168 M205 182 L262 184 M205 189 L258 200"
                        stroke="#fff"
                        strokeWidth="1.2"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                </g>

                <g>
                    <path
                        d="M115 245 Q98 268 105 282"
                        stroke="url(#furMain)"
                        strokeWidth="22"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <ellipse cx="103" cy="284" rx="14" ry="11" fill="#FBEAD4" />
                    <path d="M95 282 L112 282 M97 288 L110 288" stroke="#E0C19A" strokeWidth="1.3" strokeLinecap="round" />
                </g>

                <g ref={rightArmRef} style={{ transformOrigin: '185px 245px' }}>
                    <path
                        d="M185 245 Q205 215 200 175"
                        stroke="url(#furMain)"
                        strokeWidth="22"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <circle cx="200" cy="173" r="14" fill="#FBEAD4" />
                    <path d="M191 173 L209 173 M194 167 L206 167 M194 179 L206 179" stroke="#E0C19A" strokeWidth="1.3" strokeLinecap="round" />
                </g>
            </svg>

            <div
                style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    overflow: 'hidden',
                    clip: 'rect(0 0 0 0)',
                }}
            >
                A painterly ginger tabby kitten with big green eyes raises a paw in a salute as fireworks burst across
                the screen and Best score text bounces in.
            </div>
        </div>
    );
}
/* ─── Sci-Fi Menu Sound Effects ─────────────────────────────────────────────
 *  All sounds generated purely via Web Audio API — no external files needed.
 *  Usage (auto-wired via SFX.init()):
 *    SFX.hover()   — card mouse-enter
 *    SFX.select()  — card click selection
 *    SFX.launch()  — DRIVE NOW button
 * ──────────────────────────────────────────────────────────────────────────── */

const SFX = (() => {
    let ctx = null;
    let masterGain = null;

    async function ensureCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.55;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') await ctx.resume();
        return ctx;
    }

    /* ── Tiny helper: connect node chain ─────────────────────────── */
    function chain(...nodes) {
        for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
        nodes[nodes.length - 1].connect(masterGain);
    }

    /* ── Reverb (convolution with a synthetic IR) ─────────────────── */
    function makeReverb(c, duration = 0.4, decay = 4) {
        const rate = c.sampleRate;
        const len = rate * duration;
        const buf = c.createBuffer(2, len, rate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
            }
        }
        const conv = c.createConvolver();
        conv.buffer = buf;
        return conv;
    }

    /* ══════════════════════════════════════════════════════════════
       HOVER  — soft hi-freq blip (two detuned sine tones)
       ══════════════════════════════════════════════════════════════ */
    async function hover() {
        const c = await ensureCtx();
        const t = c.currentTime;

        [880, 1108].forEach((freq, i) => {
            const osc = c.createOscillator();
            const env = c.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.08);
            env.gain.setValueAtTime(0, t);
            env.gain.linearRampToValueAtTime(0.18 - i * 0.04, t + 0.01);
            env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
            chain(osc, env);
            osc.start(t);
            osc.stop(t + 0.13);
        });
    }

    /* ══════════════════════════════════════════════════════════════
       SELECT  — confirmation chime: ascending two-tone + reverb tail
       ══════════════════════════════════════════════════════════════ */
    async function select() {
        const c = await ensureCtx();
        const t = c.currentTime;
        const rev = makeReverb(c, 0.5, 5);

        [[440, 0], [660, 0.07], [880, 0.14]].forEach(([freq, delay]) => {
            const osc = c.createOscillator();
            const env = c.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + delay);
            env.gain.setValueAtTime(0, t + delay);
            env.gain.linearRampToValueAtTime(0.22, t + delay + 0.015);
            env.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.28);
            chain(osc, env, rev);
            osc.start(t + delay);
            osc.stop(t + delay + 0.3);
        });

        // Subtle low "thunk"
        const thunk = c.createOscillator();
        const thunkEnv = c.createGain();
        thunk.type = 'sine';
        thunk.frequency.setValueAtTime(120, t);
        thunk.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        thunkEnv.gain.setValueAtTime(0.3, t);
        thunkEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        chain(thunk, thunkEnv);
        thunk.start(t);
        thunk.stop(t + 0.13);
    }

    /* ══════════════════════════════════════════════════════════════
       LAUNCH  — power-up whoosh: filtered noise sweep + bass punch
       ══════════════════════════════════════════════════════════════ */
    async function launch() {
        const c = await ensureCtx();
        const t = c.currentTime;
        const rev = makeReverb(c, 1.2, 3);

        // — Noise sweep —
        const bufSize = c.sampleRate * 1.5;
        const noiseBuffer = c.createBuffer(1, bufSize, c.sampleRate);
        const nd = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;

        const noise = c.createBufferSource();
        noise.buffer = noiseBuffer;

        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(200, t);
        bpf.frequency.exponentialRampToValueAtTime(8000, t + 0.8);
        bpf.Q.value = 3;

        const noiseEnv = c.createGain();
        noiseEnv.gain.setValueAtTime(0, t);
        noiseEnv.gain.linearRampToValueAtTime(0.4, t + 0.05);
        noiseEnv.gain.setValueAtTime(0.4, t + 0.6);
        noiseEnv.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

        chain(noise, bpf, noiseEnv, rev);
        noise.start(t);
        noise.stop(t + 1.5);

        // — Rising synth tone —
        const osc = c.createOscillator();
        const oscEnv = c.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.7);
        oscEnv.gain.setValueAtTime(0, t);
        oscEnv.gain.linearRampToValueAtTime(0.28, t + 0.04);
        oscEnv.gain.setValueAtTime(0.28, t + 0.55);
        oscEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        const hpf = c.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 300;
        chain(osc, hpf, oscEnv, rev);
        osc.start(t);
        osc.stop(t + 1.0);

        // — Bass punch —
        const bass = c.createOscillator();
        const bassEnv = c.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(60, t + 0.7);
        bass.frequency.exponentialRampToValueAtTime(30, t + 1.0);
        bassEnv.gain.setValueAtTime(0.55, t + 0.7);
        bassEnv.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        chain(bass, bassEnv);
        bass.start(t + 0.7);
        bass.stop(t + 1.2);
    }

    /* ── Wire up to DOM elements ──────────────────────────────────── */
    function init() {
        // Unlock AudioContext on first user gesture
        const unlock = () => { ensureCtx().catch(() => { }); };
        document.addEventListener('click', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });

        // Card hover
        document.querySelectorAll('.car-card').forEach(card => {
            card.addEventListener('mouseenter', hover);
        });

        // Card click (select sound — fires before the click handler updates .selected)
        document.querySelectorAll('.car-card').forEach(card => {
            card.addEventListener('click', select);
        });

        // Launch button
        const btn = document.getElementById('launch-btn');
        if (btn) btn.addEventListener('click', launch);

        // Also trigger launch on Enter key when splash is visible
        document.addEventListener('keydown', e => {
            const splash = document.getElementById('title-splash');
            if (!splash || splash.style.display === 'none') return;
            if (e.key === 'Enter' || e.key === ' ') launch();
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                e.key === 'ArrowUp' || e.key === 'ArrowDown') hover();
        });
    }

    return { init, hover, select, launch };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', SFX.init);
} else {
    SFX.init();
}

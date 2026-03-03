/* ─── CYBER FM — In-Game Radio Station ────────────────────────────────────
 *
 *  GTA-inspired radio station with:
 *   • Procedurally generated EDM track (kick, bass, lead synth, hi-hats, pads)
 *   • DJ outtakes via Web Speech API
 *   • "Caller" segments with a different voice + radio static filter
 *   • Station jingle (synthesized tones)
 *   • Full cycle: jingle → DJ intro → music → DJ break → caller → music → ...
 *
 *  Usage (auto-wired — call from main.js after startGame):
 *    CyberFM.start();
 *    CyberFM.stop();
 *    CyberFM.setMute(bool);
 * ──────────────────────────────────────────────────────────────────────── */

export const CyberFM = (() => {
    /* ══ Audio Context ══════════════════════════════════════════════ */
    let ctx = null;
    let master = null;
    let musicBus = null;
    let running = false;
    let muted = false;
    let loopHandle = null;

    function ensureCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            master = ctx.createGain();
            master.gain.value = 0.42;
            master.connect(ctx.destination);

            musicBus = ctx.createGain();
            musicBus.gain.value = 1;
            musicBus.connect(master);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    /* ══ Helpers ════════════════════════════════════════════════════ */
    function noteToHz(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    // Simple reverb IR
    function makeReverb(c, dur = 1.8, decay = 3.5) {
        const len = Math.floor(c.sampleRate * dur);
        const buf = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        const n = c.createConvolver();
        n.buffer = buf;
        return n;
    }

    // Limiter / compressor on the master bus
    function addMasterComp(c, dest) {
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -6;
        comp.knee.value = 6;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        comp.connect(dest);
        return comp;
    }

    /* ══ EDM SEQUENCER ══════════════════════════════════════════════
     *  Runs a 16-step loop, scheduling audio events in advance.
     *  BPM = 128, 1 bar = 1.875 s
     * ════════════════════════════════════════════════════════════ */
    /* ══ SONGS LIBRARY ════════════════════════════════════════════════
     *  Five distinct tracks, each with its own BPM, patterns, and
     *  chord progression.  The sequencer rotates through them.
     * ════════════════════════════════════════════════════════════════ */
    const SONGS = [
        {   // ── "Desert Drive" ── 128 BPM · C-minor · classic EDM
            bpm: 128, barsPerBlock: 24,
            bassPattern: [36, 36, 43, 36, 34, 36, 41, 36],
            leadPattern: [60, null, 63, null, 65, 63, null, 60, null, 58, 60, null, 63, null, 65, null],
            hihatOpen: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
            hihatClose: [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
            chords: [[48, 51, 55, 60], [41, 45, 48, 53], [43, 46, 50, 55], [46, 50, 53, 58]],
        },
        {   // ── "Chrome Horizon" ── 110 BPM · A-minor · melodic/chill
            bpm: 110, barsPerBlock: 20,
            bassPattern: [33, null, 33, 40, null, 33, 38, null],
            leadPattern: [57, null, 60, 62, null, 60, null, 57, null, null, 57, 60, null, 62, 60, null],
            hihatOpen: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            hihatClose: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
            chords: [[45, 48, 52, 57], [43, 46, 50, 55], [40, 43, 47, 52], [38, 41, 45, 50]],
        },
        {   // ── "Voltage Rush" ── 140 BPM · E-minor · hard/aggressive
            bpm: 140, barsPerBlock: 28,
            bassPattern: [28, 28, 28, 35, 28, 28, 33, 35],
            leadPattern: [52, null, 55, null, 52, 55, 57, null, 52, null, 55, 52, null, 57, 59, null],
            hihatOpen: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihatClose: [1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0],
            chords: [[40, 43, 47, 52], [38, 41, 45, 50], [35, 38, 42, 47], [33, 36, 40, 45]],
        },
        {   // ── "Neon Dusk" ── 95 BPM · D-minor · slow/atmospheric
            bpm: 95, barsPerBlock: 16,
            bassPattern: [38, null, null, 38, 45, null, 38, null],
            leadPattern: [62, null, null, 65, null, 62, 60, null, null, 60, 62, null, 65, null, null, 67],
            hihatOpen: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihatClose: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
            chords: [[38, 41, 45, 50], [36, 39, 43, 48], [33, 36, 40, 45], [31, 34, 38, 43]],
        },
        {   // ── "Synthetic Storm" ── 132 BPM · G-minor · punchy/funky
            bpm: 132, barsPerBlock: 24,
            bassPattern: [31, 31, 38, 31, 38, 43, 31, 38],
            leadPattern: [55, null, 58, null, 60, null, 58, 55, null, 53, 55, null, 58, null, 60, null],
            hihatOpen: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            hihatClose: [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
            chords: [[43, 46, 50, 55], [41, 45, 48, 53], [38, 41, 45, 50], [36, 39, 43, 48]],
        },
    ];

    let currentSongIdx = 0;
    function getSong() { return SONGS[currentSongIdx % SONGS.length]; }
    function getSongTiming() { const beat = 60 / getSong().bpm; return { beat, bar: beat * 4 }; }

    let seqRunning = false;
    let seqBar = 0;
    let nextBarTime = 0;
    let seqTimeout = null;
    let reverbNode = null;

    /* ── Kick drum ───────────────────────────────────────────────── */
    function playKick(c, when, bus) {
        const o = c.createOscillator();
        const e = c.createGain();
        o.frequency.setValueAtTime(180, when);
        o.frequency.exponentialRampToValueAtTime(30, when + 0.22);
        e.gain.setValueAtTime(1.2, when);
        e.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
        o.connect(e); e.connect(bus);
        o.start(when); o.stop(when + 0.3);

        // Click transient
        const nb = c.createBuffer(1, Math.floor(c.sampleRate * 0.01), c.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource();
        ns.buffer = nb;
        const ng = c.createGain();
        ng.gain.setValueAtTime(0.6, when);
        ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.01);
        ns.connect(ng); ng.connect(bus);
        ns.start(when);
    }

    /* ── Snare ───────────────────────────────────────────────────── */
    function playSnare(c, when, bus) {
        // Noise body
        const bufLen = Math.floor(c.sampleRate * 0.18);
        const nb = c.createBuffer(1, bufLen, c.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource();
        ns.buffer = nb;
        const ng = c.createGain();
        ng.gain.setValueAtTime(0.7, when);
        ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
        const hpf = c.createBiquadFilter();
        hpf.type = 'highpass'; hpf.frequency.value = 1500;
        ns.connect(hpf); hpf.connect(ng); ng.connect(bus);
        ns.start(when);

        // Tone body
        const o = c.createOscillator();
        const e = c.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(200, when);
        o.frequency.exponentialRampToValueAtTime(80, when + 0.1);
        e.gain.setValueAtTime(0.5, when);
        e.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
        o.connect(e); e.connect(bus);
        o.start(when); o.stop(when + 0.12);
    }

    /* ── Hi-hat ──────────────────────────────────────────────────── */
    function playHihat(c, when, open, bus) {
        const bufLen = Math.floor(c.sampleRate * (open ? 0.22 : 0.06));
        const nb = c.createBuffer(1, bufLen, c.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < bufLen; i++) nd[i] = Math.random() * 2 - 1;
        const ns = c.createBufferSource();
        ns.buffer = nb;
        const hpf = c.createBiquadFilter();
        hpf.type = 'highpass'; hpf.frequency.value = 7000;
        const ng = c.createGain();
        ng.gain.setValueAtTime(open ? 0.28 : 0.18, when);
        ng.gain.exponentialRampToValueAtTime(0.0001, when + bufLen / c.sampleRate);
        ns.connect(hpf); hpf.connect(ng); ng.connect(bus);
        ns.start(when);
    }

    /* ── Bass synth (mono sawtooth → LPF) ───────────────────────── */
    function playBassNote(c, when, midi, dur, bus) {
        const hz = noteToHz(midi);
        const o1 = c.createOscillator();
        const o2 = c.createOscillator();
        o1.type = 'sawtooth'; o1.frequency.value = hz;
        o2.type = 'sawtooth'; o2.frequency.value = hz * 1.005; // slight detune

        const lpf = c.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(600, when);
        lpf.frequency.exponentialRampToValueAtTime(2400, when + 0.08);
        lpf.frequency.exponentialRampToValueAtTime(350, when + dur * 0.8);
        lpf.Q.value = 6;

        const e = c.createGain();
        e.gain.setValueAtTime(0, when);
        e.gain.linearRampToValueAtTime(0.5, when + 0.02);
        e.gain.setValueAtTime(0.5, when + dur - 0.04);
        e.gain.linearRampToValueAtTime(0, when + dur);

        o1.connect(lpf); o2.connect(lpf); lpf.connect(e); e.connect(bus);
        o1.start(when); o2.start(when);
        o1.stop(when + dur + 0.01); o2.stop(when + dur + 0.01);
    }

    /* ── Lead synth (detuned saws + reverb) ─────────────────────── */
    function playLeadNote(c, when, midi, dur, bus, rev) {
        const hz = noteToHz(midi);
        const voices = 3;
        const detunes = [-8, 0, 8];
        const osc = [];
        for (let i = 0; i < voices; i++) {
            const o = c.createOscillator();
            o.type = 'sawtooth';
            o.frequency.value = hz;
            o.detune.value = detunes[i];
            osc.push(o);
        }

        const lpf = c.createBiquadFilter();
        lpf.type = 'lowpass'; lpf.frequency.value = 3200; lpf.Q.value = 2;

        const e = c.createGain();
        e.gain.setValueAtTime(0, when);
        e.gain.linearRampToValueAtTime(0.22, when + 0.04);
        e.gain.setValueAtTime(0.18, when + dur - 0.06);
        e.gain.linearRampToValueAtTime(0, when + dur);

        osc.forEach(o => { o.connect(lpf); o.start(when); o.stop(when + dur + 0.05); });
        lpf.connect(e);
        e.connect(bus);
        e.connect(rev);  // reverb send
    }

    /* ── Pad chord (atmospheric) ─────────────────────────────────── */
    function playPadChord(c, when, midiNotes, dur, bus, rev) {
        midiNotes.forEach(midi => {
            const o = c.createOscillator();
            o.type = 'sine';
            o.frequency.value = noteToHz(midi);
            const e = c.createGain();
            e.gain.setValueAtTime(0, when);
            e.gain.linearRampToValueAtTime(0.06, when + 0.4);
            e.gain.setValueAtTime(0.06, when + dur - 0.4);
            e.gain.linearRampToValueAtTime(0, when + dur);
            o.connect(e); e.connect(rev);
            o.start(when); o.stop(when + dur + 0.02);
        });
    }

    /* ── Schedule one bar using the current song's patterns ─────── */
    function scheduleBar(c, barStartTime, bus) {
        const song = getSong();
        const { beat, bar } = getSongTiming();
        const step16 = beat / 4;

        [0, 1, 2, 3].forEach(b => playKick(c, barStartTime + b * beat, bus));
        [1, 3].forEach(b => playSnare(c, barStartTime + b * beat, bus));

        for (let i = 0; i < 16; i++) {
            const t = barStartTime + i * step16;
            if (song.hihatOpen[i]) playHihat(c, t, true, bus);
            if (song.hihatClose[i]) playHihat(c, t, false, bus);
        }

        const bassStep = beat / 2;
        song.bassPattern.forEach((midi, i) => {
            if (midi !== null) playBassNote(c, barStartTime + i * bassStep, midi, bassStep * 0.88, bus);
        });

        song.leadPattern.forEach((midi, i) => {
            if (midi !== null) playLeadNote(c, barStartTime + i * step16, midi, step16 * 0.82, bus, reverbNode);
        });

        const chordIdx = seqBar % song.chords.length;
        playPadChord(c, barStartTime, song.chords[chordIdx], bar, bus, reverbNode);
    }

    /* ── Sequencer loop ──────────────────────────────────────────── */
    function seqTick() {
        if (!seqRunning) return;
        const { bar } = getSongTiming();
        if (nextBarTime < ctx.currentTime + 0.1) {
            scheduleBar(ctx, nextBarTime, musicBus);
            nextBarTime += bar;
            seqBar++;
        }
        seqTimeout = setTimeout(seqTick, 30);
    }

    function startSequencer() {
        if (seqRunning) return;
        const c = ensureCtx();
        if (!reverbNode) {
            reverbNode = makeReverb(c, 2.2, 3);
            reverbNode.connect(musicBus);
        }
        seqRunning = true;
        nextBarTime = c.currentTime + 0.05;
        seqBar = 0;
        seqTick();
    }

    function stopSequencer() {
        seqRunning = false;
        if (seqTimeout) clearTimeout(seqTimeout);
    }

    /* ══ STATION JINGLE ═════════════════════════════════════════════
     *  Synthesized 3-note rising ident: "CYBER FM"
     * ════════════════════════════════════════════════════════════ */
    function playJingle() {
        const c = ensureCtx();
        const t = c.currentTime;
        const rev = makeReverb(c, 1.5, 4);
        rev.connect(master);

        [[523, 0], [659, 0.18], [784, 0.36], [1047, 0.6]].forEach(([hz, delay]) => {
            const o = c.createOscillator();
            const e = c.createGain();
            o.type = 'triangle';
            o.frequency.value = hz;
            e.gain.setValueAtTime(0, t + delay);
            e.gain.linearRampToValueAtTime(0.32, t + delay + 0.04);
            e.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.55);
            o.connect(e); e.connect(rev);
            o.start(t + delay); o.stop(t + delay + 0.6);
        });

        return 1.8; // duration in seconds
    }

    /* ══ RADIO STATIC noise burst ═══════════════════════════════════ */
    function playStatic(c, when, dur) {
        const bufLen = Math.floor(c.sampleRate * dur);
        const nb = c.createBuffer(1, bufLen, c.sampleRate);
        const nd = nb.getChannelData(0);
        for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.25;
        const ns = c.createBufferSource();
        ns.buffer = nb;
        const bpf = c.createBiquadFilter();
        bpf.type = 'bandpass'; bpf.frequency.value = 1800; bpf.Q.value = 0.8;
        const g = c.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(0.4, when + 0.04);
        g.gain.setValueAtTime(0.4, when + dur - 0.06);
        g.gain.linearRampToValueAtTime(0, when + dur);
        ns.connect(bpf); bpf.connect(g); g.connect(master);
        ns.start(when); ns.stop(when + dur + 0.01);
    }

    /* ══ TTS SPEECH HELPERS ═════════════════════════════════════════ */
    function getVoices() {
        return window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    }

    function speak(text, opts = {}) {
        if (!window.speechSynthesis) return Promise.resolve(1);
        return new Promise(resolve => {
            const u = new SpeechSynthesisUtterance(text);
            const voices = getVoices();
            // Prefer a US English voice; fall back to first available
            const pick = voices.find(v => v.lang === 'en-US' && !v.name.includes('Google')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
            if (pick) u.voice = pick;
            u.rate = opts.rate ?? 1.0;
            u.pitch = opts.pitch ?? 1.0;
            u.volume = opts.volume ?? 0.9;
            u.onend = () => resolve(u.text.split(' ').length * 0.45 + 0.5);
            window.speechSynthesis.speak(u);
            // Estimate if onend never fires (can happen on some browsers)
            const fallback = setTimeout(() => resolve(u.text.split(' ').length * 0.45 + 0.5), 8000);
            u.onend = () => { clearTimeout(fallback); resolve(); };
        });
    }

    /* ══ DJ SCRIPTS ═════════════════════════════════════════════════
     *  GTA-style lines for "CYBER FM"
     * ════════════════════════════════════════════════════════════ */
    const DJ_INTROS = [
        "You're tuned in to CYBER FM, the only station brave enough to blast this deep into the desert. I'm your host, DJ Volt, and if you can hear me, you're probably doing something illegal in a truck. KEEP IT UP.",
        "Welcome back to CYBER FM! That was forty-three minutes of uninterrupted aggression. We got more where that came from. The desert does NOT take requests. But I do. CYBER FM.",
        "CYBER FM — we're live, we're loud, and we absolutely do not have the proper broadcasting license for this frequency. Shoutout to the listeners dodging rocks at ninety per. You belong here.",
    ];

    const DJ_BREAKS = [
        "That was an original from the underground. Can't tell you the name, can't tell you the artist. What I CAN tell you is — you're listening to CYBER FM and we never apologize. Hit it.",
        "Brief programming note: my producer just told me to play something 'more accessible.' My producer has been fired. CYBER FM.",
        "Caller line is open. You know the deal. Say something interesting or don't call. Actually, call anyway. We're desperate for content. CYBER FM.",
        "Roads? Where we're going, roads are just suggestions. Like traffic laws. Like personal space. CYBER FM.",
        "That was four solid minutes of controlled chaos. Kind of like my weekend. We're back after this... absolutely nothing. It's just more music. CYBER FM.",
    ];

    const CALLER_EXCHANGES = [
        {
            host: "Caller, you're on CYBER FM. What's your situation?",
            caller: "Yeah hi, big fan, long time listener. I just drove through a gas station wall on purpose and I feel FANTASTIC.",
            host: "That's incredible. You're a hero. Don't call us again.",
        },
        {
            host: "CYBER FM, you're on the air.",
            caller: "Is this the station that played that song with the thing? The wub wub wub?",
            host: "That describes literally everything we've ever played. Yes. That was us.",
            caller: "Sick.",
        },
        {
            host: "Caller, go ahead.",
            caller: "I just want to say: I've been driving for six hours with no destination and I feel more free than I ever have in my entire life.",
            host: "Buddy, that is the CYBER FM mission statement right there. We're putting that on a billboard. You're disconnected.",
        },
        {
            host: "Alright, caller on line one.",
            caller: "I crashed into a cactus doing eighty and the cactus lost. I'm calling to report the cactus is fine actually.",
            host: "You checked on the cactus. You're a good person. CYBER FM.",
        },
    ];

    let callerIdx = 0;
    let djIntroIdx = 0;
    let djBreakIdx = 0;

    /* ══ STATION CYCLE ══════════════════════════════════════════════
     *  Phase sequence:
     *  1. Jingle (2s)
     *  2. DJ intro monologue (~15-20s speech, music ducked)
     *  3. Music plays for 4 bars → then DJ break (5-10s)
     *  4. Caller exchange (20-30s, music ducked)
     *  5. Music plays for 4 bars → loop from 3
     * ════════════════════════════════════════════════════════════ */
    async function runCycle() {
        if (!running) return;

        // Ensure TTS voices are loaded
        await new Promise(res => {
            if (getVoices().length > 0) return res();
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = res;
                setTimeout(res, 800);
            } else { res(); }
        });

        while (running) {
            const { bar } = getSongTiming();
            const blockMs = getSong().barsPerBlock * bar * 1000;

            /* ── Phase 1: Jingle (silence music, play ident) ─────────── */
            stopSequencer();
            await duck(0.0, 0.3);
            playJingle();
            await sleep(2000);
            await unduck(0.3);

            /* ── Phase 2: DJ intro over start of track ───────────────── */
            await duck(0.08, 0.4);
            startSequencer();
            await sleep(400);
            const intro = DJ_INTROS[djIntroIdx % DJ_INTROS.length];
            djIntroIdx++;
            await speak(intro, { rate: 1.05, pitch: 0.92, volume: 1.0 });
            await unduck(0.4);

            /* ── Phase 3: First music block ──────────────────────────── */
            await sleep(blockMs);
            if (!running) break;

            /* ── Phase 4: DJ break ───────────────────────────────────── */
            await duck(0.08, 0.4);
            const brk = DJ_BREAKS[djBreakIdx % DJ_BREAKS.length];
            djBreakIdx++;
            await speak(brk, { rate: 0.98, pitch: 0.9, volume: 1.0 });
            await unduck(0.4);

            /* ── Phase 5: Second music block ─────────────────────────── */
            await sleep(blockMs);
            if (!running) break;

            /* ── Phase 6: Caller segment ─────────────────────────────── */
            await duck(0.06, 0.4);
            const exchange = CALLER_EXCHANGES[callerIdx % CALLER_EXCHANGES.length];
            callerIdx++;

            playStatic(ctx, ctx.currentTime, 0.3);
            await sleep(350);
            await speak(exchange.host, { rate: 1.05, pitch: 0.92, volume: 1.0 });
            playStatic(ctx, ctx.currentTime, 0.2);
            await sleep(250);
            await speak(exchange.caller, { rate: 1.12, pitch: 1.35, volume: 0.92 });

            if (exchange.host2) {
                await speak(exchange.host2, { rate: 1.05, pitch: 0.92, volume: 1.0 });
                playStatic(ctx, ctx.currentTime, 0.2);
                await sleep(250);
                await speak(exchange.caller2, { rate: 1.12, pitch: 1.35, volume: 0.92 });
            }

            await speak(exchange.host, { rate: 1.05, pitch: 0.92, volume: 1.0 });
            playStatic(ctx, ctx.currentTime, 0.3);
            await sleep(400);
            await unduck(0.4);

            /* ── Bridge: short music antes next song ─────────────────── */
            await sleep(Math.round(blockMs * 0.35));
            if (!running) break;

            /* ── Rotate to next song ─────────────────────────────────── */
            currentSongIdx++;
        }
    }

    /* ── Music ducking helpers ───────────────────────────────────── */
    function duck(targetVol, fadeTime) {
        if (!musicBus) return Promise.resolve();
        const t = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t);
        musicBus.gain.setValueAtTime(musicBus.gain.value, t);
        musicBus.gain.linearRampToValueAtTime(targetVol, t + fadeTime);
        return sleep(fadeTime * 1000);
    }

    function unduck(fadeTime) {
        if (!musicBus) return Promise.resolve();
        const t = ctx.currentTime;
        musicBus.gain.cancelScheduledValues(t);
        musicBus.gain.setValueAtTime(musicBus.gain.value, t);
        musicBus.gain.linearRampToValueAtTime(1.0, t + fadeTime);
        return sleep(fadeTime * 1000);
    }

    function sleep(ms) {
        return new Promise(res => setTimeout(res, ms));
    }

    /* ══ PUBLIC API ═════════════════════════════════════════════════ */
    async function start() {
        if (running) return;
        running = true;
        ensureCtx();
        // Chrome autoplay policy: must await resume() inside the gesture call stack
        await ctx.resume();
        // Ensure compressor on master
        const comp = addMasterComp(ctx, ctx.destination);
        master.disconnect();
        master.connect(comp);
        startSequencer();
        runCycle().catch(console.warn);
    }

    function stop() {
        running = false;
        stopSequencer();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    function setMute(mute) {
        muted = mute;
        ensureCtx();
        master.gain.setValueAtTime(mute ? 0 : 0.72, ctx.currentTime);
    }

    function toggleMute() {
        setMute(!muted);
        return muted;
    }

    return { start, stop, setMute, toggleMute };
})();

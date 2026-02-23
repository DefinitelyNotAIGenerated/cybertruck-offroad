/* ─── HUD Manager ─── */

export function updateHUD(speedKmh, gear) {
    const speedEl = document.getElementById('speed-value');
    const gearEl = document.getElementById('gear-indicator');

    if (speedEl) speedEl.textContent = speedKmh;
    if (gearEl) {
        gearEl.textContent = gear;
        gearEl.className = gear === 'R' ? 'reverse' : '';
    }
}

export function hideSplash() {
    const splash = document.getElementById('title-splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 1200);
    }
}

export function hideControlsHint() {
    const hint = document.getElementById('controls-hint');
    if (hint) {
        setTimeout(() => {
            hint.style.opacity = '0';
            setTimeout(() => hint.style.display = 'none', 800);
        }, 8000);
    }
}

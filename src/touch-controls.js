/* ─── Touch Controls (Virtual Joystick) ─── */

import { isMobile } from './device.js';

/**
 * Touch input state — mirrors the keyboard input interface.
 * When on desktop, everything stays false (no-op).
 */
export const touchInput = {
    forward: false,
    brake: false,
    left: false,
    right: false,
    anyKey: false,
};

if (isMobile) {
    initTouchControls();
}

function initTouchControls() {
    // ── Create joystick DOM elements ──
    const joystickZone = document.createElement('div');
    joystickZone.id = 'joystick-zone';

    const joystickBase = document.createElement('div');
    joystickBase.id = 'joystick-base';

    const joystickKnob = document.createElement('div');
    joystickKnob.id = 'joystick-knob';

    joystickBase.appendChild(joystickKnob);
    joystickZone.appendChild(joystickBase);

    const container = document.getElementById('game-container');
    container.appendChild(joystickZone);

    // ── Joystick state ──
    let activeTouch = null;       // tracking touch identifier
    let baseX = 0;                // center of the joystick base (screen coords)
    let baseY = 0;
    const maxRadius = 50;         // max knob travel in px
    const deadZone = 0.15;        // fraction of maxRadius to ignore (prevents drift)

    // ── Touch event handlers ──
    joystickZone.addEventListener('touchstart', onTouchStart, { passive: false });
    joystickZone.addEventListener('touchmove', onTouchMove, { passive: false });
    joystickZone.addEventListener('touchend', onTouchEnd, { passive: false });
    joystickZone.addEventListener('touchcancel', onTouchEnd, { passive: false });

    function onTouchStart(e) {
        e.preventDefault();
        if (activeTouch !== null) return; // already tracking a touch

        const touch = e.changedTouches[0];
        activeTouch = touch.identifier;

        // Position the joystick base where the user touched
        baseX = touch.clientX;
        baseY = touch.clientY;

        joystickBase.style.display = 'block';
        joystickBase.style.left = `${baseX}px`;
        joystickBase.style.top = `${baseY}px`;

        // Reset knob to center
        joystickKnob.style.transform = 'translate(-50%, -50%)';

        touchInput.anyKey = true;
    }

    function onTouchMove(e) {
        e.preventDefault();
        if (activeTouch === null) return;

        // Find our tracked touch
        let touch = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouch) {
                touch = e.changedTouches[i];
                break;
            }
        }
        if (!touch) return;

        // Compute offset from base center
        let dx = touch.clientX - baseX;
        let dy = touch.clientY - baseY;

        // Clamp to max radius
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        // Move the knob visually
        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Normalize to -1..1
        const nx = dx / maxRadius;
        const ny = dy / maxRadius; // positive = down on screen = brake

        // Apply dead zone
        touchInput.left = nx < -deadZone;
        touchInput.right = nx > deadZone;
        touchInput.forward = ny < -deadZone;  // push UP on screen = forward
        touchInput.brake = ny > deadZone;     // pull DOWN on screen = brake/reverse
        touchInput.anyKey = true;
    }

    function onTouchEnd(e) {
        e.preventDefault();

        // Check if our tracked touch ended
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouch) {
                activeTouch = null;
                break;
            }
        }

        if (activeTouch !== null) return; // still have our touch

        // Reset everything
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickBase.style.display = 'none';

        touchInput.forward = false;
        touchInput.brake = false;
        touchInput.left = false;
        touchInput.right = false;
        // Keep anyKey true briefly so splash can dismiss
        setTimeout(() => { touchInput.anyKey = false; }, 100);
    }
}

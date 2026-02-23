/* ─── Input Manager ─── */

import { touchInput } from './touch-controls.js';

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keys[e.key.toLowerCase()] = false;
});

export const input = {
    get forward() { return !!(keys['KeyW'] || keys['w'] || keys['ArrowUp'] || touchInput.forward); },
    get brake() { return !!(keys['KeyS'] || keys['s'] || keys['ArrowDown'] || touchInput.brake); },
    get left() { return !!(keys['KeyA'] || keys['a'] || keys['ArrowLeft'] || touchInput.left); },
    get right() { return !!(keys['KeyD'] || keys['d'] || keys['ArrowRight'] || touchInput.right); },
    get anyKey() { return Object.values(keys).some(Boolean) || touchInput.anyKey; }
};

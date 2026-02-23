/* ─── Client Networking (WebSocket) ─── */

const SEND_RATE = 15; // Hz — how often to send state updates
const SEND_INTERVAL = 1000 / SEND_RATE;

let ws = null;
let localId = -1;
let localColor = '#b0b0b0';
let connected = false;
let remotePlayers = []; // array of { id, x, y, z, heading, speed }
let playerCount = 0;
let lastSendTime = 0;

/**
 * Initialize the WebSocket connection.
 * Connects to the WS server on port 3001 of the current host.
 */
export function initNetwork() {
    const host = window.location.hostname || 'localhost';
    const url = `ws://${host}:3001`;

    console.log(`[Network] Connecting to ${url}...`);
    connect(url);
}

function connect(url) {
    try {
        ws = new WebSocket(url);
    } catch (e) {
        console.warn('[Network] WebSocket not available');
        return;
    }

    ws.onopen = () => {
        console.log('[Network] Connected');
        connected = true;
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'welcome':
                    localId = msg.id;
                    localColor = msg.color;
                    console.log(`[Network] Assigned player ID: ${localId}`);
                    break;

                case 'states':
                    // Filter out our own state
                    remotePlayers = msg.players.filter(p => p.id !== localId);
                    break;

                case 'players':
                    playerCount = msg.count;
                    break;

                case 'full':
                    console.warn('[Network] Server is full (max 3 players)');
                    break;
            }
        } catch (e) {
            // Ignore parse errors
        }
    };

    ws.onclose = () => {
        connected = false;
        remotePlayers = [];
        console.log('[Network] Disconnected — reconnecting in 3s...');
        setTimeout(() => connect(url), 3000);
    };

    ws.onerror = () => {
        // onclose will fire after this
    };
}

/**
 * Send local truck state to the server (throttled to SEND_RATE Hz).
 */
export function sendState(truckGroup, speed) {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN) return;

    const now = performance.now();
    if (now - lastSendTime < SEND_INTERVAL) return;
    lastSendTime = now;

    ws.send(JSON.stringify({
        type: 'state',
        x: truckGroup.position.x,
        y: truckGroup.position.y,
        z: truckGroup.position.z,
        heading: truckGroup.rotation.y,
        speed: speed,
    }));
}

/**
 * Get the current list of remote players' states.
 */
export function getRemotePlayers() {
    return remotePlayers;
}

/**
 * Get the local player's assigned ID.
 */
export function getLocalId() {
    return localId;
}

/**
 * Get the current connected player count.
 */
export function getPlayerCount() {
    return playerCount;
}

/**
 * Check if connected to server.
 */
export function isConnected() {
    return connected;
}

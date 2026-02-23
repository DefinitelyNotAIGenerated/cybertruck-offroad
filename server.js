/* ─── Multiplayer WebSocket Server ─── */

import { WebSocketServer } from 'ws';

const PORT = 3001;
const MAX_PLAYERS = 3;

// Player colors sent to clients
const PLAYER_COLORS = [
    '#b0b0b0',  // Player 0: default gray (local color, won't be used for ghost)
    '#4dd9e8',  // Player 1: cyan
    '#e8944d',  // Player 2: orange
];

const players = new Map(); // ws → { id, state }
let nextId = 0;

const wss = new WebSocketServer({ port: PORT });

console.log(`[Multiplayer] WebSocket server listening on port ${PORT}`);

wss.on('connection', (ws) => {
    // Reject if full
    if (players.size >= MAX_PLAYERS) {
        ws.send(JSON.stringify({ type: 'full' }));
        ws.close();
        console.log('[Multiplayer] Connection rejected — server full');
        return;
    }

    // Assign ID
    const id = nextId++;
    const color = PLAYER_COLORS[id % PLAYER_COLORS.length];
    players.set(ws, { id, state: null });

    console.log(`[Multiplayer] Player ${id} connected (${players.size}/${MAX_PLAYERS})`);

    // Send welcome with ID and color
    ws.send(JSON.stringify({
        type: 'welcome',
        id,
        color,
        maxPlayers: MAX_PLAYERS,
    }));

    // Notify all others about the new player count
    broadcastPlayerList();

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'state') {
                const player = players.get(ws);
                if (player) {
                    player.state = {
                        id: player.id,
                        x: msg.x,
                        y: msg.y,
                        z: msg.z,
                        heading: msg.heading,
                        speed: msg.speed,
                    };
                }
                // Broadcast all player states to everyone
                broadcastStates();
            }
        } catch (e) {
            // Ignore malformed messages
        }
    });

    ws.on('close', () => {
        const player = players.get(ws);
        if (player) {
            console.log(`[Multiplayer] Player ${player.id} disconnected`);
            players.delete(ws);
            broadcastPlayerList();
        }
    });

    ws.on('error', () => {
        players.delete(ws);
    });
});

function broadcastStates() {
    const states = [];
    for (const [, player] of players) {
        if (player.state) {
            states.push(player.state);
        }
    }

    const msg = JSON.stringify({ type: 'states', players: states });

    for (const [ws] of players) {
        if (ws.readyState === ws.OPEN) {
            ws.send(msg);
        }
    }
}

function broadcastPlayerList() {
    const ids = [];
    for (const [, player] of players) {
        ids.push(player.id);
    }

    const msg = JSON.stringify({
        type: 'players',
        count: players.size,
        ids,
    });

    for (const [ws] of players) {
        if (ws.readyState === ws.OPEN) {
            ws.send(msg);
        }
    }
}

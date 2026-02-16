// =====================================================
// MULTIPLAYER SERVER - WebSocket game server stub
// =====================================================
// Usage: node server/index.js
// Serves the game on port 3000 and WebSocket on port 3001

import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT_HTTP = process.env.PORT || 3000;
const PORT_WS = process.env.WS_PORT || 3001;

// --- Simple static file server ---
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.woff2': 'font/woff2',
};

const STATIC_ROOT = path.resolve(__dirname, '../base/modular');

const httpServer = http.createServer((req, res) => {
    let filePath = path.join(STATIC_ROOT, req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

httpServer.listen(PORT_HTTP, () => {
    console.log(`[Server] Static files: http://localhost:${PORT_HTTP}`);
});

// --- WebSocket game server ---
const wss = new WebSocketServer({ port: PORT_WS });

let nextPlayerId = 1;
const players = new Map(); // ws → { id, position, rotation }

// Shared world seed — all players get the same seed so worlds match
let worldSeed = Math.floor(Math.random() * 0xFFFFFF);
console.log(`[Server] World seed: 0x${worldSeed.toString(16)}`);

wss.on('connection', (ws) => {
    const playerId = nextPlayerId++;
    const playerData = {
        id: playerId,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0
    };
    players.set(ws, playerData);

    // Send welcome with assigned ID and world seed
    ws.send(JSON.stringify({ type: 'welcome', id: playerId, seed: worldSeed, playerCount: players.size }));

    // Notify existing players about new player
    broadcast(ws, JSON.stringify({
        type: 'player_join',
        id: playerId,
        position: playerData.position,
        rotation: playerData.rotation
    }));

    // Send existing players to the new player
    for (const [otherWs, otherData] of players) {
        if (otherWs !== ws && otherWs.readyState === 1) {
            ws.send(JSON.stringify({
                type: 'player_join',
                id: otherData.id,
                position: otherData.position,
                rotation: otherData.rotation,
                inventory: otherData.inventory || null,
                selectedSlot: otherData.selectedSlot ?? null
            }));
        }
    }

    console.log(`[Server] Player ${playerId} connected (${players.size} total)`);

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw);
            switch (msg.type) {
                case 'player_state':
                    playerData.position = msg.position;
                    playerData.rotation = msg.rotation;
                    // Relay to other players
                    broadcast(ws, JSON.stringify({
                        type: 'player_state',
                        id: playerId,
                        position: msg.position,
                        rotation: msg.rotation,
                        isOnBoat: msg.isOnBoat,
                        activeAction: msg.activeAction
                    }));
                    break;

                case 'world_event':
                    // Relay world events to all OTHER players
                    broadcast(ws, JSON.stringify({
                        type: 'world_event',
                        playerId,
                        ...msg
                    }));
                    break;

                case 'inventory_update':
                    playerData.inventory = msg.inventory;
                    playerData.selectedSlot = msg.selectedSlot;
                    broadcast(ws, JSON.stringify({
                        type: 'inventory_update',
                        id: playerId,
                        inventory: msg.inventory,
                        selectedSlot: msg.selectedSlot
                    }));
                    break;

                case 'chat':
                    broadcast(null, JSON.stringify({
                        type: 'chat',
                        playerId,
                        text: msg.text
                    }));
                    break;
            }
        } catch (e) {
            console.warn('[Server] Bad message from player', playerId);
        }
    });

    ws.on('close', () => {
        players.delete(ws);
        broadcast(null, JSON.stringify({
            type: 'player_leave',
            id: playerId
        }));
        console.log(`[Server] Player ${playerId} disconnected (${players.size} total)`);
    });
});

/**
 * Broadcast a message to all connected players except `excludeWs`
 */
function broadcast(excludeWs, data) {
    for (const [ws] of players) {
        if (ws !== excludeWs && ws.readyState === 1) {
            ws.send(data);
        }
    }
}

console.log(`[Server] WebSocket server: ws://localhost:${PORT_WS}`);

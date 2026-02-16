# Multiplayer & Network System

## Overview

The multiplayer system enables real-time co-op gameplay via WebSockets. Players can:
- See each other as colored blocky characters
- See each other's movements in real-time
- Share world changes (tree chopping, rock mining)
- Chat (UI ready, server relay implemented)

---

## Architecture

### Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| NetworkManager | `js/network/NetworkManager.js` | WebSocket client |
| RemotePlayerManager | `js/network/RemotePlayerManager.js` | Render remote players |
| SeededRandom | `js/network/SeededRandom.js` | Deterministic PRNG |
| MessageProtocol | `js/network/MessageProtocol.js` | JSON encode/decode |
| Server | `server/index.js` | Node.js + ws server |

### Connection Flow

```
Client                    Server                    Other Clients
  |                          |                           |
  |--- connect() ---------->|                           |
  |<-- welcome (id, seed) --|                           |
  |                          |                           |
  |--- player_state ------->|                           |
  |                          |--- player_state --------->|
  |                          |                           |
  |                          |<-- player_state ---------|
  |<------------------------|                           |
```

---

## NetworkManager

**Location**: `base/modular/js/network/NetworkManager.js`

### Constructor

```javascript
constructor() {
    this.ws = null;
    this.connected = false;
    this.playerId = null;
    this.remotePlayers = new Map();
    
    // Callbacks (set by GameEngine)
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.onPlayerUpdate = null;
    this.onWorldEvent = null;
    this.onWelcome = null;
    
    this._sendQueue = [];
    this._lastSendTime = 0;
    this.SEND_RATE = 1000 / 20;  // 20 ticks/sec
    this.worldSeed = null;
}
```

### Connection

```javascript
connect(url) {
    return new Promise((resolve, reject) => {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        
        this.ws.onopen = () => {
            this.connected = true;
            console.log('[Network] Connected to', url);
            resolve();
        };
        
        this.ws.onmessage = (event) => {
            this._handleMessage(event.data);
        };
        
        this.ws.onclose = () => {
            this.connected = false;
            this.remotePlayers.clear();
            console.log('[Network] Disconnected');
        };
        
        this.ws.onerror = (err) => {
            console.error('[Network] Error', err);
            reject(err);
        };
    });
}
```

### Sending Player State

```javascript
sendPlayerState(state) {
    if (!this.connected) return;
    
    // Rate limit to 20 ticks/sec
    const now = performance.now();
    if (now - this._lastSendTime < this.SEND_RATE) return;
    this._lastSendTime = now;
    
    this._send(MessageProtocol.encode({
        type: 'player_state',
        position: {
            x: state.player.pos.x,
            y: state.player.pos.y,
            z: state.player.pos.z
        },
        rotation: state.player.targetRotation || 0,
        isOnBoat: state.isOnBoat,
        activeAction: state.isChopping ? 'chop' : 
                      state.isMining ? 'mine' : null
    }));
}
```

### Broadcasting World Events

```javascript
sendWorldEvent(event) {
    if (!this.connected) return;
    
    this._send(MessageProtocol.encode({
        type: 'world_event',
        ...event
    }));
}
```

### Message Handling

```javascript
_handleMessage(raw) {
    const msg = MessageProtocol.decode(raw);
    if (!msg) return;
    
    switch (msg.type) {
        case 'welcome':
            this.playerId = msg.id;
            this.worldSeed = msg.seed || null;
            if (this.onWelcome) this.onWelcome(msg);
            break;
            
        case 'player_join':
            this.remotePlayers.set(msg.id, {
                position: msg.position,
                rotation: msg.rotation
            });
            if (this.onPlayerJoin) this.onPlayerJoin(msg.id, msg);
            break;
            
        case 'player_leave':
            this.remotePlayers.delete(msg.id);
            if (this.onPlayerLeave) this.onPlayerLeave(msg.id);
            break;
            
        case 'player_state':
            if (this.remotePlayers.has(msg.id)) {
                const remote = this.remotePlayers.get(msg.id);
                remote.position = msg.position;
                remote.rotation = msg.rotation;
                remote.isOnBoat = msg.isOnBoat;
                remote.activeAction = msg.activeAction;
            }
            if (this.onPlayerUpdate) this.onPlayerUpdate(msg.id, msg);
            break;
            
        case 'world_event':
            if (this.onWorldEvent) this.onWorldEvent(msg);
            break;
    }
}
```

---

## RemotePlayerManager

**Location**: `base/modular/js/network/RemotePlayerManager.js`

### Responsibilities

- Create 3D models for remote players
- Interpolate position/rotation
- Update nametags

### Player Colors

```javascript
_playerColors(id) {
    const COLORS = [
        { body: 0xe74c3c, limb: 0xc0392b },  // red
        { body: 0x3498db, limb: 0x2980b9 },  // blue
        { body: 0x2ecc71, limb: 0x27ae60 },  // green
        { body: 0xf39c12, limb: 0xe67e22 },  // orange
        { body: 0x9b59b6, limb: 0x8e44ad },  // purple
        { body: 0x1abc9c, limb: 0x16a085 },  // teal
        { body: 0xe91e63, limb: 0xc2185b },  // pink
        { body: 0x00bcd4, limb: 0x0097a7 },  // cyan
    ];
    return COLORS[(id - 1) % COLORS.length];
}
```

### Model Creation

The remote player model matches the local `PlayerController` model structure:

```
group (THREE.Group)
  └── pivot (THREE.Group) - scaled 0.6x
        ├── torso (BoxGeometry)
        ├── head (BoxGeometry)
        ├── eyeL + pupil
        ├── eyeR + pupil
        ├── legL
        ├── legR
        ├── armL
        └── armR
  └── sprite (nametag)
```

### Adding Players

```javascript
addPlayer(id, data) {
    if (this.players.has(id)) return;
    
    const model = this._buildModel(id);
    const pos = data.position || { x: 0, y: 0, z: 0 };
    model.group.position.set(pos.x, pos.y, pos.z);
    
    this.world.add(model.group);
    
    this.players.set(id, {
        ...model,
        targetPos: new THREE.Vector3(pos.x, pos.y, pos.z),
        currentPos: new THREE.Vector3(pos.x, pos.y, pos.z),
        targetRot: data.rotation || 0,
        currentRot: data.rotation || 0,
        time: 0,
        isOnBoat: false,
        activeAction: null
    });
}
```

### Update (Interpolation)

```javascript
update(dt) {
    for (const [id, p] of this.players) {
        p.time += dt;
        
        // Interpolate position
        p.currentPos.lerp(p.targetPos, 0.1);
        p.group.position.copy(p.currentPos);
        
        // Interpolate rotation
        p.currentRot += (p.targetRot - p.currentRot) * 0.1;
        if (p.pivot) {
            const targetQ = new THREE.Quaternion();
            targetQ.setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), 
                p.currentRot
            );
            p.pivot.quaternion.slerp(targetQ, 0.15);
        }
        
        // Animate limbs
        const walkCycle = p.time * 10;
        const isMoving = p.currentPos.distanceTo(p.targetPos) > 0.01;
        
        if (isMoving) {
            p.legL.rotation.x = Math.sin(walkCycle) * 0.8;
            p.legR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.8;
            p.armL.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
            p.armR.rotation.x = Math.sin(walkCycle) * 0.5;
        }
    }
}
```

---

## SeededRandom

**Location**: `base/modular/js/network/SeededRandom.js`

### Purpose

Provides deterministic random number generation so all clients generate the same world from the server-provided seed.

### Algorithm

Uses the **mulberry32** PRNG:

```javascript
export default class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    
    // mulberry32 PRNG
    random() {
        let t = this.seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    
    // Override Math.random temporarily
    override() {
        const originalRandom = Math.random;
        const sr = this;
        
        Math.random = function() {
            return sr.random();
        };
        
        return {
            restore: () => {
                Math.random = originalRandom;
            }
        };
    }
}
```

### Usage in GameEngine

```javascript
// In initGame()
if (this.network && this.network.worldSeed !== null) {
    const seededOverride = new SeededRandom(this.network.worldSeed).override();
}

// ... generate world with Math.random() ...

// Restore
if (seededOverride) seededOverride.restore();
```

---

## MessageProtocol

**Location**: `base/modular/js/network/MessageProtocol.js`

### Encoding/Decoding

```javascript
export default {
    encode(msg) {
        return JSON.stringify(msg);
    },
    
    decode(data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn('Failed to parse message:', data);
            return null;
        }
    }
};
```

---

## Server

**Location**: `server/index.js`

### HTTP Server

Serves static files from `base/modular`:

```javascript
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

httpServer.listen(3000);
```

### WebSocket Server

```javascript
const wss = new WebSocketServer({ port: 3001 });

let nextPlayerId = 1;
const players = new Map();
let worldSeed = Math.floor(Math.random() * 0xFFFFFF);

wss.on('connection', (ws) => {
    const playerId = nextPlayerId++;
    const playerData = { id: playerId, position: {x:0,y:0,z:0}, rotation: 0 };
    players.set(ws, playerData);
    
    // Send welcome with ID and seed
    ws.send(JSON.stringify({ 
        type: 'welcome', 
        id: playerId, 
        seed: worldSeed,
        playerCount: players.size 
    }));
    
    // Notify others
    broadcast(ws, JSON.stringify({
        type: 'player_join',
        id: playerId,
        position: playerData.position,
        rotation: playerData.rotation
    }));
    
    // Handle messages
    ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        
        switch (msg.type) {
            case 'player_state':
                playerData.position = msg.position;
                playerData.rotation = msg.rotation;
                // Relay to others
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
                broadcast(ws, JSON.stringify({
                    type: 'world_event',
                    playerId,
                    ...msg
                }));
                break;
        }
    });
    
    ws.on('close', () => {
        players.delete(ws);
        broadcast(null, JSON.stringify({
            type: 'player_leave',
            id: playerId
        }));
    });
});
```

### Broadcast Function

```javascript
function broadcast(excludeWs, data) {
    for (const [ws] of players) {
        if (ws !== excludeWs && ws.readyState === 1) {
            ws.send(data);
        }
    }
}
```

---

## World Event Handling

### Client-Side

```javascript
// In GameEngine._handleRemoteWorldEvent()
_handleRemoteWorldEvent(event) {
    switch (event.action) {
        case 'tree_chopped': {
            const idx = this.state.entities.findIndex(e =>
                e.userData.type === 'tree' &&
                Math.abs(e.position.x - event.x) < 1 &&
                Math.abs(e.position.z - event.z) < 1
            );
            if (idx !== -1) {
                const tree = this.state.entities[idx];
                this.world.scene.remove(tree);
                this.state.entities.splice(idx, 1);
            }
            break;
        }
        case 'rock_mined': {
            // Similar logic for rocks
        }
    }
}
```

### Broadcast Trigger

In `ChopSystem` and `MineSystem`:

```javascript
// After destroying entity
if (broadcastWorldEvent) {
    broadcastWorldEvent('tree_chopped', tree.position.x, tree.position.z);
}
```

---

## GameEngine Integration

### Setup

```javascript
// In GameEngine constructor
this.network = new NetworkManager();
this.remotePlayers = new RemotePlayerManager(this.world);
this._setupNetworkCallbacks();
```

### Callbacks

```javascript
_setupNetworkCallbacks() {
    this.network.onPlayerJoin = (id, data) => {
        this.remotePlayers.addPlayer(id, data);
        this._showMultiplayerToast(`Player ${id} joined`);
    };
    
    this.network.onPlayerLeave = (id) => {
        this.remotePlayers.removePlayer(id);
        this._showMultiplayerToast(`Player ${id} left`);
    };
    
    this.network.onPlayerUpdate = (id, data) => {
        this.remotePlayers.updatePlayer(id, data);
    };
    
    this.network.onWorldEvent = (event) => {
        this._handleRemoteWorldEvent(event);
    };
}
```

### Connect/Disconnect

```javascript
async connectMultiplayer(url) {
    if (this.network.connected) return;
    
    await this.network.connect(url);
    this._showMultiplayerToast(`Connected as Player ${this.network.playerId}`);
    
    // Update UI
    mpBtn.textContent = 'DISCONNECT';
    mpBtn.classList.add('connected');
}

disconnectMultiplayer() {
    this.network.disconnect();
    this.remotePlayers.clear();
    
    // Reset UI
    mpBtn.textContent = 'CONNECT';
    mpBtn.classList.remove('connected');
}
```

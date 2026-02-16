# Architecture

## High-Level Architecture

Island Survival follows a **component-based architecture** where `GameEngine` acts as the central orchestrator. The game is decomposed into:

1. **Core Classes** - Managers for rendering, audio, input, state
2. **Game Systems** - Extracted behaviors (boat, chopping, mining, AI)
3. **Network Layer** - Multiplayer synchronization
4. **Services** - LLM integration (stub)

## Dependency Graph

```
main.js (9 lines)
  └── GameEngine
        │
        ├── AudioManager
        ├── GameState
        ├── WorldManager (Three.js)
        ├── EntityFactory → WorldManager, GameState
        ├── PlayerController → WorldManager, GameState
        ├── InputHandler → GameEngine (circular)
        ├── ChatManager → LLMService
        │
        ├── Systems (registered in SystemManager)
        │   ├── BoatSystem → GameState, WorldManager, AudioManager, PlayerController
        │   ├── ChopSystem → GameState, WorldManager, AudioManager, EntityFactory
        │   ├── MineSystem → GameState, WorldManager, AudioManager
        │   ├── InventoryManager → GameState, AudioManager
        │   ├── EntityAISystem → GameState, WorldManager, AudioManager, EntityFactory
        │   ├── CatAI → GameState
        │   └── ParticleSystem → GameState, WorldManager
        │
        └── Network
              ├── NetworkManager
              ├── RemotePlayerManager → WorldManager
              ├── SeededRandom
              └── MessageProtocol
```

## Core Flow

### Initialization (main.js → GameEngine)

```javascript
// main.js:9
const game = new GameEngine();
```

```javascript
// GameEngine constructor (lines 30-76)
1. Create AudioManager, GameState, WorldManager
2. Create EntityFactory, PlayerController
3. Create all Systems (BoatSystem, ChopSystem, MineSystem, etc.)
4. Register systems in SystemManager
5. Create NetworkManager, RemotePlayerManager
6. Create InputHandler, ChatManager
7. Call initGame(null) → generates world
8. Bind animate() and start loop
```

### Game Loop (GameEngine.animate, lines 683-766)

The `animate()` method runs every frame via `requestAnimationFrame`:

```javascript
animate(t) {
    // 1. Calculate delta time (capped at 50ms)
    dt = min(t - _lastTime, 0.05)
    
    // 2. If phase === 'playing':
    //    a. Water animation (islandGroups)
    //    b. Boat/log bob animation
    //    c. Cloud drift
    //    d. SystemManager.update(dt, context) → ALL SYSTEMS
    //    e. Entity AI updates
    //    f. Cat AI updates
    //    g. Particle updates
    //    h. Multiplayer: send state, interpolate remotes
    
    // 3. Render scene
    world.render()
}
```

### System Update Order

The `SystemManager.update()` calls each system in registration order:

1. **BoatSystem** - Boarding animation, physics, cat boarding, proximity check
2. **PlayerController** - Movement (if not on boat)
3. **ChopSystem** - Tree chopping
4. **MineSystem** - Rock mining
5. **InventoryManager** - Auto-pickup
6. **EntityAISystem** - Creatures, golem, eggs, food
7. **CatAI** - Companion follow
8. **ParticleSystem** - Particles & debris

## Context Object

All systems receive a shared `context` object:

```javascript
const ctx = {
    state,           // GameState instance
    world,           // WorldManager instance
    audio,           // AudioManager instance
    factory,         // EntityFactory instance
    camera,          // Three.js camera
    playerController, // PlayerController instance
    playerCat,       // Cat entity
    t,               // Current time (seconds)
    broadcastWorldEvent // Function to send events to other players
};
```

This allows systems to access any game state without tight coupling.

## Multiplayer Architecture

### Client-Side

```
NetworkManager
  ├── WebSocket connection (ws://localhost:3001)
  ├── Sends: player_state (20 ticks/sec), world_event
  ├── Receives: welcome, player_join, player_state, world_event, player_leave
  └── Callbacks: onPlayerJoin, onPlayerLeave, onPlayerUpdate, onWorldEvent

RemotePlayerManager
  ├── Maintains Map<id, playerModel>
  ├── Creates blocky character models matching local player
  ├── Interpolates position/rotation each frame
  └── Updates nametags
```

### Server-Side

```
Node.js + ws WebSocketServer
  ├── Serves static files (base/modular) on :3000
  ├── WebSocket on :3001
  ├── Assigns unique player IDs
  ├── Generates and shares world seed (all clients use same seed)
  ├── Relays player_state to all other clients
  ├── Relays world_event (tree_chopped, rock_mined) to all clients
  └── Broadcasts join/leave events
```

### Seed Synchronization

The server generates `worldSeed = random * 0xFFFFFF` on startup. All clients receive this seed and use `SeededRandom` (mulberry32 PRNG) to produce identical island layouts.

## Rendering Pipeline

1. **WorldManager** creates Three.js scene, camera, renderer at 0.5x resolution
2. **EntityFactory** creates all meshes (trees, rocks, creatures, islands)
3. **GameEngine.animate** updates all systems
4. **WorldManager.render** calls `renderer.render(scene, camera)`

## State Management

**GameState** is the single source of truth:

```javascript
{
    phase: 'loading' | 'playing',
    palette: { background, baseRock, trunk, soil, groundTop, flora, creature, accent },
    worldDNA: { tree, bush, rock, creature, grass },
    inventory: Array(8),  // slot items
    selectedSlot: number | null,
    entities: [],        // all interactive entities
    foods: [],           // food items
    particles: [],       // visual particles
    debris: [],          // exploding debris
    obstacles: [],       // collision bodies
    
    player: { pos, vel, speed, onGround, targetRotation, cameraAngle, cameraMode },
    inputs: { w, a, s, d, space },
    
    islands: [{ center, radius, floorY, name }],
    
    // Interaction
    interactionTarget: Entity | null,
    chopProgress: number,
    isChopping: boolean,
    isMining: boolean,
    
    // Tools
    heldAxe: Entity | null,
    heldPickaxe: Entity | null,
    
    // Boat
    isOnBoat: boolean,
    activeBoat: Entity | null,
    boatSpeed: number,
    boatRotation: number,
    isBoardingBoat: boolean,
    boardingPhase: number,
    
    // Cat
    catOnBoat: boolean,
    catBoarding: boolean,
    catBoardingQueued: boolean
}
```

## Extension Points

To add new features:

1. **New Entity**: Add creator in `EntityFactory.js`
2. **New System**: Create class with `update(dt, context)` method, register in `GameEngine`
3. **New NPC**: Add in `EntityFactory`, add interaction in `InputHandler.handlePickup()`
4. **New Audio**: Add method in `AudioManager.js` using oscillator
5. **New Network Event**: Add case in `NetworkManager._handleMessage()` and server switch

## File Responsibilities

| File | Responsibility |
|------|----------------|
| `main.js` | Entry point |
| `GameEngine.js` | Orchestration, loop, UI setup |
| `GameState.js` | State container |
| `WorldManager.js` | Three.js setup, rendering |
| `PlayerController.js` | Character model, movement, camera |
| `InputHandler.js` | Input processing, raycasting |
| `EntityFactory.js` | Procedural mesh creation |
| `AudioManager.js` | Sound synthesis |
| `ChatManager.js` | NPC chat UI |
| `SystemManager.js` | System orchestration |
| `[System].js` | Specific game mechanics |
| `NetworkManager.js` | WebSocket client |
| `RemotePlayerManager.js` | Remote player rendering |
| `server/index.js` | HTTP + WebSocket server |

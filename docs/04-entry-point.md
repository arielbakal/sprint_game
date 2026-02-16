# Entry Point & Game Loop

## main.js - Bootstrap

**Location**: `base/modular/js/main.js`

**Purpose**: Minimal entry point that instantiates the GameEngine.

```javascript
// =====================================================
// POCKET TERRARIUM - MAIN ENTRY POINT
// =====================================================

import GameEngine from './classes/GameEngine.js';

// Initialize the game
const game = new GameEngine();
```

This is the **only** code that runs in the global scope. All subsequent initialization happens inside the `GameEngine` constructor.

---

## GameEngine - Main Orchestrator

**Location**: `base/modular/js/classes/GameEngine.js`

### Constructor Flow (lines 30-76)

```javascript
constructor() {
    // 1. Create core managers
    this.audio = new AudioManager();
    this.state = new GameState();
    this.world = new WorldManager(0.5);  // 0.5 = render scale
    
    // 2. Create factory and controller
    this.factory = new EntityFactory(this.world, this.state);
    this.playerController = new PlayerController(this.world, this.state);
    
    // 3. Initialize arrays
    this.islandGroups = [];
    this.groundPlanes = [];
    this.logs = [];
    this.clouds = [];
    
    // 4. Setup UI references
    this.setupUI();
    
    // 5. Create all game systems
    this.systems = new SystemManager();
    this.boatSystem = new BoatSystem(this.ui);
    this.chopSystem = new ChopSystem(this.ui);
    this.mineSystem = new MineSystem(this.ui);
    this.inventorySystem = new InventoryManager(this.state, this.audio, this.ui);
    this.entityAISystem = new EntityAISystem();
    this.catAI = new CatAI();
    this.particleSystem = new ParticleSystem();
    
    // 6. Register systems
    this.systems.register('boat', this.boatSystem);
    this.systems.register('chop', this.chopSystem);
    this.systems.register('mine', this.mineSystem);
    this.systems.register('inventory', this.inventorySystem);
    this.systems.register('entityAI', this.entityAISystem);
    this.systems.register('catAI', this.catAI);
    this.systems.register('particles', this.particleSystem);
    
    // 7. Setup multiplayer
    this.network = new NetworkManager();
    this.remotePlayers = new RemotePlayerManager(this.world);
    this._setupNetworkCallbacks();
    
    // 8. Create input and chat
    this.chatManager = new ChatManager(this);
    this.input = new InputHandler(this);
    this.setupButtons();
    
    // 9. Initialize game world
    this.initGame(null);
    
    // 10. Start game loop
    this.animate = this.animate.bind(this);
    this.animate(0);
    
    // 11. Handle resize
    window.onresize = () => this.world.resize();
}
```

---

## initGame() - World Generation

**Location**: `base/modular/js/classes/GameEngine.js`, lines 248-495

This method generates the entire game world from scratch:

### Step 1: Palette & DNA Generation

```javascript
// Use server seed if available (multiplayer world sync)
let seededOverride = null;
if (this.network && this.network.worldSeed !== null) {
    seededOverride = new SeededRandom(this.network.worldSeed).override();
}

this.state.phase = 'playing';
this.state.palette = this.factory.generatePalette(sphereColor);
this.state.worldDNA = this.factory.generateWorldDNA();
```

### Step 2: Island 1 - Starting Shore

```javascript
const island1 = this.factory.createIslandAt(this.state.palette, 0, 0, 12, true);
// hasWater=true → water plane rendered

// Add entities:
- 14 trees (choppable)
- 7 bushes (produce food)
- 5 rocks
- 30 grass
- 8 flowers
- 3 creatures (with island bounds)
- 1 Chief Ruru NPC
- 1 Axe tool
```

### Step 3: Island 2 - Flora Haven

```javascript
const island2 = this.factory.createIslandAt(palette2, 80, 0, 14, false);
// hasWater=false

// Add:
- 18 trees
- 12 bushes
- 4 rocks
- 20 grass
- 6 flowers
- 1 Pickaxe tool
- 3 creatures
```

### Step 4: Island 3 - Ancient Peaks

```javascript
const island3 = this.factory.createIslandAt(palette3, 0, 110, 28, false);

// Add:
- 1 Mountain (climbable, 15.0 radius, 18.0 height)
- 1 Stone Golem NPC
- 8 big rocks (3x scale)
- 12 gold rocks (in ring formation)
- 10 trees
- 40 grass
- 12 flowers
```

### Step 5: Island 4 - Rocky Outpost

```javascript
const island4 = this.factory.createIslandAt(palette4, -90, -50, 11, false);

// Add:
- 4 trees
- 3 bushes
- 3 rocks
- 12 grass
- 4 flowers
- 2 creatures
```

### Step 6: Island 5 - Distant Shores

```javascript
const island5 = this.factory.createIslandAt(palette5, 50, -100, 13, false);

// Add:
- 5 trees
- 4 bushes
- 4 rocks
- 18 grass
- 5 flowers
- 3 creatures
```

### Step 7: Clouds

```javascript
for (let i = 0; i < 40; i++) {
    const cloud = this.factory.createCloud(
        random(-150, 150), 
        random(15, 30), 
        random(-150, 150)
    );
}
```

### Step 8: Player Spawn

```javascript
this.state.player.pos.set(0, O_Y + 2, 0);
this.state.player.vel.set(0, 0, 0);
this.state.player.onGround = false;
this.state.player.cameraAngle = { x: 0, y: 0.3 };
this.playerController.createModel(this.state.palette);

// Spawn companion cat
this.playerCat = this.factory.createCat(1.5, 1.5);
```

### Step 9: Audio

```javascript
if (!this.state.musicStarted) {
    this.audio.startMusic(this.state.worldDNA, ...);
    this.state.musicStarted = true;
}

// Restore Math.random after seeded generation
if (seededOverride) seededOverride.restore();
```

---

## animate() - Game Loop

**Location**: `base/modular/js/classes/GameEngine.js`, lines 683-766

```javascript
animate(t) {
    requestAnimationFrame(this.animate);
    
    // Convert time to seconds
    t *= 0.001;
    
    // Calculate delta time (capped at 50ms to prevent huge jumps)
    if (!this._lastTime) this._lastTime = t;
    const dt = Math.min(t - this._lastTime, 0.05);
    this._lastTime = t;
    
    if (state.phase === 'playing') {
        // === ANIMATIONS ===
        
        // 1. Water animation (rotation + bobbing)
        this.islandGroups.forEach(ig => {
            const water = ig.group.children.find(c => c.userData.type === 'water');
            if (water) {
                water.rotation.z += 0.001;
                water.position.y = -2.0 + Math.sin(t * 0.5) * 0.15;
            }
        });
        
        // 2. Boat/log bob animation
        state.entities.forEach(e => {
            if (e.userData.type === 'boat' && e !== state.activeBoat) {
                e.position.y = Math.sin(t * 1.5 + e.position.x) * 0.1;
                e.rotation.z = Math.sin(t * 0.8 + e.position.z) * 0.02;
            }
            if (e.userData.type === 'log' && !e.userData.onLand) {
                e.position.y = Math.sin(t * 2 + e.position.x * 0.5) * 0.08 - 0.1;
                e.rotation.z = Math.PI / 2 + Math.sin(t * 1.2 + e.position.z) * 0.05;
            }
        });
        
        // 3. Cloud drift
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * dt;
            if (cloud.position.x > 200) {
                cloud.position.x = -200;  // Wrap around
            }
        });
        
        // === BUILD CONTEXT ===
        const ctx = {
            state,
            world: this.world,
            audio: this.audio,
            factory: this.factory,
            camera,
            playerController: this.playerController,
            playerCat: this.playerCat,
            t,
            broadcastWorldEvent: (action, x, z) => this.broadcastWorldEvent(action, x, z)
        };
        
        // === SYSTEMS ===
        this.boatSystem.update(dt, ctx);
        
        // Player movement (when not on boat or boarding)
        if (state.isOnBoat) {
            // Boat system handles everything
        } else if (!state.isBoardingBoat) {
            this.playerController.update(dt, state.islands);
            this.playerController.updateCamera(camera);
            this.input.updateInteraction();
            this.chopSystem.update(dt, ctx);
            this.mineSystem.update(dt, ctx);
            this.inventorySystem.update(dt, ctx);
        }
        
        this.updateIslandIndicator();
        
        // Entity AI
        this.entityAISystem.update(dt, ctx);
        
        // Cat AI
        this.catAI.update(dt, ctx);
        
        // Particles
        this.particleSystem.update(dt, ctx);
        
        // === MULTIPLAYER ===
        this.network.sendPlayerState(state);
        this.remotePlayers.update(dt);
    }
    
    // === RENDER ===
    this.world.render();
}
```

---

## Key Timing Values

| Property | Value | Description |
|----------|-------|-------------|
| `dt` cap | 0.05s | Maximum delta time (50ms) prevents spiral of death |
| Target FPS | 60 | Via requestAnimationFrame |
| Water rotation | 0.001/frame | ~0.06 rad/sec at 60fps |
| Water bob | sin(t * 0.5) * 0.15 | 2-second period |
| Cloud wrap | ±200 | X position wraps at boundaries |

---

## resetWorld() - World Reset

**Location**: `base/modular/js/classes/GameEngine.js`, lines 199-246

Called when player clicks "New World" button:

1. Play explosion sound
2. Flash white overlay
3. Convert all entities to debris (exploding = true)
4. Add velocity/rotation to debris
5. Remove all islands from scene
6. Clear arrays (entities, foods, obstacles, islands, logs)
7. Reset player/boat state
8. Call `initGame(null)` after 800ms delay

---

## Initialization Sequence Diagram

```
main.js
  │
  ▼
new GameEngine()
  │
  ├── new AudioManager()
  ├── new GameState()
  ├── new WorldManager(0.5)
  ├── new EntityFactory()
  ├── new PlayerController()
  │
  ├── Create Systems
  │   ├── new BoatSystem()
  │   ├── new ChopSystem()
  │   ├── new MineSystem()
  │   ├── new InventoryManager()
  │   ├── new EntityAISystem()
  │   ├── new CatAI()
  │   └── new ParticleSystem()
  │
  ├── Register Systems in SystemManager
  │
  ├── new NetworkManager()
  ├── new RemotePlayerManager()
  │
  ├── new InputHandler()
  ├── new ChatManager()
  │
  ├── setupUI() → cache DOM references
  ├── setupButtons() → event listeners
  │
  ├── initGame(null)
  │   ├── generatePalette()
  │   ├── generateWorldDNA()
  │   ├── createIslandAt() × 5
  │   ├── createTree() × 57
  │   ├── createBush() × ...
  │   ├── createRock() × ...
  │   ├── createCreature() × 13
  │   ├── createChief()
  │   ├── createStoneGolem()
  │   ├── createMountain()
  │   ├── createCloud() × 40
  │   ├── createAxe()
  │   ├── createPickaxe()
  │   ├── createCat()
  │   └── playerController.createModel()
  │
  ├── animate = animate.bind(this)
  ├── animate(0) → starts loop
  │
  └── window.onresize = () => world.resize()
```

# Data Models

## GameState

The `GameState` class (`js/classes/GameState.js`) is the central container for all mutable game state. It holds the complete snapshot of the game at any moment.

### Class Structure

```javascript
export default class GameState {
    constructor() {
        this.reset();
    }
    
    reset() {
        // Phase
        this.phase = 'loading';
        
        // World generation
        this.palette = null;
        this.worldDNA = null;
        
        // Inventory
        this.inventory = new Array(8).fill(null);
        this.selectedSlot = null;
        
        // Entities
        this.entities = [];      // All interactive entities (trees, rocks, creatures, NPCs)
        this.foods = [];         // Food items spawned by trees/bushes
        this.particles = [];     // Visual particles
        this.debris = [];        // Exploding debris (on reset)
        this.obstacles = [];     // Collision bodies (trees, rocks, mountains)
        
        // Audio
        this.musicStarted = false;
        
        // Player
        this.player = {
            pos: new THREE.Vector3(0, 0, 0),
            vel: new THREE.Vector3(0, 0, 0),
            speed: 0.12,
            onGround: false,
            targetRotation: 0,
            cameraAngle: { x: 0, y: 0.3 },  // x=horizontal orbit, y=vertical orbit
            cameraMode: 'third'               // 'third' or 'first'
        };
        
        // Input state
        this.inputs = { w: false, a: false, s: false, d: false, space: false };
        this.sensitivity = 0.002;
        
        // Islands
        this.islands = [];
        this.lastIslandName = null;
        
        // Resources
        this.resources = { logs: 0 };
        
        // Interaction
        this.interactionTarget = null;  // Entity currently highlighted
        this.chopProgress = 0;          // Hits on current tree (0-5)
        this.isChopping = false;        // Holding click on tree
        this.chopTimer = 0;            // Time since last chop hit
        
        this.isMining = false;
        this.mineProgress = 0;
        this.mineTimer = 0;
        
        this.lastInteractTime = 0;
        
        // Tools
        this.heldAxe = null;
        this.heldPickaxe = null;
        
        // Mouse
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Boat navigation
        this.isOnBoat = false;
        this.activeBoat = null;
        this.boatSpeed = 0;
        this.boatMaxSpeed = 0.12;
        this.boatRotation = 0;
        
        // Boarding animation
        this.isBoardingBoat = false;
        this.boardingPhase = 0;        // 0=walk-to, 1=hop-up, 2=settle
        this.boardingProgress = 0;      // 0..1 within each phase
        this.boardingStartPos = null;
        this.boardingTargetBoat = null;
        
        // Cat boarding
        this.catBoarding = false;
        this.catBoardingPhase = 0;
        this.catBoardingProgress = 0;
        this.catBoardingStartPos = null;
        this.catOnBoat = false;
        this.catBoardingQueued = false;
        this.catBoardingDelay = 0;
    }
}
```

## Palette

The `palette` object defines the color scheme for a world session. Generated in `EntityFactory.generatePalette()`:

```javascript
{
    background: THREE.Color,  // Sky/water color (HSL-based)
    baseRock: THREE.Color,    // Dark rock color
    trunk: THREE.Color,       // Tree trunk color
    soil: THREE.Color,        // Soil/dirt color
    groundTop: THREE.Color,   // Grass surface color
    flora: THREE.Color,       // Foliage color (trees, bushes)
    tallGrass: THREE.Color,   // Tall grass color
    creature: THREE.Color,    // Creature body color
    accent: THREE.Color       // Accent color (food, UI highlights)
}
```

### Generation Algorithm

1. Random hue from `Math.random()` (or forced for special palettes like 'blue')
2. Colors derived using HSL with varying saturation/lightness
3. Each island gets its own palette (islands 2-5 use `generatePalette(null)` for random)

## WorldDNA

The `worldDNA` object defines the procedural shapes for entities. Generated in `EntityFactory.generateWorldDNA()`:

```javascript
{
    tree: {
        shape: 'cone' | 'box' | 'round' | 'cylinder',
        heightMod: 1.2 + Math.random() * 1.0,
        thickMod: 0.6 + Math.random()
    },
    bush: {
        shape: 'sphere' | 'cone',
        scaleY: 0.7 + Math.random() * 0.5
    },
    rock: {
        shape: 'ico' | 'box' | 'dodec' | 'slab',
        stretch: 0.8 + Math.random() * 0.8
    },
    creature: {
        shape: 'box' | 'sphere',
        eyes: 1 | 2 | 3,
        scale: 0.9 + Math.random() * 0.5,
        eyeScale: 1.0 + Math.random() * 0.6
    },
    grass: {
        height: 0.3 + Math.random() * 0.5
    }
}
```

### Eye Count Logic

```javascript
const eyeRoll = Math.random();
const eyeCount = eyeRoll < 0.1 ? 1 :   // 10% chance: 1 eye
                 eyeRoll < 0.2 ? 3 :   // 10% chance: 3 eyes
                 2;                     // 80% chance: 2 eyes
```

## Inventory Item Structure

```javascript
{
    type: string,      // 'tree', 'bush', 'rock', 'grass', 'flower', 'wood', 'food', 'axe', 'creature', 'egg'
    color: THREE.Color,
    style: Object,     // DNA/style data (for creatures, eggs)
    age: number,       // Age in seconds (for creatures)
    count: number      // Stack count (default 1)
}
```

### Stackable vs Non-Stackable

```javascript
const NON_STACKABLE_TYPES = ['creature', 'egg'];
```

- **Stackable**: Items with same `type` AND same `color.getHex()` stack
- **Non-stackable**: Each creature/egg takes a unique slot

## Entity userData

Entities created by `EntityFactory` have `userData` objects storing type-specific data:

### Tree
```javascript
{
    type: 'tree',
    radius: 0.6,
    style: Object,           // DNA from generation
    color: THREE.Color,      // Foliage color
    productionTimer: number, // Time until next food spawn
    health: 5,
    choppable: true
}
```

### Creature
```javascript
{
    type: 'creature',
    radius: 0.5,
    hunger: number,           // Increases at 0.1/sec
    age: number,
    eatenCount: number,      // Foods eaten (triggers breeding at 3)
    moveSpeed: 0.03,
    hopOffset: number,       // Random for animation desync
    color: THREE.Color,
    bubble: Sprite|null,     // Hunger warning bubble
    style: Object,           // DNA
    targetScale: number,
    cooldown: number,
    boundCenter: { x, z },   // Island center for AI
    boundRadius: number      // Island radius for AI
}
```

### Boat
```javascript
{
    type: 'boat',
    color: THREE.Color,
    radius: 2.5
}
```

### Tool (Axe/Pickaxe)
```javascript
{
    type: 'axe' | 'pickaxe',
    color: null
}
```

## Island Structure

```javascript
{
    center: THREE.Vector3,  // (x, 0, z) position
    radius: number,         // Island radius
    floorY: number,         // Ground Y position (O_Y + 0.05)
    name: string            // 'STARTING SHORE', 'FLORA HAVEN', etc.
}
```

## Network Protocol

### Client → Server Messages

```javascript
// Player state (20 ticks/sec)
{ type: 'player_state', position: {x, y, z}, rotation, isOnBoat, activeAction }

// World event
{ type: 'world_event', action: 'tree_chopped'|'rock_mined', x, z }
```

### Server → Client Messages

```javascript
// Welcome with ID and seed
{ type: 'welcome', id: number, seed: number, playerCount: number }

// Player joined
{ type: 'player_join', id, position, rotation }

// Player state update
{ type: 'player_state', id, position, rotation, isOnBoat, activeAction }

// World event
{ type: 'world_event', action, x, z }

// Player left
{ type: 'player_leave', id }
```

## Player State (Network)

```javascript
{
    position: { x: number, y: number, z: number },
    rotation: number,         // Y rotation in radians
    isOnBoat: boolean,
    activeAction: 'chop' | 'mine' | null
}
```

## Remote Player Model

```javascript
{
    group: THREE.Group,        // Root group
    pivot: THREE.Group,        // Rotates to face movement
    legL, legR, armL, armR: THREE.Mesh,
    targetPos: THREE.Vector3, // Interpolation target
    currentPos: THREE.Vector3,
    targetRot: number,
    currentRot: number,
    time: number,              // Animation time
    isOnBoat: boolean,
    activeAction: string|null
}
```

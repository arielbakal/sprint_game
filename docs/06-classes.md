# Core Classes

## Overview

The core classes form the foundation of the game engine. Each class has a specific responsibility:

| Class | Responsibility |
|-------|---------------|
| `PlayerController` | Character model, movement, camera |
| `EntityFactory` | Procedural mesh creation |
| `WorldManager` | Three.js scene, camera, renderer |
| `GameState` | State container |
| `AudioManager` | Sound synthesis |
| `ChatManager` | NPC chat UI |

---

## PlayerController

**Location**: `base/modular/js/classes/PlayerController.js`

### Responsibilities

- Create and manage the blocky player character model
- Handle third-person and first-person camera
- Process camera-relative movement (WASD)
- Handle physics (gravity, jumping, collisions)
- Procedural walk/chop animations
- Tool holding (axe, pickaxe)

### Model Structure

```
playerGroup (THREE.Group)
  └── modelPivot (THREE.Group) - rotates to face movement direction
        ├── torso (BoxGeometry)
        ├── head (BoxGeometry)
        │     ├── eyeL + pupil
        │     └── eyeR + pupil
        ├── legL (BoxGeometry) - pivot at top
        ├── legR (BoxGeometry)
        ├── armL (BoxGeometry) - pivot at top
        │     └── handAnchorL
        └── armR (BoxGeometry)
              └── handAnchorR - holds tools
```

### Key Methods

```javascript
class PlayerController {
    constructor(world, state)
    
    createModel(palette)  // Build blocky character
    holdItem(item)        // Attach/detach tools
    update(dt, islands)  // Movement, physics, animation
    updateCamera(camera) // Third/first person camera
    getPosition()        // Return player position
    getForward()         // Return forward direction
    remove()             // Cleanup
}
```

### Movement Logic

```javascript
// Camera-relative movement
const camDir = camera.getWorldDirection();
camDir.y = 0;
camDir.normalize();

const camRight = cross(camDir, UP).normalize();

const moveDir = new Vector3(0, 0, 0);
if (inputs.w) moveDir.add(camDir);
if (inputs.s) moveDir.sub(camDir);
if (inputs.a) moveDir.sub(camRight);  // A = left
if (inputs.d) moveDir.add(camRight);   // D = right
```

### Physics

```javascript
// Gravity
player.vel.y -= 0.015;

// Jump (if on ground)
if (onGround && inputs.space) {
    player.vel.y = 0.2;
    onGround = false;
}

// Floor collision
if (nextPos.y < island.floorY) {
    nextPos.y = island.floorY;
    player.vel.y = 0;
    onGround = true;
}

// Boundary collision (stay on island)
if (distanceFromCenter > island.radius - 0.5) {
    // Push back inside
}
```

### Obstacle Collision

```javascript
// Simple circle push-out
for (const obs of obstacles) {
    const dist = distance(playerPos, obs.position);
    const minDist = playerRadius + obs.radius;
    
    if (dist < minDist) {
        const overlap = minDist - dist;
        player.pos.x += (dx / dist) * overlap;
        player.pos.z += (dz / dist) * overlap;
    }
}

// Mountain climbing
if (obs.userData.isMountain) {
    const dist = distance(playerPos, mountainPos);
    if (dist < mountRadius) {
        // Linear cone height approximation
        const height = baseY + mountHeight * (1 - dist / mountRadius);
        if (player.pos.y > height - 1.0) {
            player.pos.y = height;
            onGround = true;
        }
    }
}
```

### Animations

**Walk Cycle** (when moving and on ground):
```javascript
walkCycle = time * 10;
legL.rotation.x = sin(walkCycle) * 0.8;
legR.rotation.x = sin(walkCycle + PI) * 0.8;
armL.rotation.x = sin(walkCycle + PI) * 0.5;
armR.rotation.x = sin(walkCycle) * 0.5;
modelPivot.position.y = abs(sin(walkCycle * 2)) * 0.05;
```

**Chop Animation** (from ChopSystem):
```javascript
if (isSwinging) {
    // Swing forward
    armR.rotation.x = -1.2 + (1 - swingProgress) * 2.2;
} else {
    // Wind-up pose
    armR.rotation.x = lerp(armR.rotation.x, -1.2, 0.15);
}
```

### Camera Modes

**Third Person**:
```javascript
dist = 5.0;
camX = pos.x + dist * sin(ca.x) * cos(ca.y);
camZ = pos.z + dist * cos(ca.x) * cos(ca.y);
camY = pos.y + dist * sin(ca.y) + 0.8;

camera.position.lerp(desiredPos, 0.1);
camera.lookAt(pos.x, pos.y + 0.8, pos.z);
```

**First Person**:
```javascript
camera.position.set(pos.x, pos.y + 1.6, pos.z);
lookTarget = position + lookDirection;
camera.lookAt(lookTarget);
player.targetRotation = ca.x;
```

---

## EntityFactory

**Location**: `base/modular/js/classes/EntityFactory.js`

### Responsibilities

- Generate procedural palettes and DNA
- Create all game entities (islands, trees, creatures, NPCs, tools, botes)
- Manage mesh creation with materials
- Particle and debris creation

### Key Constants

```javascript
O_Y = -1.4  // Base ground level
```

### Generator Methods

```javascript
generatePalette(sphereColor)  // HSL color scheme
generateWorldDNA()           // Random shapes for entities
generateTerrain(r, s, min, max)  // Displaced circle geometry
```

### Entity Creators

| Method | Creates |
|--------|---------|
| `createIslandAt(p, x, z, r, hasWater)` | Island with terrain layers |
| `createTree(p, x, z, style)` | Tree (choppable) |
| `createBush(p, x, z, style)` | Bush (produces food) |
| `createRock(p, x, z, style)` | Decorative rock |
| `createGoldRock(p, x, z, scale)` | Mineable gold rock |
| `createGrass(p, x, z, style)` | Tall grass |
| `createFlower(p, x, z, style)` | Flower |
| `createCloud(x, y, z)` | Cloud |
| `createCreature(p, x, z, style)` | AI creature |
| `createChief(p, x, z)` | Chief Ruru NPC |
| `createStoneGolem(p, x, z)` | Golem NPC |
| `createMountain(p, x, z, scale)` | Climbable mountain |
| `createAxe(p, x, z)` | Axe tool |
| `createPickaxe(p, x, z)` | Pickaxe tool |
| `createBoat(x, z, color)` | Sailboat |
| `createCat(x, z)` | Companion cat |
| `createLog(color, x, z)` | Wood log |
| `createEgg(pos, color, dna)` | Creature egg |
| `createParticle(pos, color, size)` | Visual particle |
| `createChopParticles(pos, color, count)` | Chop effect particles |

### Material Creation

```javascript
getMat(color, flat = true) {
    return new THREE.MeshToonMaterial({
        color: color,
        flatShading: flat
    });
}
```

### Tree Shapes (WorldDNA)

```javascript
tree.shape = 'cone' | 'box' | 'round' | 'cylinder'
// Cone: ConeGeometry
// Box: BoxGeometry  
// Round: DodecahedronGeometry
// Cylinder: CylinderGeometry
```

### Creature Eye Count

```javascript
const eyeRoll = Math.random();
const eyeCount = eyeRoll < 0.1 ? 1 :   // 10%
                 eyeRoll < 0.2 ? 3 :   // 10%
                 2;                    // 80%
```

---

## WorldManager

**Location**: `base/modular/js/classes/WorldManager.js`

### Responsibilities

- Initialize Three.js scene, camera, renderer
- Setup lighting
- Handle window resize
- Provide material factory

### Constructor

```javascript
constructor(renderScale) {
    this.renderScale = renderScale;  // 0.5 for pixelated look
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    
    // Camera (FOV 50, updated to 60 by GameEngine)
    this.camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        2000
    );
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance"
    });
    this.renderer.setSize(
        window.innerWidth * renderScale,
        window.innerHeight * renderScale,
        false
    );
    this.renderer.domElement.style.imageRendering = 'pixelated';
    document.body.appendChild(this.renderer.domElement);
    
    // Lighting
    this.setupLighting();
}
```

### Lighting Setup

```javascript
setupLighting() {
    // Ambient - soft overall light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    
    // Directional - sun-like
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);
}
```

### Methods

```javascript
add(obj)           // this.scene.add(obj)
remove(obj)        // this.scene.remove(obj)
render()          // this.renderer.render(scene, camera)
resize()          // Update camera aspect and renderer size
getMat(color)     // Create MeshToonMaterial
```

---

## AudioManager

**Location**: `base/modular/js/classes/AudioManager.js`

### Responsibilities

- Synthesize sound effects using Web Audio oscillators
- Manage background music via BeepBox
- Handle volume control

### Sound Effects (Chirp Method)

All SFX use a common `chirp(f1, f2, dur, vol)` method that creates an oscillator with frequency sweep:

```javascript
chirp(f1, f2, dur, vol = 0.1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Frequency sweep
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.linearRampToValueAtTime(f2, now + dur);
    
    // Volume envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + dur * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    
    osc.start();
    osc.stop(now + dur);
}
```

### Sound Library

| Method | Sound | Parameters |
|--------|-------|------------|
| `select()` | UI selection | 600→900Hz, 0.15s |
| `pickup()` | Item pickup | 300→500Hz, 0.2s |
| `place()` | Item placement | 500→300Hz, 0.2s |
| `pop()` | Error/denied | 800→1000Hz, 0.1s |
| `chop()` | Tree/rock hit | 400→200Hz, 0.08s |
| `treeFall()` | Tree falling | 300→80Hz, 0.4s |
| `sail()` | Boat depart | 200→350Hz + 350→500Hz |
| `boatBuild()` | Boat assembled | 300→600→800→1000Hz |
| `eat()` | Creature eating | 400→500Hz × 2 |
| `hungry()` | Creature hungry warning | 500→400→420→350Hz |
| `sing()` | NPC interaction | 600→800→1000→700Hz |
| `layEgg()` | Egg laid | 400→200Hz |
| `die()` | Creature death | 300→100Hz, 0.6s |
| `pet()` | Cat pet (LFO modulated) | 200Hz triangle + 25Hz LFO |
| `explode()` | World reset | Noise buffer + lowpass filter |

### Music

```javascript
startMusic(worldDNA, volSlider, volIcon, settingsBtn, settingsPopup, sfx) {
    // Uses BeepBox Synth
    const { Synth } = beepbox;
    this.synth = new Synth(this.songHash);
    
    // Volume from slider
    this.synth.volume = (sliderValue / 100) * MASTER_GAIN_CAP;
    
    // Randomize instrument each world
    this.randomize(worldDNA);
}

randomize(dna) {
    const channel = this.synth.song.channels[1];
    const instrument = channel.instruments[0];
    instrument.chipWave = random(0, 8);
    instrument.unison = random(0, 3);
    instrument.transition = random(0, 3);
}
```

---

## ChatManager

**Location**: `base/modular/js/classes/ChatManager.js`

### Responsibilities

- Manage NPC chat UI
- Load lore files
- Interface with LLM service
- Display messages

### UI Elements

```javascript
{
    container: '#chat-interface',
    messages: '#chat-messages',
    input: '#chat-input',
    sendBtn: '#chat-send-btn',
    closeBtn: '#chat-close-btn',
    typingIndicator: '#chat-typing'
}
```

### Flow

```javascript
async openChat(entity) {
    // 1. Show chat UI
    container.style.display = 'flex';
    
    // 2. Load lore file if exists
    if (entity.userData.loreFile) {
        const res = await fetch(entity.userData.loreFile);
        lore = await res.text();
    }
    
    // 3. Set system prompt
    llm.setSystemPrompt(lore);
    
    // 4. Show greeting
    addMessage("System", "Connected to " + entity.name);
}

async sendMessage() {
    // 1. Add user message
    addMessage("You", text, true);
    
    // 2. Show typing indicator
    typingIndicator.style.display = 'block';
    
    // 3. Get LLM response
    const response = await llm.sendChat(text, history);
    
    // 4. Display response
    typingIndicator.style.display = 'none';
    addMessage(entity.name, response, false);
    
    // 5. Update history
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: response });
}
```

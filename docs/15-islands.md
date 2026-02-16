# Islands & World Generation

## Overview

The game world consists of **5 procedurally generated islands** arranged in an archipelago. Each island has unique characteristics including size, color palette, terrain, and entity spawns.

---

## Island Definitions

All island definitions are centralized in `constants.js`:

```javascript
export const ISLANDS = [
    { name: "STARTING SHORE", x: 0, z: 0, radius: 12, hasWater: true, palette: null },
    { name: "FLORA HAVEN", x: 80, z: 0, radius: 14, hasWater: false, palette: null },
    { name: "ANCIENT PEAKS", x: 0, z: 110, radius: 28, hasWater: false, palette: 'blue' },
    { name: "ROCKY OUTPOST", x: -90, z: -50, radius: 11, hasWater: false, palette: null },
    { name: "DISTANT SHORES", x: 50, z: -100, radius: 13, hasWater: false, palette: null }
];
```

---

## Island 1: Starting Shore

**Position**: `(0, 0)`  
**Radius**: 12  
**Has Water**: Yes  

### Features

| Entity | Count | Notes |
|--------|-------|-------|
| Trees | 14 | Choppable, produce food |
| Bushes | 7 | Produce food |
| Rocks | 5 | Decorative |
| Grass | 30 | Decorative |
| Flowers | 8 | Decorative |
| Creatures | 3 | AI-driven |
| Chief Ruru | 1 | NPC with chat |
| Axe | 1 | On ground |

### Terrain

- 3-layer island (base rock → soil → grass)
- Water plane surrounds island
- Starting spawn point for player

### Unique Features

- **Only island with water plane**: Enables boat building
- **Chief Ruru**: First NPC encountered, offers chat
- **Axe**: Required tool for chopping trees

---

## Island 2: Flora Haven

**Position**: `(80, 0)`  
**Radius**: 14  
**Has Water**: No  

### Features

| Entity | Count | Notes |
|--------|-------|-------|
| Trees | 18 | Dense vegetation |
| Bushes | 12 | High food production |
| Rocks | 4 | Decorative |
| Grass | 20 | Decorative |
| Flowers | 6 | Decorative |
| Pickaxe | 1 | On ground |
| Creatures | 3 | AI-driven |

### Terrain

- Standard 3-layer island
- No water (must return to Island 1 for boats)

### Unique Features

- **Pickaxe**: Required for mining rocks
- **Dense vegetation**: Good for food production

---

## Island 3: Ancient Peaks

**Position**: `(0, 110)`  
**Radius**: 28  
**Has Water**: No  
**Palette**: `'blue'`

### Features

| Entity | Count | Notes |
|--------|-------|-------|
| Mountain | 1 | Climbable, 15 radius, 18 height |
| Stone Golem | 1 | NPC with dialog |
| Big Rocks | 8 | 3x scale, decorative |
| Gold Rocks | 12 | Mineable, arranged in ring |
| Trees | 10 | Outside mountain |
| Grass | 40 | Decorative |
| Flowers | 12 | Decorative |

### Terrain

- Largest island
- Mountain in center (climbable)
- Ring of gold rocks around edge

### Unique Features

- **Mountain**: Climbable cone with snow cap
- **Stone Golem**: Static NPC with dialog
- **Gold Rocks**: Only source of gold (mine with pickaxe)
- **Blue palette**: Distinct visual style

---

## Island 4: Rocky Outpost

**Position**: `(-90, -50)`  
**Radius**: 11  
**Has Water**: No  

### Features

| Entity | Count | Notes |
|--------|-------|-------|
| Trees | 4 | Sparse |
| Bushes | 3 | - |
| Rocks | 3 | - |
| Grass | 12 | - |
| Flowers | 4 | - |
| Creatures | 2 | - |

### Terrain

- Small island
- Standard terrain layers

### Unique Features

- **Sparse**: Resource-scarce
- Good for exploration but not gathering

---

## Island 5: Distant Shores

**Position**: `(50, -100)`  
**Radius**: 13  
**Has Water**: No  

### Features

| Entity | Count | Notes |
|--------|-------|-------|
| Trees | 5 | - |
| Bushes | 4 | - |
| Rocks | 4 | - |
| Grass | 18 | - |
| Flowers | 5 | - |
| Creatures | 3 | - |

### Terrain

- Medium island
- Standard terrain

### Unique Features

- **Remote location**: Farthest from start
- Balanced resources

---

## World Generation Process

### Step 1: Palette Generation

Each island gets a color palette generated from HSL values:

```javascript
generatePalette(sphereColor) {
    let hue;
    if (!sphereColor) {
        hue = Math.random();  // Random for most islands
    } else {
        // Force specific hue (e.g., 'blue' for Ancient Peaks)
        let base = sphereColor === 'blue' ? 0.6 : 0.1;
        hue = (base + (Math.random() - 0.5) * 0.3) % 1;
    }
    
    // Generate colors from hue
    const background = new THREE.Color().setHSL((hue + 0.5) % 1, 0.3, 0.8);
    const baseRock = new THREE.Color().setHSL(hue, 0.2, 0.15);
    const flora = new THREE.Color().setHSL((hue + 0.2 + Math.random() * 0.4) % 1, 0.5 + Math.random() * 0.4, 0.3 + Math.random() * 0.3);
    // ... more colors
}
```

### Step 2: World DNA Generation

Randomized shapes for procedural variety:

```javascript
generateWorldDNA() {
    return {
        tree: {
            shape: ['cone', 'box', 'round', 'cylinder'][Math.floor(Math.random() * 4)],
            heightMod: 1.2 + Math.random() * 1.0,
            thickMod: 0.6 + Math.random()
        },
        bush: { shape: ['sphere', 'cone'][Math.floor(Math.random() * 2)] },
        rock: { shape: ['ico', 'box', 'dodec', 'slab'][...] },
        creature: { shape: ['box', 'sphere'][...], eyes: 1/2/3, ... },
        grass: { height: 0.3 + Math.random() * 0.5 }
    };
}
```

### Step 3: Island Terrain

Created with `EntityFactory.createIslandAt()`:

```javascript
createIslandAt(palette, centerX, centerZ, radius, hasWater) {
    // Base rock (dark)
    const base = new THREE.Mesh(
        generateTerrain(radius, segments, -0.3, 0.3),
        getMat(palette.baseRock)
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -2;
    
    // Soil layer
    const soil = new THREE.Mesh(
        generateTerrain(radius * 0.93, segments, -0.2, 0.2),
        getMat(palette.soil)
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = -1.5;
    
    // Grass top
    const grass = new THREE.Mesh(
        generateTerrain(radius * 0.9, segments, -0.1, 0.1),
        getMat(palette.groundTop)
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = O_Y;
    grass.userData = { type: 'ground' };
    
    // Optional water plane
    if (hasWater) {
        const water = new THREE.Mesh(
            new THREE.CircleGeometry(200, 50),
            new THREE.MeshPhongMaterial({
                color: palette.background.lerp(blue, 0.7),
                transparent: true,
                opacity: 0.6
            })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.y = -2.0;
        water.userData = { type: 'water' };
    }
}
```

### Step 4: Entity Spawning

Entities spawned at random positions within island radius:

```javascript
const rndPolar = (cx, cz, minR = 1.0, maxR = 9.0) => {
    const a = Math.random() * 6.28;
    const r = minR + Math.random() * (maxR - minR);
    return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
};

// Spawn trees
for (let i = 0; i < 14; i++) {
    const p = rndPolar(0, 0, 2.0, 9.5);
    const tree = this.factory.createTree(palette, p.x, p.z);
    this.state.entities.push(tree);
    this.world.add(tree);
}
```

---

## Terrain Generation

### Displaced Circle Geometry

```javascript
generateTerrain(r, s, min, max) {
    const geo = new THREE.CircleGeometry(r, s);
    const pos = geo.attributes.position;
    
    // Random Z displacement for height variation
    for (let i = 1; i < pos.count; i++) {
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * (max - min));
    }
    
    // Close the loop
    pos.setZ(pos.count - 1, pos.getZ(1));
    
    geo.computeVertexNormals();
    return geo;
}
```

---

## Player Spawn

The player always spawns on Island 1:

```javascript
// Position
this.state.player.pos.set(0, O_Y + 2, 0);
this.state.player.vel.set(0, 0, 0);
this.state.player.onGround = false;
this.state.player.cameraAngle = { x: 0, y: 0.3 };

// Create player model
this.playerController.createModel(this.state.palette);

// Camera initial position
this.world.camera.position.set(0, O_Y + 5, 6);
```

---

## Island Boundaries

### Player Collision

In `PlayerController.update()`:

```javascript
// Boundary check
if (dist > island.radius - 0.5) {
    const angle = Math.atan2(dz, dx);
    nextPos.x = island.center.x + Math.cos(angle) * (island.radius - 0.5);
    nextPos.z = island.center.z + Math.sin(angle) * (island.radius - 0.5);
    player.vel.x = 0;
    player.vel.z = 0;
}
```

### Creature AI Boundaries

Creatures stay within their home island:

```javascript
// In EntityAISystem
const boundR = e.userData.boundRadius || CREATURE_WANDER_RADIUS;
const relX = e.position.x - bc.x;
const relZ = e.position.z - bc.z;
if (relX ** 2 + relZ ** 2 > boundR ** 2) {
    const a = Math.atan2(relZ, relX);
    e.position.x = bc.x + Math.cos(a) * boundR * 0.9;
    e.position.z = bc.z + Math.sin(a) * boundR * 0.9;
}
```

### Cat AI Boundaries

The companion cat stays on its current island:

```javascript
// In CatAI
const rx = cat.position.x - catIsland.center.x;
const rz = cat.position.z - catIsland.center.z;
const maxR = catIsland.radius * 0.8;
if (rx * rx + rz * rz > maxR * maxR) {
    const a = Math.atan2(rz, rx);
    cat.position.x = catIsland.center.x + Math.cos(a) * maxR;
    cat.position.z = catIsland.center.z + Math.sin(a) * maxR;
}
```

---

## Boat Island Collision

In `BoatSystem.updateBoatPhysics()`:

```javascript
for (const island of state.islands) {
    const dx = newX - island.center.x;
    const dz = newZ - island.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = island.radius + BOAT_COLLISION_RADIUS;
    
    if (dist < minDist) {
        // Bounce off
        const angle = Math.atan2(dz, dx);
        boat.position.x = island.center.x + Math.cos(angle) * minDist;
        boat.position.z = island.center.z + Math.sin(angle) * minDist;
        boatSpeed *= -0.15;
    }
}
```

---

## Island Indicator

The UI shows the current island name when entering a new island:

```javascript
updateIslandIndicator() {
    const playerPos = state.isOnBoat ? state.activeBoat.position : state.player.pos;
    
    for (const island of state.islands) {
        const dist = distance(playerPos, island.center);
        if (dist < island.radius + 5) {
            // Show indicator
            ui.islandIndicator.textContent = island.name;
            break;
        }
    }
}
```

---

## Water Plane

Only Island 1 has a water plane. It's used for:

1. **Visual**: Ocean surrounding island
2. **Log placement**: Placing wood/logs on water
3. **Boat building**: 4+ logs in proximity auto-assemble into boat

The water mesh is a large circle (radius 200) at Y = -2.0, with slight vertex displacement for waves.

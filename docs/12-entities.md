# Entity Catalog

## Overview

All game entities are created by `EntityFactory` (`base/modular/js/classes/EntityFactory.js`). Each entity has a specific purpose, properties, and behaviors.

---

## Entity Reference

| Entity | Type Key | Created By | Features |
|--------|----------|------------|----------|
| Tree | `tree` | `createTree()` | Choppable (5 HP), produces food |
| Bush | `bush` | `createBush()` | Produces food every 25s |
| Rock | `rock` | `createRock()` | Decorative |
| Gold Rock | `gold_rock` | `createGoldRock()` | Mineable, drops gold |
| Grass | `grass` | `createGrass()` | Decorative |
| Flower | `flower` | `createFlower()` | Stem + petals |
| Creature | `creature` | `createCreature()` | AI: hunger, wander, eat, breed |
| Chief | `chief` | `createChief()` | NPC with chat |
| Stone Golem | `golem` | `createStoneGolem()` | Animated NPC, dialog |
| Axe | `axe` | `createAxe()` | Tool, enables chopping |
| Pickaxe | `pickaxe` | `createPickaxe()` | Tool, enables mining |
| Boat | `boat` | `createBoat()` | Rideable vessel |
| Cat | `cat` | `createCat()` | Companion, follows player |
| Cloud | `cloud` | `createCloud()` | Drifts across sky |
| Mountain | `mountain` | `createMountain()` | Climbable terrain |
| Egg | `egg` | `createEgg()` | Hatches into creature |
| Log | `log` | `createLog()` | Placeable, clusters into boats |
| Food | (inline) | EntityAISystem | Produced by trees/bushes |

---

## Tree

**Method**: `createTree(palette, x, z, style)`

### Structure

```
Group
  └── CylinderGeometry (trunk)
  └── ConeGeometry/BoxGeometry/DodecahedronGeometry/CylinderGeometry (foliage)
```

### Properties

```javascript
{
    type: 'tree',
    radius: 0.6,
    style: {
        color: THREE.Color,       // Foliage color
        trunkColor: THREE.Color,  // Trunk color
        shape: 'cone'|'box'|'round'|'cylinder',
        height: 1.5-2.5,
        thickness: 0.6-1.2
    },
    color: THREE.Color,
    productionTimer: number,      // Counts to 25s for food
    health: 5,
    choppable: true
}
```

### Behavior

- **Chopping**: 5 hits with axe to fell
- **Food**: Spawns food every 25 seconds
- **On fall**: Spawns 1 log entity

---

## Bush

**Method**: `createBush(palette, x, z, style)`

### Properties

```javascript
{
    type: 'bush',
    radius: 0.4,
    style: { color, shape: 'sphere'|'cone', scaleY },
    color: THREE.Color,
    productionTimer: number
}
```

### Behavior

- **Food**: Spawns food every 25 seconds

---

## Rock

**Method**: `createRock(palette, x, z, style)`

### Properties

```javascript
{
    type: 'rock',
    style: { color, shape: 'ico'|'box'|'dodec'|'slab' },
    color: THREE.Color
}
```

### Behavior

- **Decorative**: No interaction by default
- **Mining**: With pickaxe, drops 3 rock items

---

## Gold Rock

**Method**: `createGoldRock(palette, x, z, scale)`

### Structure

```
Group
  └── DodecahedronGeometry (base)
  └── BoxGeometry × 5 (gold ore protrusions)
```

### Properties

```javascript
{
    type: 'gold_rock',
    radius: 0.8 * scale,
    color: palette.baseRock
}
```

### Behavior

- **Mining**: With pickaxe, drops 3 gold-colored items

---

## Grass

**Method**: `createGrass(palette, x, z, style)`

### Properties

```javascript
{
    type: 'grass',
    style: { color, height: 0.3-0.8 },
    color: THREE.Color,
    growTimer: number
}
```

### Behavior

- **Decorative**: Static, no interaction

---

## Flower

**Method**: `createFlower(palette, x, z, style)`

### Structure

```
Group
  └── BoxGeometry (stem)
  └── DodecahedronGeometry (petals)
  └── BoxGeometry (center)
```

### Properties

```javascript
{
    type: 'flower',
    style: {
        stemColor, 
        petalColor, 
        centerColor, 
        height: 0.5-0.7
    },
    color: THREE.Color  // petalColor
}
```

---

## Creature

**Method**: `createCreature(palette, x, z, style)`

### Structure

```
Group
  └── BoxGeometry/SphereGeometry (body)
  └── EyeGroup × 1-3 (eyes with pupils)
```

### Properties

```javascript
{
    type: 'creature',
    radius: 0.5,
    hunger: 0,              // Increases 0.1/sec
    age: 0,                 // Seconds since spawn
    eatenCount: 0,          // Foods eaten
    moveSpeed: 0.03,
    hopOffset: number,      // Animation offset
    color: THREE.Color,
    bubble: Sprite|null,    // Hunger warning
    style: { color, bodyShape, eyeCount, scale, eyeScale },
    targetScale: number,
    cooldown: number,
    boundCenter: { x, z },  // Island center for AI
    boundRadius: number     // Island radius for AI
}
```

### AI Behavior

```
Spawn → Hunger increases at 0.1/sec
  ↓
If hunger > 15 → Show "?" bubble + hungry sound
  ↓
If food within 3 units → Move toward food
  ↓
If food within 0.5 units → Eat (hunger=0, eatenCount++)
  ↓
If eatenCount >= 3 AND age > 8s → Lay egg
  ↓
If hunger > 30 → Die (particle explosion)
```

---

## Chief (NPC)

**Method**: `createChief(palette, x, z)`

### Structure

```
Group
  └── CylinderGeometry (body)
  └── ConeGeometry (crown)
  └── SphereGeometry × 2 (eyes)
```

### Properties

```javascript
{
    type: 'chief',
    name: 'Chief Ruru',
    loreFile: 'data/chief_lore.txt',
    canChat: true,
    radius: 0.6,
    moveSpeed: 0.045,
    color: creatureColor,
    fleeTimer: 0
}
```

### Interaction

- **Click**: Opens chat interface with lore-loaded LLM

---

## Stone Golem (NPC)

**Method**: `createStoneGolem(palette, x, z)`

### Structure

```
Group
  └── BoxGeometry (body)
  └── BoxGeometry (nose)
  └── BoxGeometry (mouth)
  └── EyeGroup × 2 (eyes with pupils, brows)
  └── ArmPivot × 2 (arms)
  └── LegMesh × 4 (legs)
```

### Properties

```javascript
{
    type: 'golem',
    radius: 2.5,
    lArm, rArm, legs,       // References for animation
    interactive: true,
    dialog: "need. soul. soul. in. big. green. roof."
}
```

### Animation

- **Position**: Bob up/down
- **Arms**: Swing gently
- **Legs**: Scale pulse
- **Player proximity**: Face player if within 15 units

### Interaction

- **Click**: Shows dialog box

---

## Axe

**Method**: `createAxe(palette, x, z)`

### Structure

```
Group
  └── CylinderGeometry (handle)
  └── BoxGeometry (head base)
  └── BoxGeometry (blade)
  └── BoxGeometry (edge)
```

### Properties

```javascript
{
    type: 'axe',
    color: null
}
```

### Behavior

- **Pickup**: Held in right hand
- **Use**: Enables tree chopping

---

## Pickaxe

**Method**: `createPickaxe(palette, x, z)`

### Structure

```
Group
  └── CylinderGeometry (handle)
  └── BoxGeometry (head)
  └── ConeGeometry × 2 (tips)
```

### Properties

```javascript
{
    type: 'pickaxe',
    color: null
}
```

### Behavior

- **Pickup**: Held in right hand
- **Use**: Enables rock/gold mining

---

## Boat

**Method**: `createBoat(x, z, color)`

### Structure

```
Group (pivot for rotation)
  └── BoxGeometry (hull bottom)
  └── BoxGeometry (upper hull)
  └── BoxGeometry (deck)
  └── BoxGeometry × 3 (deck beams)
  └── ConeGeometry (bow)
  └── BoxGeometry (stern)
  └── BoxGeometry (keel)
  └── CylinderGeometry (mast)
  └── CylinderGeometry (boom)
  └── ShapeGeometry (sail)
  └── BoxGeometry (rudder)
  └── CylinderGeometry × 6 (rail posts)
```

### Properties

```javascript
{
    type: 'boat',
    color: THREE.Color,
    radius: 2.5
}
```

### Behavior

- **Board**: Press E when near
- **Move**: WASD controls (W/S throttle, A/D steering)
- **Collision**: Bounces off islands

---

## Cat (Companion)

**Method**: `createCat(x, z)`

### Structure

```
Group
  └── BoxGeometry (body)
  └── BoxGeometry (belly patch)
  └── BoxGeometry (head)
  └── BoxGeometry (muzzle)
  └── BoxGeometry (nose)
  └── SphereGeometry × 2 (eyes + pupils)
  └── ConeGeometry × 2 (ears + inner ears)
  └── BoxGeometry × 4 (legs)
  └── CylinderGeometry × 2 (tail + tip)
  └── BoxGeometry (chest)
```

### Properties

```javascript
{
    type: 'cat',
    radius: 0.4,
    legs: [leg1, leg2, leg3, leg4],
    tail: tailBase,
    moveSpeed: 0.06,
    hopOffset: number,
    followDist: 1.8,
    idleTimer: 0,
    isIdle: false
}
```

### Behavior

- **Follow**: Trails player within same island
- **Idle**: Looks at player from distance when on different island/boat
- **Board**: Follows player onto boat with 1s delay

---

## Cloud

**Method**: `createCloud(x, y, z)`

### Structure

```
Group
  └── BoxGeometry × 3 (cloud puffs)
```

### Properties

```javascript
{
    type: 'cloud',
    speed: 0.5-2.0  // Drift speed
}
```

### Behavior

- **Drift**: Moves in +X direction
- **Wrap**: Wraps at ±200 X position

---

## Mountain

**Method**: `createMountain(palette, x, z, scale)`

### Structure

```
Group
  └── ConeGeometry (main peak)
  └── ConeGeometry (snow cap)
  └── ConeGeometry × 4 (sub-peaks)
```

### Properties

```javascript
{
    type: 'mountain',
    radius: 8 * scale
}
```

### Behavior

- **Climbable**: Linear height approximation based on distance
- **Collision**: Player snaps to surface when nearby

---

## Egg

**Method**: `createEgg(pos, color, dna)`

### Structure

```
Group
  └── SphereGeometry (scaled Y × 1.3)
```

### Properties

```javascript
{
    type: 'egg',
    color: THREE.Color,
    parentDNA: Object,    // Style DNA for baby
    hatchTimer: 10.0
}
```

### Behavior

- **Wobble**: Rotation increases as timer decreases
- **Hatch**: After 10s, spawns baby creature

---

## Log

**Method**: `createLog(color, x, z)`

### Structure

```
Group
  └── CylinderGeometry (log)
```

### Properties

```javascript
{
    type: 'log',
    color: THREE.Color,
    autoPickup: true,
    onLand: true
}
```

### Behavior

- **Place on water**: Creates floating log
- **Cluster**: 4+ logs within radius 5 → auto-build boat
- **Pickup**: Auto-collected within 1.5 units

---

## Food

**Created inline** by `EntityAISystem` when trees/bushes produce.

### Structure

```
Mesh (IcosahedronGeometry, radius 0.15)
```

### Properties

```javascript
{
    // Created inline, no userData type
    // Added to state.foods array
}
```

### Behavior

- **Spawn**: Near parent tree/bush every 25s
- **Eat**: Creatures consume when within 0.5 units
- **Animation**: Bob, rotate, scale up

---

## Particle

**Method**: `createParticle(pos, color, size)`

### Structure

```
Sprite (SpriteMaterial)
```

### Properties

```javascript
{
    vel: Vector3,     // Random velocity
    life: 1.0,       // Fades to 0
    maxLife: 1.0
}
```

### Behavior

- **Physics**: Velocity + gravity
- **Fade**: Opacity decreases
- **Cleanup**: Removed when life <= 0

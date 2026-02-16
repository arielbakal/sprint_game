# Constants Reference

## Overview

All game constants are centralized in `base/modular/js/constants.js`. This file should be the single source of truth for all "magic numbers" to make tweaking and balancing easier.

---

## Physics

```javascript
export const GRAVITY = 0.015;           // Per-frame gravity
export const JUMP_FORCE = 0.2;          // Initial upward velocity
export const PLAYER_SPEED = 0.12;       // Player walk speed
export const PLAYER_RADIUS = 0.4;       // Collision radius
```

---

## Camera

```javascript
export const CAMERA_FOV = 60;           // Field of view (overwrites WorldManager's 50)
export const CAMERA_DISTANCE = 5.0;    // Third-person distance
export const CAMERA_DISTANCE_BOAT = 8.0; // Distance when on boat
export const CAMERA_LERP = 0.1;         // Smooth follow factor
export const CAMERA_MIN_Y = -0.3;        // Min vertical angle (TPS allows looking down)
export const CAMERA_MAX_Y = 1.5;        // Max vertical angle (radians)
```

---

## Rendering

```javascript
export const RENDER_SCALE = 0.5;        // Resolution multiplier (pixelated look)
export const GROUND_LEVEL = -1.4;       // O_Y base ground level
```

---

## Interaction

```javascript
export const CHOP_HITS = 5;             // Hits to fell tree
export const MINE_HITS = 5;             // Hits to mine rock
export const HIT_INTERVAL = 0.4;        // Seconds between hits
export const INTERACT_RANGE = 3.0;      // Highlight distance
export const CHOP_MAX_RANGE = 3.5;      // Max chopping distance
export const PICKUP_RANGE = 1.5;        // Auto-pickup distance
export const TOOL_PICKUP_RANGE = 4.0;   // Manual tool pickup
export const RAYCAST_RANGE = 8.0;      // Click interaction distance
export const PLACE_RANGE = 12.0;        // Item placement distance
export const WATER_PLACE_RANGE = 15.0;  // Log placement on water
```

---

## Boat

```javascript
export const BOAT_MAX_SPEED = 0.12;     // Max velocity
export const BOAT_ACCELERATION = 0.003; // Throttle acceleration
export const BOAT_BRAKE = 0.004;        // Braking force
export const BOAT_REVERSE_FACTOR = 0.3;// Reverse speed multiplier
export const BOAT_DRAG = 0.985;         // Water drag (velocity decay)
export const BOAT_MIN_SPEED = 0.001;    // Minimum before stopping
export const BOAT_COLLISION_RADIUS = 3.0; // Island collision distance
export const BOAT_PROXIMITY_RANGE = 6.0;// Boarding prompt distance
export const BOAT_LOG_CLUSTER_SIZE = 4; // Logs needed for boat
export const BOAT_LOG_CLUSTER_RADIUS = 5.0; // Max distance between logs
export const BOAT_DECK_Y_OFFSET = -1.30; // Cat position on boat
export const BOAT_PLAYER_Y_OFFSET = -1.20; // Player position on boat
```

---

## Boarding Animation

```javascript
export const BOARDING_WALK_SPEED = 2.5;  // Phase 0 duration (1/2.5)
export const BOARDING_HOP_SPEED = 2.8;  // Phase 1 duration (1/2.8)
export const BOARDING_SETTLE_SPEED = 3.0; // Phase 2 duration (1/3.0)
export const BOARDING_HOP_HEIGHT = 1.2; // Jump arc height
export const BOARDING_SIDE_DIST = 2.0;  // Walk-to position offset
export const CAT_BOARDING_DELAY = 1.0;   // Seconds before cat boards
```

---

## Creature AI

```javascript
export const CREATURE_HUNGER_RATE = 0.1;        // Hunger increase per second
export const CREATURE_HUNGER_WARNING = 15;      // Show "?" bubble
export const CREATURE_HUNGER_DEATH = 30;        // Death threshold
export const CREATURE_FOOD_SEEK_RANGE = 3.0;    // Distance to seek food
export const CREATURE_FOOD_EAT_RANGE = 0.5;     // Distance to eat
export const CREATURE_WANDER_SPEED_FACTOR = 0.5; // Wander speed multiplier
export const CREATURE_WANDER_COOLDOWN_MIN = 1.0; // Min wander pause
export const CREATURE_WANDER_COOLDOWN_MAX = 3.0; // Max wander pause
export const CREATURE_BREED_EAT_THRESHOLD = 3;   // Foods to enable breeding
export const CREATURE_BREED_AGE = 8;             // Min age to breed (seconds)
export const EGG_HATCH_TIME = 10.0;              // Seconds to hatch
export const CREATURE_HUNGER_WARN = 15;         // Alias for WARNING
export const CREATURE_WANDER_RADIUS = 8;        // Wander boundary
export const MAX_CREATURES = 15;               // Population cap to prevent exponential growth
```

---

## Food Production

```javascript
export const FOOD_PRODUCTION_TIME = 25;  // Seconds between food spawns
export const MAX_FOODS = 30;            // Population cap to prevent food overload
```

---

## Inventory

```javascript
export const INVENTORY_SLOTS = 8;       // Number of slots
export const NON_STACKABLE_TYPES = ['creature', 'egg', 'axe', 'pickaxe']; // Cannot stack
```

---

## Particles

```javascript
export const PARTICLE_GRAVITY = 0.002;    // Particle fall speed
export const PARTICLE_FADE_RATE = 0.03;   // Opacity decrease per frame
export const DEBRIS_GRAVITY = 0.01;        // Debris fall speed
export const DEBRIS_SHRINK_RATE = 0.98;   // Scale decay per frame
export const DEBRIS_MIN_SCALE = 0.01;      // Minimum before removal
export const DEBRIS_MIN_Y = -20;            // Y threshold for removal
```

---

## Clouds

```javascript
export const CLOUD_COUNT = 40;            // Number of clouds
export const CLOUD_SPREAD = 300;           // Spawn area width
export const CLOUD_MIN_Y = 15;             // Minimum height
export const CLOUD_MAX_Y = 30;              // Maximum height
export const CLOUD_MIN_SPEED = 0.5;         // Min drift speed
export const CLOUD_MAX_SPEED = 1.5;        // Max drift speed
export const CLOUD_WRAP_DISTANCE = 200;    // Wrap boundary
```

---

## Mining

```javascript
export const MINE_DROP_COUNT = 3;  // Resources dropped per rock
```

---

## Islands

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

## Controls

```javascript
export const SENSITIVITY = 0.002;    // Mouse sensitivity
export const ROTATION_SLERP = 0.15;  // Rotation interpolation
```

---

## Animation

```javascript
export const SCALE_LERP = 0.05;  // Pop-in scale interpolation
```

---

## Quick Reference Table

| Category | Constant | Value | Used By |
|----------|----------|-------|---------|
| Physics | GRAVITY | 0.015 | PlayerController |
| Physics | JUMP_FORCE | 0.2 | PlayerController |
| Physics | PLAYER_SPEED | 0.12 | PlayerController |
| Camera | CAMERA_DISTANCE | 5.0 | PlayerController |
| Camera | CAMERA_DISTANCE_BOAT | 8.0 | BoatSystem |
| Interaction | CHOP_HITS | 5 | ChopSystem |
| Interaction | HIT_INTERVAL | 0.4 | ChopSystem, MineSystem |
| Interaction | PICKUP_RANGE | 1.5 | InventoryManager |
| Boat | BOAT_MAX_SPEED | 0.12 | BoatSystem |
| Boat | BOAT_ACCELERATION | 0.003 | BoatSystem |
| Boat | BOAT_DRAG | 0.985 | BoatSystem |
| Boat | BOAT_COLLISION_RADIUS | 3.0 | BoatSystem |
| Boat | BOAT_LOG_CLUSTER_SIZE | 4 | InputHandler |
| Creature | CREATURE_HUNGER_RATE | 0.1 | EntityAISystem |
| Creature | CREATURE_HUNGER_DEATH | 30 | EntityAISystem |
| Creature | CREATURE_BREED_EAT_THRESHOLD | 3 | EntityAISystem |
| Creature | EGG_HATCH_TIME | 10.0 | EntityAISystem |
| Food | FOOD_PRODUCTION_TIME | 25 | EntityAISystem |
| Particles | PARTICLE_GRAVITY | 0.002 | ParticleSystem |
| Particles | PARTICLE_FADE_RATE | 0.03 | ParticleSystem |
| Rendering | RENDER_SCALE | 0.5 | WorldManager |
| Rendering | GROUND_LEVEL | -1.4 | EntityFactory, PlayerController |
| Islands | (array) | - | GameEngine |

---

## Adding New Constants

When adding new gameplay values:

1. Add to `constants.js` with descriptive name
2. Import in files that use it
3. Update this document

Example:
```javascript
// constants.js
export const NEW_FEATURE_VALUE = 42;

// some-system.js
import { NEW_FEATURE_VALUE } from '../constants.js';
```

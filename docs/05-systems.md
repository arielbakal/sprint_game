# Game Systems

## Overview

The game uses a **system-based architecture** where each system handles a specific domain of gameplay. All systems implement a common interface:

```javascript
class SystemName {
    update(dt, context) {
        // dt: delta time in seconds
        // context: { state, world, audio, factory, camera, playerController, playerCat, t, broadcastWorldEvent }
    }
}
```

Systems are orchestrated by `SystemManager`, which calls `update()` on each system in registration order.

---

## SystemManager

**Location**: `base/modular/js/systems/SystemManager.js`

### API

```javascript
class SystemManager {
    // Register a system with a name
    register(name, system)
    
    // Update all systems in order
    update(dt, context)
    
    // Get system by name
    get(name)
}
```

### Registration Order

The order matters! Systems are updated in this sequence:

1. `boat` - BoatSystem
2. `chop` - ChopSystem  
3. `mine` - MineSystem
4. `inventory` - InventoryManager
5. `entityAI` - EntityAISystem
6. `catAI` - CatAI
7. `particles` - ParticleSystem

---

## BoatSystem

**Location**: `base/modular/js/systems/BoatSystem.js`

### Responsibilities

- **Boarding animation**: 3-phase animation (walk-to → hop-up → settle)
- **Boat physics**: acceleration, steering, drag, collisions with islands
- **Cat boarding**: delayed cat boarding with own animation
- **Proximity detection**: Show "Press E to board" prompt

### Key Methods

```javascript
class BoatSystem {
    boardBoat(boat, context)
    finishBoarding(context)
    disembarkBoat(context)
    setSeatedPose(pc)
    resetSeatedPose(pc)
    showBoatHUD(show)
    
    updateBoardingAnimation(dt, context)
    updateCatBoardingAnimation(dt, context)
    updateBoatPhysics(dt, context)
    updateProximity(context)
    
    update(dt, context)  // Main entry point
}
```

### Boarding Animation Phases

| Phase | Name | Duration | Animation |
|-------|------|----------|-----------|
| 0 | Walk-to | ~0.4s | Player walks to boat side |
| 1 | Hop-up | ~0.36s | Player hops onto deck |
| 2 | Settle | ~0.33s | Player settles into seated pose |

### Physics Constants

```javascript
BOAT_MAX_SPEED = 0.12
BOAT_ACCELERATION = 0.003
BOAT_BRAKE = 0.004
BOAT_REVERSE_FACTOR = 0.3
BOAT_DRAG = 0.985
BOAT_MIN_SPEED = 0.001
BOAT_COLLISION_RADIUS = 3.0
BOAT_PROXIMITY_RANGE = 6.0
```

### Cat Boarding Delay

```javascript
CAT_BOARDING_DELAY = 1.0  // seconds after player starts boarding
```

### Update Logic

```javascript
update(dt, context) {
    // 1. Boarding animation (if boarding)
    if (state.isBoardingBoat) {
        updateBoardingAnimation(dt, context);
    }
    
    // 2. Cat boarding delay
    if (state.catBoardingQueued) {
        state.catBoardingDelay -= dt;
        if (state.catBoardingDelay <= 0) {
            state.catBoarding = true;
        }
    }
    
    // 3. Cat boarding animation
    if (state.catBoarding) {
        updateCatBoardingAnimation(dt, context);
    }
    
    // 4. Boat physics (if player on boat)
    if (state.isOnBoat) {
        updateBoatPhysics(dt, context);
    }
    
    // 5. Proximity check (if walking)
    if (!state.isOnBoat && !state.isBoardingBoat) {
        updateProximity(context);
    }
}
```

---

## ChopSystem

**Location**: `base/modular/js/systems/ChopSystem.js`

### Responsibilities

- Tree chopping with hit counting
- Progress bar UI
- Tree → log conversion
- Arm animation synchronization
- Multiplayer broadcast

### Constants

```javascript
CHOP_HITS = 5              // Hits required to fell tree
HIT_INTERVAL = 0.4        // Seconds between hits
CHOP_MAX_RANGE = 3.5      // Max distance to continue chopping
```

### Update Logic

```javascript
update(dt, context) {
    const { state, world, audio, factory, broadcastWorldEvent, playerController } = context;
    
    // 1. Check if player is chopping a valid target
    if (!state.isChopping || !state.interactionTarget) {
        hideChopIndicator();
        playerController.chopAnimState = null;
        return;
    }
    
    // 2. Check range
    if (distanceToTree > CHOP_MAX_RANGE) {
        state.isChopping = false;
        state.chopProgress = 0;
        return;
    }
    
    // 3. Update progress bar
    updateChopIndicator(state.chopProgress / CHOP_HITS);
    
    // 4. Face tree while chopping
    playerController.modelPivot.quaternion.slerp(targetQuat, 0.2);
    
    // 5. Set arm animation state
    playerController.chopAnimState = { isSwinging, swingProgress };
    
    // 6. Hit processing
    if (state.chopTimer >= HIT_INTERVAL) {
        state.chopTimer = 0;
        state.chopProgress++;
        audio.chop();
        
        // Trigger swing animation
        isSwinging = true;
        swingTimer = swingDuration;
        
        // Tree shake effect
        shakeTree();
        
        // Particles
        factory.createChopParticles();
        
        // Tree felled?
        if (state.chopProgress >= CHOP_HITS) {
            audio.treeFall();
            
            // Remove tree
            world.remove(tree);
            state.entities.splice(idx, 1);
            
            // Broadcast to multiplayer
            broadcastWorldEvent('tree_chopped', x, z);
            
            // Spawn log
            const log = factory.createLog();
            state.entities.push(log);
            
            // Reset
            state.isChopping = false;
            state.chopProgress = 0;
            state.interactionTarget = null;
        }
    }
}
```

### Swing Animation

The swing animation has two phases:
1. **Swing**: Arm goes from raised (-1.2 rad) to forward (1.0 rad) over 0.15s
2. **Wind-up**: Arm returns to raised position for next hit

---

## MineSystem

**Location**: `base/modular/js/systems/MineSystem.js`

### Responsibilities

- Rock/gold rock mining with hit counting
- Progress bar UI (reuses chop indicator)
- Resource drop spawning
- Multiplayer broadcast

### Constants

```javascript
MINE_HITS = 5              // Hits required to mine rock
MINE_DROP_COUNT = 3        // Resources dropped per rock
```

### Update Logic

```javascript
update(dt, context) {
    const { state, world, audio, factory, broadcastWorldEvent } = context;
    
    if (!state.isMining || !state.interactionTarget) return;
    
    // Check range
    if (distanceToRock > CHOP_MAX_RANGE) {
        state.isMining = false;
        state.mineProgress = 0;
        return;
    }
    
    // Update progress bar (gray color for stone)
    updateChopIndicator(state.mineProgress / MINE_HITS, '#aaaaaa');
    
    // Hit processing
    if (state.mineTimer >= HIT_INTERVAL) {
        state.mineTimer = 0;
        state.mineProgress++;
        audio.chop();
        
        // Rock shake
        shakeRock();
        
        // Particles
        factory.createChopParticles(rock.position, rockColor);
        
        // Rock destroyed?
        if (state.mineProgress >= MINE_HITS) {
            audio.treeFall();
            
            // Spawn drops
            for (let i = 0; i < MINE_DROP_COUNT; i++) {
                const drop = createMesh(DodecahedronGeometry(0.15), color);
                drop.userData = { type: 'rock', color, autoPickup: true };
                world.add(drop);
                state.entities.push(drop);
            }
            
            // Remove rock
            world.remove(rock);
            state.entities.splice(idx, 1);
            
            // Broadcast
            broadcastWorldEvent('rock_mined', x, z);
            
            // Reset
            state.isMining = false;
            state.mineProgress = 0;
            state.interactionTarget = null;
        }
    }
}
```

---

## InventoryManager

**Location**: `base/modular/js/systems/InventoryManager.js`

### Responsibilities

- Slot management (8 slots)
- Add/remove items
- Stack merging (same type + color)
- Auto-pickup nearby items
- UI rendering

### Constants

```javascript
INVENTORY_SLOTS = 8
NON_STACKABLE_TYPES = ['creature', 'egg']
PICKUP_RANGE = 1.5
```

### Methods

```javascript
class InventoryManager {
    addToInventory(type, color, style, age)
    addAxeToInventory()
    pickAxeFromInventory()
    hasAxeInInventory()
    renderInventory()
    update(dt, context)  // Auto-pickup
}
```

### Auto-Pickup Logic

```javascript
update(dt, context) {
    const { state, world, audio, factory } = context;
    
    if (state.isOnBoat || state.isBoardingBoat) return;
    
    // Check each entity
    for (let i = state.entities.length - 1; i >= 0; i--) {
        const e = state.entities[i];
        
        // Only auto-pickup marked entities
        if (!e.userData.autoPickup) continue;
        
        // Check distance
        if (distance < PICKUP_RANGE && e.scale.x > 0.5) {
            // Logs become wood in inventory
            if (e.userData.type === 'log') {
                addToInventory('wood', e.userData.color);
                audio.pickup();
                
                // Particles
                for (let j = 0; j < 8; j++) {
                    factory.createParticle(e.position, e.userData.color, 0.8);
                }
                
                world.remove(e);
                state.entities.splice(i, 1);
            }
        }
    }
}
```

---

## EntityAISystem

**Location**: `base/modular/js/systems/EntityAISystem.js`

### Responsibilities

- Creature AI (hunger, wandering, eating, breeding)
- Golem animation
- Food production from trees/bushes
- Egg hatching
- Food animation

### Constants

```javascript
CREATURE_HUNGER_RATE = 0.1        // Hunger increase per second
CREATURE_HUNGER_WARN = 15         // Hunger level for "?" bubble
CREATURE_HUNGER_DEATH = 30        // Hunger level for death
CREATURE_FOOD_SEEK_RANGE = 3.0    // Distance to seek food
CREATURE_FOOD_EAT_RANGE = 0.5     // Distance to eat
CREATURE_WANDER_RADIUS = 8        // Wander boundary
CREATURE_BREED_EAT_THRESHOLD = 3 // Foods to enable breeding
CREATURE_BREED_AGE = 8            // Min age to breed (seconds)
FOOD_PRODUCTION_TIME = 25         // Seconds between food spawns
EGG_HATCH_TIME = 10.0             // Seconds until hatch
MAX_CREATURES = 15                 // Population cap
MAX_FOODS = 30                    // Food population cap
```

### Creature AI State Machine

```
Spawn → Hunger increases
  ↓
Hungry (hunger > 0)
  ↓
Seek Food (if food within 3 units)
  ↓
Eat Food (if within 0.5 units)
  ↓
If eatenCount >= 3 AND age > 8s → Lay Egg
  ↓
If hunger > 15 → Show "?" bubble
  ↓
If hunger > 30 → Die (particle explosion)
```

### Food Production

Every 25 seconds, trees and bushes spawn food (if below MAX_FOODS limit):
- Random position within 0.6 unit radius of parent
- IcosahedronGeometry, 0.15 radius
- Uses accent color from palette
- Maximum food items: 30 (MAX_FOODS)

### Population Limits

To prevent exponential growth:
- **MAX_CREATURES = 15**: Creatures cannot breed if population exceeds this limit
- **MAX_FOODS = 30**: Trees/bushes stop producing food if this limit is reached

### Egg Hatching

- Wobble animation increases over time
- After 10 seconds, spawns baby creature
- Baby starts at 0.5 scale, grows to 0.7-1.0

### Golem Animation

```javascript
// Position bob
e.position.y = O_Y + 2.2 + Math.sin(time * 2) * 0.1;

// Arm swing
e.userData.lArm.rotation.x = Math.sin(time * 2) * 0.15;
e.userData.rArm.rotation.x = Math.cos(time * 2) * 0.15;

// Leg scale
e.userData.legs.forEach((leg, idx) => {
    leg.scale.y = 1 + Math.sin(time * 2 + idx) * 0.05;
});

// Face player if nearby
if (distanceToPlayer < 15) {
    e.lookAt(playerPos);
}
```

---

## CatAI

**Location**: `base/modular/js/systems/CatAI.js`

### Responsibilities

- Follow player within same island
- Island clamping (stay on current island)
- Board boat with player (delayed)
- Idle animation when player on different island/boat

### State Machine

```
Player on boat or different island
  ↓
Idle mode → Look at player from distance

Player on same island
  ↓
If distance > followDist (1.8)
  ↓
Follow player
  ↓
If distance <= followDist
  ↓
Idle near player
```

### Boarding Sequence

1. Player boards boat → `catBoardingQueued = true`
2. After 1 second delay → `catBoarding = true`
3. Cat runs to boat → hops on → settles

### Animation

- Leg animation: 4 legs alternate
- Tail sway: sin(t * 2.5) * 0.3 horizontal, sin(t * 1.5) * 0.15 vertical
- Body bob: sin(t * 3 + hopOffset) * 0.015

---

## ParticleSystem

**Location**: `base/modular/js/systems/ParticleSystem.js`

### Responsibilities

- Particle physics (velocity, gravity, fade)
- Debris physics (velocity, gravity, rotation, shrink)
- Cleanup when particles fade or debris falls out of world

### Particle Properties

```javascript
{
    vel: THREE.Vector3,    // Velocity
    life: number,          // 1.0 → 0.0
    maxLife: number
}
```

### Debris Properties

```javascript
{
    vel: THREE.Vector3,     // Explosion velocity
    rotVel: THREE.Vector3, // Random rotation velocity
}
```

### Update Logic

```javascript
// Particles
for (const p of particles) {
    p.position.add(p.userData.vel);
    p.userData.vel.y -= PARTICLE_GRAVITY;  // 0.002
    p.userData.life -= PARTICLE_FADE_RATE; // 0.03
    p.material.opacity = p.userData.life;
    
    if (p.userData.life <= 0) {
        remove(p);
    }
}

// Debris
for (const d of debris) {
    d.position.add(d.userData.vel);
    d.userData.vel.y -= DEBRIS_GRAVITY;  // 0.01
    
    if (d.userData.rotVel) {
        d.rotation.add(d.userData.rotVel);
    }
    
    d.scale.multiplyScalar(DEBRIS_SHRINK_RATE);  // 0.98
    
    if (d.position.y < -20 || d.scale.x < 0.01) {
        disposeAndRemove(d);
    }
}
```

### Constants

```javascript
PARTICLE_GRAVITY = 0.002
PARTICLE_FADE_RATE = 0.03
DEBRIS_GRAVITY = 0.01
DEBRIS_SHRINK_RATE = 0.98
DEBRIS_MIN_SCALE = 0.01
DEBRIS_MIN_Y = -20
```

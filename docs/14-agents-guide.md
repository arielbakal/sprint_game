# Agent's Guide to Modifying Code

## Purpose

This document provides guidance for autonomous agents (including AI agents) that need to understand and modify this codebase. It covers:

- Code organization
- How to find relevant code
- Common modification patterns
- Testing considerations

---

## Code Organization

### Directory Structure

```
base/modular/
├── index.html           # Entry point, UI DOM
├── css/style.css        # All styling
├── data/                # Static data files
│   └── chief_lore.txt
└── js/
    ├── main.js          # Bootstrap
    ├── config.js        # Configuration
    ├── constants.js     # Magic numbers
    ├── classes/         # Core classes
    │   ├── GameEngine.js
    │   ├── GameState.js
    │   ├── WorldManager.js
    │   ├── PlayerController.js
    │   ├── InputHandler.js
    │   ├── EntityFactory.js
    │   ├── AudioManager.js
    │   └── ChatManager.js
    ├── systems/         # Gameplay systems
    │   ├── SystemManager.js
    │   ├── BoatSystem.js
    │   ├── ChopSystem.js
    │   ├── MineSystem.js
    │   ├── InventoryManager.js
    │   ├── EntityAISystem.js
    │   ├── CatAI.js
    │   └── ParticleSystem.js
    ├── network/         # Multiplayer
    │   ├── NetworkManager.js
    │   ├── RemotePlayerManager.js
    │   ├── SeededRandom.js
    │   └── MessageProtocol.js
    └── services/        # External services
        └── LLMService.js
```

---

## Finding Code

### How to Find...

**...where player movement is handled:**
```
PlayerController.js → update() method
```

**...where trees are chopped:**
```
ChopSystem.js → update() method
InputHandler.js → getSelectedType() to check if axe is selected
```

**...where tool selection works:**
```
InputHandler.js → getSelectedType() returns current tool type from inventory
InputHandler.js → _updateHeldToolVisual() shows/hides tool in hand based on selection
InputHandler.js → _pickupNearestTool() picks up tools from ground with E key
```

**...where islands are generated:**
```
GameEngine.js → initGame() → createIslandAt() calls
EntityFactory.js → createIslandAt() method
```

**...where constants are defined:**
```
constants.js
```

**...where multiplayer events are handled:**
```
NetworkManager.js → _handleMessage()
GameEngine.js → _handleRemoteWorldEvent()
```

**...where audio plays:**
```
AudioManager.js → All methods (chop(), pickup(), etc.)
GameEngine.js → calls audio methods throughout
```

**...where NPC chat is handled:**
```
ChatManager.js
InputHandler.js → handlePickup() when clicking chief
```

---

## Common Modification Patterns

### Adding a New Entity

1. **Create in EntityFactory:**
   ```javascript
   createNewEntity(palette, x, z, style) {
       const g = new THREE.Group();
       // ... build mesh ...
       g.userData = { type: 'newEntity', ... };
       return g;
   }
   ```

2. **Add to island generation (if needed):**
   - In `GameEngine.initGame()`
   - Add spawning code for each island

3. **Add interaction (if needed):**
   - In `InputHandler.handlePickup()` or `handlePlace()`

### Adding a New Sound

1. **Add method to AudioManager:**
   ```javascript
   newSound() {
       this.chirp(frequencyStart, frequencyEnd, duration, volume);
   }
   ```

2. **Call from appropriate location:**
   ```javascript
   this.audio.newSound();
   ```

### Adding a New System

1. **Create system class:**
   ```javascript
   export default class NewSystem {
       update(dt, context) {
           // System logic
       }
   }
   ```

2. **Register in GameEngine constructor:**
   ```javascript
   this.newSystem = new NewSystem();
   this.systems.register('new', this.newSystem);
   ```

3. **Pass in context:**
   - Already included in ctx built in `animate()`

### Adding a New Constant

1. **Add to constants.js:**
   ```javascript
   export const NEW_CONSTANT = value;
   ```

2. **Import where used:**
   ```javascript
   import { NEW_CONSTANT } from '../constants.js';
   ```

### Modifying NPC Behavior

**Chat NPC (Chief):**
1. Modify `ChatManager.js` for UI flow
2. Modify `LLMService.js` for response logic
3. Modify lore file in `data/chief_lore.txt`

**Dialog NPC (Golem):**
1. Modify `EntityFactory.createStoneGolem()` for model
2. Modify `EntityAISystem.js` for animation
3. Modify `InputHandler.js` for interaction trigger

### Modifying Multiplayer

**Client-side:**
- NetworkManager.js for sending/receiving
- RemotePlayerManager.js for rendering

**Server-side:**
- server/index.js for relay logic

---

## Important Interfaces

### System Update Method

All systems must implement:
```javascript
update(dt, context) {
    // dt: delta time in seconds
    // context: { state, world, audio, factory, camera, playerController, playerCat, t, broadcastWorldEvent }
}
```

### Context Object

The context object is built each frame in `GameEngine.animate()`:
```javascript
const ctx = {
    state: this.state,
    world: this.world,
    audio: this.audio,
    factory: this.factory,
    camera: this.world.camera,
    playerController: this.playerController,
    playerCat: this.playerCat,
    t: t,
    broadcastWorldEvent: (action, x, z) => this.broadcastWorldEvent(action, x, z)
};
```

### GameState Properties

Key properties agents should know:
- `state.phase` - 'loading' or 'playing'
- `state.player` - Player position, velocity, camera
- `state.entities` - All interactive entities
- `state.foods` - Food items
- `state.islands` - Island data
- `state.inventory` - Player inventory
- `state.isOnBoat` - Boat state
- `state.interactionTarget` - Current highlighted entity

---

## Testing Considerations

### Manual Testing Checklist

When modifying gameplay logic:

1. **Single-player**: Test basic functionality
2. **Multiplayer**: Test with 2+ clients
3. **Edge cases**:
   - Empty inventory
   - Full inventory
   - Boundaries (island edge)
   - Boat collision

### Debugging Tips

**Print debugging:**
```javascript
console.log('State:', state.player.pos);
console.log('Entities:', state.entities.length);
```

**Visual debugging:**
- Add temporary particles
- Modify colors to highlight
- Use `world.add(testMesh)`

---

## Code Style Conventions

### Naming

- **Classes**: PascalCase (`GameEngine`, `BoatSystem`)
- **Methods**: camelCase (`update()`, `createTree()`)
- **Constants**: UPPER_SNAKE_CASE (`BOAT_MAX_SPEED`)
- **Files**: camelCase (`gameEngine.js`, `boatSystem.js`)

### Structure

- Use ES6 modules (`import`/`export`)
- Use classes for stateful objects
- Use functional style for simple transformations
- Keep systems focused (single responsibility)

### Comments

- Comment complex algorithms
- Document public APIs
- Keep comments updated with code changes

---

## File Dependencies

### Dependency Graph (Simplified)

```
main.js
  └── GameEngine
        ├── GameState (no deps)
        ├── WorldManager (no deps)
        ├── EntityFactory → WorldManager, GameState
        ├── PlayerController → WorldManager, GameState
        ├── InputHandler → GameEngine
        ├── AudioManager (no deps)
        ├── ChatManager → LLMService
        ├── SystemManager
        │     ├── BoatSystem
        │     ├── ChopSystem
        │     ├── MineSystem
        │     ├── InventoryManager
        │     ├── EntityAISystem
        │     ├── CatAI
        │     └── ParticleSystem
        └── Network
              ├── NetworkManager
              └── RemotePlayerManager → WorldManager
```

---

## Common Tasks

### Task: Change Tree Health

**Files to modify:**
1. `constants.js` → `CHOP_HITS`
2. Search for `CHOP_HITS` usage

### Task: Add New Island

**Files to modify:**
1. `constants.js` → Add to `ISLANDS` array
2. `GameEngine.initGame()` → Add generation code

### Task: Change Player Speed

**Files to modify:**
1. `constants.js` → `PLAYER_SPEED`
2. `GameState.js` → `player.speed` default

### Task: Add New Sound Effect

**Files to modify:**
1. `AudioManager.js` → Add method
2. Call in relevant system

### Task: Enable Real LLM

**Files to modify:**
1. `config.js` → Add API key
2. `LLMService.js` → Implement API call

---

## Performance Considerations

### Hot Paths (called every frame)

- `GameEngine.animate()` - Game loop
- `PlayerController.update()` - Movement
- `SystemManager.update()` - All systems
- `InputHandler.updateInteraction()` - Raycasting

### Optimization Tips

- Cache DOM references in setup
- Reuse geometries/materials where possible
- Limit raycasting frequency
- Use object pooling for particles (current leak)

---

## Known Issues (for reference)

| Issue | Location | Workaround |
|-------|----------|------------|
| Material leak | `EntityFactory.createParticle()` | Create pooled materials |
| Duplicate createLog | `EntityFactory.js` | Use single method |
| FOV mismatch | `WorldManager` vs `GameEngine` | Standardize |

---

## Getting Help

To understand specific functionality:

1. **Start with overview docs** (`01-overview.md`, `02-architecture.md`)
2. **Find relevant file** using this guide
3. **Read class/method docs** in source files
4. **Search for usage** with grep
5. **Test incrementally** with small changes

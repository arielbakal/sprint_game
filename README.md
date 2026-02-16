# Island Survival

A procedural 3D island survival game built entirely with vanilla JavaScript, Three.js, and Web Audio. No build step, no frameworks — just ES6 modules served directly to the browser with a retro pixel-art aesthetic.

![Three.js](https://img.shields.io/badge/Three.js-r128-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Controls](#controls)
- [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [Module Dependency Graph](#module-dependency-graph)
  - [File Reference](#file-reference)
- [Game Mechanics](#game-mechanics)
  - [World Generation](#world-generation)
  - [Islands](#islands)
  - [Resource Loop](#resource-loop)
  - [Creature Ecology](#creature-ecology)
  - [Boat Building & Sailing](#boat-building--sailing)
  - [Mining](#mining)
  - [Inventory System](#inventory-system)
  - [NPC Interaction](#npc-interaction)
- [Entity Catalog](#entity-catalog)
- [Configuration Reference](#configuration-reference)
- [Systems Architecture](#systems-architecture)
- [Multiplayer Roadmap](#multiplayer-roadmap)
- [Known Issues](#known-issues)
- [Deployment](#deployment)

---

## Overview

**Engine:** Three.js r128 (CDN) — procedural low-poly 3D with MeshToonMaterial  
**Audio:** Web Audio API oscillator synth + BeepBox generative music  
**Rendering:** Half-resolution (0.5x) with `image-rendering: pixelated` for a retro look  
**Font:** Press Start 2P (pixel font)  
**Architecture:** ES6 modules, client-side only, zero dependencies beyond CDN libraries

The player spawns on a procedurally-generated island archipelago with 5 unique islands. They can chop trees, build boats, sail between islands, mine gold, breed creatures, and chat with NPCs.

---

## Features

- Procedural world generation with unique palettes and entity DNA per session
- 5 interconnected islands with distinct biomes and resources
- Tree chopping → log collection → boat building pipeline
- Creature ecosystem with hunger, feeding, breeding, and egg hatching
- Companion cat that follows the player and boards boats
- Climbable mountains with physics-based height mapping
- Stone Golem NPC with dialog
- Chief Ruru NPC with LLM-ready chat interface
- First-person and third-person camera modes
- Procedural audio (all SFX synthesized at runtime)
- Generative background music via BeepBox
- Touch controls for mobile
- Particle systems for visual feedback

---

## Getting Started

### Prerequisites

A modern browser with ES6 module support (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+).

### Run Locally

```bash
# Clone the repository
git clone <your-repo-url>
cd sprint_game

# Serve with any static file server
npx serve base/modular
# or
python -m http.server 8000 --directory base/modular
# or
php -S localhost:8000 -t base/modular
```

Open `http://localhost:8000` in your browser. Click the canvas to lock your mouse and start playing.

### Deploy to Vercel

```bash
npm i -g vercel
cd base/modular
vercel
```

Or connect the GitHub repo to Vercel and set **Root Directory** to `base/modular`.

---

## Controls

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move (camera-relative) |
| **Mouse** | Orbit camera (when pointer-locked) |
| **Left Click** | Lock pointer / Chop tree / Mine rock / Interact / Place item |
| **Space** | Jump |
| **E** | Board/exit boat · Store/retrieve axe from inventory |
| **F** | Pick up / drop tools (axe, pickaxe) on ground |
| **G** | Toggle first-person / third-person camera |
| **1–8** | Select inventory slot |
| **Scroll** | Cycle inventory slots |
| **Escape** | Exit pointer lock / Close dialog |

### Touch Controls

| Gesture | Action |
|---------|--------|
| Swipe | Rotate camera |
| Quick tap | Chop (if targeting tree with axe) |

---

## Architecture

### Directory Structure

```
sprint_game/
├── README.md
└── base/
    ├── axe.html                    # Standalone axe model viewer (prototype)
    ├── player-controller.html      # Standalone player controller test (prototype)
    ├── stone-golem.html            # Standalone golem model viewer (prototype)
    ├── pocket-terrarium-refactored.html  # Monolithic predecessor (all-in-one)
    └── modular/                    # ← Active game
        ├── index.html              # Entry point, UI DOM, CDN imports
        ├── css/
        │   └── style.css           # All styles (696 lines)
        ├── data/
        │   └── chief_lore.txt      # Chief Ruru system prompt (Spanish)
        └── js/
            ├── main.js             # Bootstrap — instantiates GameEngine
            ├── config.js           # API keys & LLM endpoint config
            ├── constants.js        # Centralized magic numbers
            ├── classes/
            │   ├── GameEngine.js   # Main orchestrator & game loop
            │   ├── GameState.js    # All mutable game state
            │   ├── WorldManager.js # Three.js scene, camera, renderer, lighting
            │   ├── PlayerController.js  # Player model, movement, camera
            │   ├── InputHandler.js # Keyboard, mouse, touch, raycasting
            │   ├── EntityFactory.js # All entity/mesh creation
            │   ├── AudioManager.js # Web Audio synth SFX + BeepBox music
            │   └── ChatManager.js  # NPC chat UI lifecycle
            ├── systems/            # Extracted game systems
            │   ├── SystemManager.js
            │   ├── BoatSystem.js
            │   ├── ChopSystem.js
            │   ├── MineSystem.js
            │   ├── InventoryManager.js
            │   ├── EntityAISystem.js
            │   ├── CatAI.js
            │   └── ParticleSystem.js
            ├── network/            # Multiplayer networking
            │   ├── NetworkManager.js
            │   ├── RemotePlayerManager.js
            │   ├── SeededRandom.js
            │   └── MessageProtocol.js
            └── services/
                └── LLMService.js   # LLM integration (stub, returns fallback)
```

### Module Dependency Graph

```
main.js
  └── GameEngine
        ├── AudioManager
        ├── GameState
        ├── WorldManager (Three.js)
        ├── EntityFactory → WorldManager, GameState
        ├── PlayerController → WorldManager, GameState
        ├── ChatManager → LLMService
        ├── InputHandler → GameEngine (circular)
        └── Systems
              ├── SystemManager
              ├── BoatSystem → GameState, WorldManager, AudioManager, PlayerController
              ├── ChopSystem → GameState, WorldManager, AudioManager, EntityFactory
              ├── MineSystem → GameState, WorldManager, AudioManager
              ├── InventoryManager → GameState, AudioManager
              ├── EntityAISystem → GameState, WorldManager, AudioManager, EntityFactory
              ├── CatAI → GameState
              └── ParticleSystem → GameState, WorldManager
```

### File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | 72 | DOM structure, CDN script tags, UI elements |
| `main.js` | 9 | Entry point — `new GameEngine()` |
| `config.js` | 8 | API key, URL, model name for Gemini LLM |
| `constants.js` | ~110 | All magic numbers centralized |
| `GameEngine.js` | ~620 | Main loop, world init, system orchestration (refactored from 1532) |
| `GameState.js` | 88 | Mutable state container with `reset()` |
| `WorldManager.js` | 42 | Scene, camera, renderer, lighting, materials |
| `PlayerController.js` | 362 | Blocky character model, WASD movement, camera |
| `InputHandler.js` | 710 | Keyboard/mouse/touch input, raycasting, placement |
| `EntityFactory.js` | 886 | 20+ procedural entity creators |
| `AudioManager.js` | 152 | Oscillator SFX, BeepBox music, volume control |
| `ChatManager.js` | 105 | Chat UI, LLM message flow, lore loading |
| `LLMService.js` | 27 | Stub — random fallback responses |
| `SystemManager.js` | ~30 | System orchestrator (register, update, get) |
| `BoatSystem.js` | ~280 | Boarding animation, boat physics, cat boarding, proximity |
| `ChopSystem.js` | ~70 | Tree chopping (hit counting, progress bar, log spawn) |
| `MineSystem.js` | ~80 | Rock mining (progress bar, resource drops) |
| `InventoryManager.js` | ~100 | Slot management, stacking, auto-pickup, UI |
| `EntityAISystem.js` | ~160 | Creature AI (wander/eat/breed), golem, eggs, food production |
| `CatAI.js` | ~110 | Cat follow-player AI, island clamping, boarding queue |
| `ParticleSystem.js` | ~40 | Particle & debris physics cleanup |
| `NetworkManager.js` | ~155 | WebSocket client — connect, send state, receive updates |
| `RemotePlayerManager.js` | ~200 | Renders remote players as 3D characters with nametags |
| `SeededRandom.js` | ~45 | Deterministic PRNG (mulberry32) for world sync |
| `MessageProtocol.js` | ~45 | JSON encode/decode, message type constants |
| `server/index.js` | ~160 | Node.js WebSocket game server with world seed |
| `chief_lore.txt` | 9 | Spanish system prompt for Chief Ruru NPC |
| `style.css` | ~780 | Full UI styling, inventory icons, multiplayer panel |

---

## Game Mechanics

### World Generation

Each new world generates:
1. **Palette** — HSL-based color scheme derived from a random hue. Colors: background, baseRock, trunk, soil, groundTop, flora, tallGrass, creature, accent
2. **World DNA** — Randomized shapes for trees (cone/box/round/cylinder), bushes (sphere/cone), rocks (ico/box/dodec/slab), creatures (box/sphere, 1–3 eyes), grass height

Both are generated fresh on each "New World" reset.

### Islands

| # | Name | Position | Radius | Features |
|---|------|----------|--------|----------|
| 1 | Starting Shore | (0, 0) | 12 | Trees, bushes, rocks, flowers, grass, 3 creatures, Chief Ruru, axe, water plane |
| 2 | Flora Haven | (80, 0) | 14 | Dense vegetation, pickaxe, 3 creatures, unique palette |
| 3 | Ancient Peaks | (0, 110) | 28 | Climbable mountain, Stone Golem, 12 gold rocks, blue palette |
| 4 | Rocky Outpost | (-90, -50) | 11 | Sparse vegetation, 2 creatures |
| 5 | Distant Shores | (50, -100) | 13 | Moderate vegetation, 3 creatures |

Each island has a 3-layer terrain (base rock, soil, grass) generated with randomized vertex displacement.

### Resource Loop

```
Trees (x14 on island 1)
  ↓ chop (5 hits with axe, 0.4s interval)
Logs
  ↓ pick up (auto-pickup within 1.5 units)
Wood (inventory item, stackable)
  ↓ place on water (left-click with wood selected)
Logs (on water)
  ↓ cluster 4+ logs within radius 5
Boat (auto-assembled)
  ↓ board with E key
Sail to other islands!
```

### Creature Ecology

```
Creature spawns with hunger=0
  ↓ hunger increases at 0.1/sec
  ↓ seeks nearest food (produced by trees/bushes every 25s)
  ↓ eats food → hunger resets, eatenCount++
  ↓ if eatenCount >= 3 AND age > 8s → lays egg
  ↓ egg wobbles increasingly for 10s → hatches into baby creature
  ↓ hunger > 15 → shows "?" bubble + hungry sound
  ↓ hunger > 30 → creature dies (particle explosion)
```

Creatures wander randomly within their island boundary, seek food within 3 units, and eat food within 0.5 units.

### Boat Building & Sailing

- Place 4+ wood/logs on water within a radius of 5 units → automatically assembles into a boat
- Press **E** near a boat to board (3-phase animation: walk → hop → settle)
- Companion cat follows with a 1-second delay
- **WASD** controls boat: W/S = throttle, A/D = steering
- Boat collides with island edges and bounces
- Visual effects: wave bobbing, lean into turns, wake particles
- Press **E** again to disembark near the nearest island

### Mining

- Requires pickaxe (found on Island 2)
- Hold left-click on a rock or gold rock (5 hits, 0.4s interval)
- Drops 3 resource meshes on completion
- Gold rocks arranged in a ring around Island 3

### Inventory System

- 8 slots displayed at top of screen
- **Stackable items** (same type + same color hex): trees, bushes, rocks, grass, flowers, wood, food, axe
- **Non-stackable items**: creatures, eggs (each takes a unique slot)
- Click slot or press 1–8 to select; click again to deselect
- Left-click with selected item → places it in the world (raycast to ground/water)
- Scroll wheel cycles through occupied slots

### NPC Interaction

**Chief Ruru** (Island 1):
- Click to open chat interface
- Loads lore from `data/chief_lore.txt` as system prompt
- Currently returns random fallback responses (LLM integration is disabled)
- Character: paranoid but friendly island chief, speaks in third person

**Stone Golem** (Island 3):
- Click to open dialog box with fixed dialog: *"need. soul. soul. in. big. green. roof."*

---

## Entity Catalog

| Entity | Type Key | Created By | Features |
|--------|----------|------------|----------|
| Tree | `tree` | `createTree()` | Choppable (5 HP), produces food, obstacle, multiple shapes |
| Bush | `bush` | `createBush()` | Produces food every 25s |
| Rock | `rock` | `createRock()` | Decorative, multiple shapes |
| Gold Rock | `gold_rock` | `createGoldRock()` | Mineable with pickaxe, drops gold resources |
| Grass | `grass` | `createGrass()` | Decorative, grows |
| Flower | `flower` | `createFlower()` | Stem + petals + center |
| Creature | `creature` | `createCreature()` | AI-driven: hunger, wander, eat, breed |
| Chief | `chief` | `createChief()` | NPC with chat, golden crown |
| Stone Golem | `golem` | `createStoneGolem()` | Animated NPC, dialog, obstacle |
| Axe | `axe` | `createAxe()` | Tool, holdable, enables tree chopping |
| Pickaxe | `pickaxe` | `createPickaxe()` | Tool, holdable, enables mining |
| Boat | `boat` | `createBoat()` | Rideable vessel with sail |
| Cat | `cat` | `createCat()` | Companion, follows player, boards boats |
| Cloud | `cloud` | `createCloud()` | Drifts across sky, wraps at ±200 |
| Mountain | `mountain` | `createMountain()` | Climbable cone with snow cap |
| Egg | `egg` | `createEgg()` | Hatches into creature after 10s |
| Log | `log` | `createLog()` | Water-placeable, clusters into boats |
| Food | — | Inline mesh | Produced by trees/bushes, eaten by creatures |
| Particle | — | `createParticle()` | Visual feedback sprite with velocity |

---

## Configuration Reference

All game constants are centralized in `js/constants.js`:

| Constant | Value | Description |
|----------|-------|-------------|
| `GRAVITY` | 0.015 | Per-frame gravity applied to player |
| `JUMP_FORCE` | 0.2 | Initial upward velocity on jump |
| `PLAYER_SPEED` | 0.12 | Player walk speed |
| `CAMERA_DISTANCE` | 5.0 | Third-person camera orbit distance |
| `CAMERA_LERP` | 0.1 | Camera follow smoothing factor |
| `RENDER_SCALE` | 0.5 | Resolution multiplier (pixelated look) |
| `GROUND_LEVEL` | -1.4 | Base Y offset for entities (O_Y) |
| `CHOP_HITS` | 5 | Hits required to fell a tree |
| `MINE_HITS` | 5 | Hits required to mine a rock |
| `HIT_INTERVAL` | 0.4 | Seconds between chop/mine hits |
| `FOOD_PRODUCTION_INTERVAL` | 25 | Seconds between food spawns |
| `CREATURE_HUNGER_RATE` | 0.1 | Hunger increase per second |
| `CREATURE_HUNGER_WARNING` | 15 | Hunger level for "?" bubble |
| `CREATURE_HUNGER_DEATH` | 30 | Hunger level for death |
| `BREED_EAT_THRESHOLD` | 3 | Foods eaten to enable breeding |
| `BREED_AGE_THRESHOLD` | 8 | Minimum age (seconds) to breed |
| `EGG_HATCH_TIME` | 10 | Seconds until egg hatches |
| `PICKUP_RANGE` | 1.5 | Auto-pickup distance |
| `INTERACT_RANGE` | 3.0 | Interaction highlight distance |
| `BOAT_MAX_SPEED` | 0.12 | Maximum boat velocity |
| `BOAT_ACCELERATION` | 0.003 | Boat throttle acceleration |
| `BOAT_COLLISION_RADIUS` | 3.0 | Boat-to-island collision distance |
| `BOAT_LOG_CLUSTER_SIZE` | 4 | Logs needed to build a boat |
| `BOAT_LOG_CLUSTER_RADIUS` | 5 | Max distance between clustered logs |
| `CLOUD_COUNT` | 40 | Number of clouds spawned |
| `CLOUD_WRAP_DISTANCE` | 200 | Cloud wrapping boundary |
| `SENSITIVITY` | 0.002 | Mouse sensitivity |
| `INVENTORY_SLOTS` | 8 | Number of inventory slots |
| `PARTICLE_GRAVITY` | 0.002 | Particle fall speed |
| `PARTICLE_FADE_RATE` | 0.03 | Particle opacity decrease per frame |

---

## Systems Architecture

The game loop has been decomposed from a monolithic `animate()` method into focused, testable systems:

| System | Responsibility |
|--------|---------------|
| `SystemManager` | Registers and calls `update(dt)` on all systems in order |
| `BoatSystem` | Boarding animation, boat physics, steering, collisions, wake, cat boarding |
| `ChopSystem` | Tree chopping: hit counting, progress bar, tree→log conversion |
| `MineSystem` | Rock mining: hit counting, progress bar, resource drops |
| `InventoryManager` | Slot management, add/remove/update, stack merging, UI rendering |
| `EntityAISystem` | Creature hunger/wander/eat/breed, golem animation, egg hatching, food production |
| `CatAI` | Companion follow/idle, island clamping, leg animation |
| `ParticleSystem` | Particle and debris physics, lifecycle, cleanup |

### Game Loop Order

```
1.  Water animation (rotation + vertical bobbing)
2.  Boat/log bobbing animation
3.  Cloud drift
4.  SystemManager.update(dt):
    a. BoatSystem (boarding, physics)
    b. PlayerController (if not on boat)
    c. ChopSystem
    d. MineSystem
    e. InventoryManager (auto-pickup)
    f. EntityAISystem (creatures, golems, food, eggs)
    g. CatAI
    h. ParticleSystem
5.  Island indicator
6.  Render
```

---

## Multiplayer (Working)

The game now supports **real-time multiplayer** over WebSocket. Players see each other's blocky characters with distinct colors, nametags, and walk/action animations. World events (chopping trees, mining rocks) are broadcast so all players see the same world changes.

### How to Play Multiplayer

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```
   This starts the HTTP server on port 3000 and WebSocket server on port 3001.

3. **Open the game:** Navigate to `http://localhost:3000` in multiple browser tabs/windows.

4. **Connect:** In each tab, click the **CONNECT** button in the top-left multiplayer panel. The default URL is `ws://localhost:3001`.

5. **Play together:** All connected players share the same world (via server seed). You'll see other players as colored blocky characters with nametags.

### Multiplayer Features

| Feature | Status |
|---------|--------|
| Remote player models with nametags | ✅ Working |
| Position & rotation interpolation | ✅ Working |
| Walk & action animations for remotes | ✅ Working |
| Shared world seed (same terrain) | ✅ Working |
| Tree chop broadcast | ✅ Working |
| Rock mine broadcast | ✅ Working |
| Connect/Disconnect UI | ✅ Working |
| Toast notifications (join/leave) | ✅ Working |
| 8 distinct player colors | ✅ Working |

### Network Architecture

- **Client:** `NetworkManager` sends player state at 20 ticks/sec, receives remote updates. `RemotePlayerManager` renders/interpolates remote players.
- **Server:** Node.js + `ws` — relays player state and world events, assigns IDs, distributes world seed.
- **Protocol:** JSON over WebSocket (upgradeable to binary).
- **Seed sync:** Server generates a world seed; all clients use it via `SeededRandom` (mulberry32 PRNG) to produce identical island layouts.

### Future Multiplayer Roadmap

- Server-authoritative game state (anti-cheat)
- Client-side prediction & reconciliation
- Resource ownership/locking (one player chops a tree at a time)
- Multiplayer chat
- Lobby / room system

---

## Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| ~~E-key dual binding~~ | Fixed | Merged into single `else if` chain — boat boarding takes priority |
| ~~Fixed timestep~~ | Fixed | `animate()` now uses actual frame delta with 50ms cap |
| API key exposure | Low | `config.js` contains a Gemini API key (currently unused) |
| Material leak | Low | `EntityFactory.createParticle()` creates new `SpriteMaterial` each call |
| Duplicate `createLog` | Low | Two implementations in `EntityFactory.js` |
| Camera FOV mismatch | Low | `WorldManager` creates camera with FOV 50, `GameEngine` overwrites to 60 |
| LLM disconnected | Info | `LLMService` returns random strings; Gemini integration is commented out |

---

## Deployment

### Static Hosting (Vercel, Netlify, GitHub Pages)

The game is a pure static site. Set `base/modular` as the root directory.

**Vercel:**
```bash
cd base/modular && vercel
```

**GitHub Pages:** Set source to `base/modular` in repository settings.

### Multiplayer Server

```bash
npm install          # install ws dependency
npm run dev          # starts HTTP (port 3000) + WebSocket (port 3001)
```

### Local Development (single-player)

Any HTTP server works. The game uses ES6 modules (`type="module"`), so you cannot open `index.html` directly as a `file://` URL — it must be served over HTTP.

```bash
npm run serve        # serves base/modular on port 3000
```

---

## License

MIT
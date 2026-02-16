# Island Survival - Overview

## Project Description

Island Survival is a **procedural 3D browser game** built entirely with vanilla JavaScript and Three.js. Players spawn on a procedurally generated archipelago with 5 unique islands where they can:

- **Chop trees** → collect wood → build boats → sail between islands
- **Mine rocks** → collect resources (gold rocks on Island 3)
- **Breed creatures** → creatures eat food produced by trees/bushes → lay eggs → hatch babies
- **Interact with NPCs** → Chief Ruru (chat), Stone Golem (dialog)
- **Play multiplayer** → real-time WebSocket co-op

## Technology Stack

| Layer | Technology |
|-------|------------|
| 3D Engine | Three.js r128 (CDN) |
| Audio | Web Audio API (oscillator synth) + BeepBox generative music |
| Rendering | Half-resolution (0.5x) with `image-rendering: pixelated` |
| Font | Press Start 2P (pixel font) |
| Modules | ES6 modules (`type: "module"`) |
| Server | Node.js + ws (WebSocket) |
| Build | None - served directly via static HTTP server |

## Directory Structure

```
sprint_game/
├── README.md                    # Main documentation
├── package.json                 # Node dependencies (ws, serve)
├── server/
│   └── index.js               # HTTP + WebSocket server
└── base/
    ├── modular/                # ← Active game
    │   ├── index.html         # Entry point, UI DOM, CDN imports
    │   ├── css/style.css      # All styles (~780 lines)
    │   ├── data/
    │   │   └── chief_lore.txt # Chief Ruru system prompt (Spanish)
    │   └── js/
    │       ├── main.js        # Bootstrap: new GameEngine()
    │       ├── config.js      # API keys & LLM endpoint config
    │       ├── constants.js   # Centralized magic numbers
    │       ├── classes/
    │       │   ├── GameEngine.js      # Main orchestrator & game loop
    │       │   ├── GameState.js       # All mutable game state
    │       │   ├── WorldManager.js    # Three.js scene, camera, renderer
    │       │   ├── PlayerController.js # Player model, movement, camera
    │       │   ├── InputHandler.js    # Keyboard, mouse, touch, raycasting
    │       │   ├── EntityFactory.js   # All entity/mesh creation
    │       │   ├── AudioManager.js    # Web Audio synth SFX + music
    │       │   └── ChatManager.js     # NPC chat UI lifecycle
    │       ├── systems/
    │       │   ├── SystemManager.js
    │       │   ├── BoatSystem.js
    │       │   ├── ChopSystem.js
    │       │   ├── MineSystem.js
    │       │   ├── InventoryManager.js
    │       │   ├── EntityAISystem.js
    │       │   ├── CatAI.js
    │       │   └── ParticleSystem.js
    │       ├── network/
    │       │   ├── NetworkManager.js
    │       │   ├── RemotePlayerManager.js
    │       │   ├── SeededRandom.js
    │       │   └── MessageProtocol.js
    │       └── services/
    │           └── LLMService.js     # LLM stub (returns random fallbacks)
    └── [other prototype files]
```

## Key Features

### World Generation
- **Palette**: HSL-based color scheme derived from random hue each session
- **World DNA**: Randomized shapes for trees (cone/box/round/cylinder), bushes, rocks, creatures
- Both regenerated on "New World" reset

### Islands (5 total)
| # | Name | Position | Radius | Features |
|---|------|----------|--------|----------|
| 1 | Starting Shore | (0, 0) | 12 | Trees, bushes, rocks, flowers, grass, 3 creatures, Chief Ruru, axe, water |
| 2 | Flora Haven | (80, 0) | 14 | Dense vegetation, pickaxe, 3 creatures |
| 3 | Ancient Peaks | (0, 110) | 28 | Mountain (climbable), Stone Golem, 12 gold rocks |
| 4 | Rocky Outpost | (-90, -50) | 11 | Sparse vegetation, 2 creatures |
| 5 | Distant Shores | (50, -100) | 13 | Moderate vegetation, 3 creatures |

### Game Mechanics
- **Resource Loop**: Tree → chop (5 hits) → log → pickup → place on water → cluster 4+ → boat
- **Creature Ecology**: hunger (0.1/sec) → seek food → eat → breed (3 foods + 8s age) → lay egg → hatch
- **Boat Building**: Place 4+ wood/logs on water → auto-assemble → E to board → WASD to sail
- **Mining**: Pickaxe required → 5 hits on rock → 3 resource drops

### Multiplayer
- WebSocket-based real-time multiplayer
- Shared world seed (same terrain for all players)
- Remote players rendered as colored blocky characters with nametags
- Position/rotation interpolation, walk/action animations
- Events broadcast: tree chop, rock mine

## Running the Game

### Single Player (Static Server)
```bash
npx serve base/modular
# Open http://localhost:3000
```

### Multiplayer
```bash
npm install
npm run dev  # HTTP on :3000, WebSocket on :3001
# Open http://localhost:3000 in multiple tabs
# Click CONNECT button in multiplayer panel
```

## Architecture Overview

```
main.js
  └── GameEngine
        ├── AudioManager          # Synth SFX, BeepBox music
        ├── GameState             # Mutable state container
        ├── WorldManager          # Three.js scene, camera, renderer
        ├── EntityFactory         # Procedural entity creators
        ├── PlayerController      # Blocky character, movement, camera
        ├── InputHandler          # Keyboard/mouse/touch input
        ├── ChatManager           # NPC chat UI
        ├── SystemManager         # Orchestrates all systems
        │   ├── BoatSystem        # Boarding, physics, collisions
        │   ├── ChopSystem        # Tree chopping mechanics
        │   ├── MineSystem        # Rock/gold mining
        │   ├── InventoryManager  # Slot management, auto-pickup
        │   ├── EntityAISystem    # Creature AI, golem, eggs
        │   ├── CatAI             # Companion follow
        │   └── ParticleSystem    # Particles & debris
        └── Network (multiplayer)
              ├── NetworkManager         # WebSocket client
              ├── RemotePlayerManager    # Render remote players
              └── SeededRandom           # Deterministic PRNG
```

## Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| API key exposure | Low | `config.js` contains a Gemini API key (unused) |
| Material leak | Low | `createParticle()` creates new SpriteMaterial each call |
| Duplicate createLog | Low | Two implementations in EntityFactory.js |
| Camera FOV mismatch | Low | WorldManager creates FOV 50, GameEngine overwrites to 60 |
| LLM disconnected | Info | LLMService returns random strings; Gemini integration commented out |

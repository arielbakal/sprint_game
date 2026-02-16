# Game Controls

## Keyboard Controls

### Movement

| Key | Action |
|-----|--------|
| **W** | Move forward (camera-relative) |
| **A** | Move left (camera-relative) |
| **S** | Move backward (camera-relative) |
| **D** | Move right (camera-relative) |
| **Space** | Jump |

### Interaction

| Key | Action |
|-----|--------|
| **E** | Pick up nearby tool / Board/exit boat |
| **F** | (Now handled by E key) |
| **G** | Toggle first-person / third-person camera |
| **Left Click** | (With pointer lock) Chop tree / Mine rock / Interact |

### Inventory

| Key | Action |
|-----|--------|
| **1-8** | Select inventory slot |
| **Scroll** | Cycle through occupied inventory slots |

### System

| Key | Action |
|-----|--------|
| **Escape** | Exit pointer lock / Close dialog |
| **Click Canvas** | Lock pointer (enable camera control) |

---

## Mouse Controls

### Pointer Lock

The game uses **pointer lock** for camera control. Click on the game canvas to enable:

- **Mouse movement**: Orbit camera around player
- **ESC**: Exit pointer lock

### Custom Cursor

When pointer is unlocked, a custom cursor follows the mouse for targeting entities.

### Left Click Actions

With pointer lock enabled:

1. **If targeting tree + holding axe**: Start chopping
2. **If targeting rock + holding pickaxe**: Start mining  
3. **Otherwise**: Interact (pickup/place)

---

## Touch Controls

### Gestures

| Gesture | Action |
|---------|--------|
| **Swipe** | Rotate camera |
| **Quick tap** | Chop (if targeting tree with axe) |

### Touch Reticle

A reticle appears during touch input to show aim point.

---

## Boat Controls

### Boarding

1. Approach boat (within 6 units)
2. Press **E** to board
3. Cat follows after 1 second

### Sailing

| Key | Action |
|-----|--------|
| **W** | Accelerate forward |
| **S** | Brake / Reverse |
| **A** | Turn left |
| **D** | Turn right |
| **E** | Disembark (near island) |

---

## Camera Modes

### Third Person (Default)

- Camera orbits behind/above player
- Distance: 5 units
- Vertical angle: -0.3 to 1.5 radians (can look slightly down and up)
- Press **G** to switch

### First Person

- Camera at player eye level
- Full vertical look range
- Press **G** to switch

---

## Inventory Interaction

### Selecting Items

1. Press **1-8** to select slot
2. Or scroll to cycle through slots
3. Click selected slot again to deselect

### Placing Items

1. Select item in inventory
2. Look at valid placement target (ground or water)
3. Left-click to place

### Picking Up

1. Approach item
2. Left-click (with nothing selected) to pick up

---

## Axe/Pickaxe Management

### Picking Up

**From ground:**
- Approach axe/pickaxe
- Press **F** to pick up

**From inventory:**
- Press **E** while not holding tool
- Must have tool in inventory

### Holding

- Held in right hand
- Visible in third-person view

### Storing

- Press **E** while holding tool
- Stores in first available inventory slot

### Dropping

- Press **F** while holding tool
- Drops at player position

---

## NPC Interaction

### Chief Ruru

1. Approach Chief on Island 1
2. Left-click to interact
3. Chat interface opens
4. Type message and press Enter or click Send

### Stone Golem

1. Approach Golem on Island 3
2. Left-click to interact
3. Dialog box shows message

---

## World Reset

### New World

- Click "Reset" button in UI
- Triggers world explosion animation
- Generates new palette and DNA
- Respawns all entities

---

## Multiplayer

### Connecting

1. Start server: `npm run dev`
2. Open game in multiple tabs
3. Click **CONNECT** button in multiplayer panel
4. Enter WebSocket URL (default: `ws://localhost:3001`)

### Playing Together

- See other players as colored characters
- Nametags above heads
- Actions (chop, mine) visible
- World events sync (trees, rocks)

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                    MOVEMENT                             │
│  W/A/S/D     - Move (camera-relative)                  │
│  Space       - Jump                                     │
│  Mouse       - Orbit camera (when locked)               │
│  G           - Toggle 1st/3rd person                    │
├─────────────────────────────────────────────────────────┤
│                  INTERACTION                            │
│  E           - Board/exit boat OR store/pick tool       │
│  F           - Drop/pickup tool                         │
│  Left Click  - Chop/mine/interact (when locked)         │
├─────────────────────────────────────────────────────────┤
│                  INVENTORY                              │
│  1-8         - Select slot                              │
│  Scroll      - Cycle slots                             │
│  Click slot  - Select/deselect                          │
│  Click + selected - Place item                          │
├─────────────────────────────────────────────────────────┤
│                    SYSTEM                              │
│  ESC         - Exit pointer lock / Close dialog        │
│  Click       - Lock pointer (enable mouse control)     │
└─────────────────────────────────────────────────────────┘
```

---

## Control Troubleshooting

### Pointer Lock Not Working

- Click directly on the game canvas
- Ensure no dialogs are open
- Press ESC to exit any open UI

### Movement Not Working

- Check that pointer is locked (cursor hidden)
- Ensure game phase is 'playing'

### Can't Chop Trees

- Must have axe in hand (held with F or E)
- Must be within 3.5 units of tree

### Can't Mine Rocks

- Must have pickaxe in hand
- Must be within 3.5 units of rock

### Can't Place Items

- Check placement range (12 units for ground, 15 for water)
- Ensure looking at valid surface

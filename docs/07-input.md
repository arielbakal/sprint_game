# Input Handling

## InputHandler Overview

**Location**: `base/modular/js/classes/InputHandler.js`

The `InputHandler` class processes all user input: keyboard, mouse, and touch. It also handles raycasting for entity interaction.

### Constructor

```javascript
constructor(engine) {
    this.engine = engine;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.setupKeyboard();
    this.setupMouse();
    this.setupTouch();
}
```

---

## Keyboard Input

**Keys and Actions**:

| Key | Action |
|-----|--------|
| **W** | Move forward (camera-relative) |
| **A** | Move left |
| **S** | Move backward |
| **D** | Move right |
| **Space** | Jump |
| **E** | Pick up nearby tool / Board/exit boat |
| **F** | (Previously drop/pickup tools - now handled by E) |
| **G** | Toggle first/third person camera |
| **1-8** | Select inventory slot |
| **Escape** | Exit pointer lock |

### State Updates

```javascript
document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    
    // Movement
    if (k === 'w') state.inputs.w = true;
    if (k === 'a') state.inputs.a = true;
    if (k === 's') state.inputs.s = true;
    if (k === 'd') state.inputs.d = true;
    if (k === ' ') state.inputs.space = true;
    
    // Inventory
    const idx = parseInt(k) - 1;
    if (idx >= 0 && idx < 8) {
        if (state.selectedSlot === idx) {
            state.selectedSlot = null;
        } else if (state.inventory[idx]) {
            state.selectedSlot = idx;
        }
        audio.select();
        engine.updateInventory();
    }
    
    // E key - tool pickup / boat
    if (k === 'e' && state.phase === 'playing' && !state.isBoardingBoat) {
        if (this._nearestTool) {
            this._pickupNearestTool();
        } else if (state.isOnBoat) {
            engine.disembarkBoat();
        } else if (engine._nearestBoat) {
            engine.boardBoat(engine._nearestBoat);
        }
    }
    
    // G key - camera mode
    if (k === 'g' && state.phase === 'playing') {
        state.player.cameraMode = 
            state.player.cameraMode === 'third' ? 'first' : 'third';
        audio.select();
    }
});

document.addEventListener('keyup', (e) => {
    // Reset movement flags
    if (k === 'w') state.inputs.w = false;
    if (k === 'a') state.inputs.a = false;
    if (k === 's') state.inputs.s = false;
    if (k === 'd') state.inputs.d = false;
    if (k === ' ') state.inputs.space = false;
});
```

---

## Mouse Input

### Pointer Lock

The game uses **pointer lock** for immersive camera control:

```javascript
renderer.domElement.addEventListener('click', () => {
    if (state.phase === 'playing' && !document.pointerLockElement) {
        // Don't lock if clicking on UI
        const dialog = document.getElementById('dialog-box');
        if (dialog && dialog.style.display === 'flex') return;
        
        renderer.domElement.requestPointerLock();
    }
});
```

### Camera Control

```javascript
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        // Orbit camera
        state.player.cameraAngle.x -= e.movementX * state.sensitivity;
        state.player.cameraAngle.y += e.movementY * state.sensitivity;
        
        // Clamp vertical angle (TPS: -0.3 to 1.5 radians)
        state.player.cameraAngle.y = Math.max(
            -0.3, 
            Math.min(1.5, state.player.cameraAngle.y)
        );
    } else {
        // Update custom cursor position
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});
```

### Left Click - Action

```javascript
renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (state.phase !== 'playing') return;
    if (!document.pointerLockElement) return;
    if (state.isOnBoat) return;
    
    const selectedType = this.getSelectedType();
    
    // Start chopping (if targeting tree and axe slot selected)
    if (state.interactionTarget && 
        state.interactionTarget.userData.choppable && 
        selectedType === 'axe') {
        state.isChopping = true;
        state.chopTimer = 0;
        return;
    }
    
    // Start mining (if pickaxe slot selected and targeting rock)
    if (selectedType === 'pickaxe' && state.interactionTarget) {
        const type = state.interactionTarget.userData.type;
        if (type === 'rock' || type === 'gold_rock') {
            state.isMining = true;
            state.mineTimer = 0;
            return;
        }
    }
    
    // Otherwise handle interaction (pickup/place)
    handleInteraction();
});

renderer.domElement.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    state.isChopping = false;
    state.isMining = false;
});
```

### Scroll - Inventory

```javascript
window.addEventListener('wheel', (e) => {
    if (state.phase !== 'playing') return;
    
    // Cycle slots
    if (e.deltaY > 0) {
        // Scroll down
        state.selectedSlot = (state.selectedSlot === null) ? 0 : 
                           (state.selectedSlot + 1) % 8;
    } else {
        // Scroll up
        state.selectedSlot = (state.selectedSlot === null) ? 7 : 
                           (state.selectedSlot + 7) % 8;
    }
    
    // Skip empty slots
    if (!state.inventory[state.selectedSlot]) {
        for (let i = 0; i < 8; i++) {
            if (state.inventory[i]) {
                state.selectedSlot = i;
                break;
            }
        }
    }
    
    audio.select();
    engine.updateInventory();
});
```

### Pointer Lock Change

```javascript
document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
        cursor.style.display = 'none';
    } else {
        cursor.style.display = 'block';
        cursor.style.left = state.mouseX + 'px';
        cursor.style.top = state.mouseY + 'px';
    }
});
```

---

## Touch Input

### Setup

```javascript
setupTouch() {
    let touchStartPos = { x: 0, y: 0 };
    let touchStartTime = 0;
    let isTouchActive = false;
    
    window.addEventListener('touchstart', (e) => {
        if (state.phase !== 'playing') return;
        
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        touchStartTime = performance.now();
        isTouchActive = true;
        
        // Show reticle
        if (reticle) {
            reticle.style.left = touch.clientX + 'px';
            reticle.style.top = touch.clientY + 'px';
            reticle.style.display = 'block';
        }
    });
    
    window.addEventListener('touchmove', (e) => {
        if (!isTouchActive || state.phase !== 'playing') return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        
        // Rotate camera
        state.player.cameraAngle.x -= dx * 0.005;
        state.player.cameraAngle.y += dy * 0.005;
        state.player.cameraAngle.y = Math.max(
            0.1, 
            Math.min(Math.PI / 2 - 0.1, state.player.cameraAngle.y)
        );
        
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        if (reticle) {
            reticle.style.left = touch.clientX + 'px';
            reticle.style.top = touch.clientY + 'px';
        }
    });
    
    window.addEventListener('touchend', (e) => {
        if (!isTouchActive) return;
        isTouchActive = false;
        
        if (reticle) reticle.style.display = 'none';
        
        const dt = performance.now() - touchStartTime;
        
        // Short tap = interact
        if (dt < 250) {
            if (state.interactionTarget && 
                state.interactionTarget.userData.choppable && 
                state.heldAxe) {
                state.isChopping = true;
                state.chopTimer = 0;
                setTimeout(() => { state.isChopping = false; }, 500);
            }
        }
    });
}
```

---

## Interaction Handling

### Raycasting Setup

```javascript
// Setup raycaster from camera center
this.raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);
```

### handleInteraction()

```javascript
handleInteraction() {
    const { state, world, factory, audio } = this.engine;
    
    // If holding item in inventory, try to place it
    if (state.selectedSlot !== null && state.inventory[state.selectedSlot]) {
        this.handlePlace();
        return;
    }
    
    // Otherwise try to pick up
    this.handlePickup();
}
```

### handlePlace()

Places items from inventory into the world:

```javascript
handlePlace() {
    const item = state.inventory[state.selectedSlot];
    if (!item) return;
    
    // Check water placement (for wood/log → boat building)
    if ((item.type === 'wood' || item.type === 'log') && engine.waterMesh) {
        const waterHits = raycaster.intersectObject(engine.waterMesh);
        
        if (waterHits.length && waterHits[0].distance < 15) {
            // Place log on water
            const log = factory.createLog(item.color, point.x, point.z);
            world.add(log);
            state.entities.push(log);
            engine.logs.push(log);
            
            // Particles
            for (let i = 0; i < 8; i++) {
                factory.createParticle(point, item.color);
            }
            
            // Decrement count
            item.count--;
            if (item.count <= 0) {
                state.inventory[state.selectedSlot] = null;
                state.selectedSlot = null;
            }
            engine.updateInventory();
            
            // Check for boat build
            checkForBoat();
            return;
        }
    }
    
    // Ground placement
    const groundHits = [];
    engine.groundPlanes.forEach(gp => {
        const hits = raycaster.intersectObject(gp);
        groundHits.push(...hits);
    });
    groundHits.sort((a, b) => a.distance - b.distance);
    
    if (groundHits.length && groundHits[0].distance < 12) {
        // Create entity from item
        const entity = createEntityFromItem(item, point);
        if (entity) {
            for (let i = 0; i < 8; i++) {
                factory.createParticle(point, item.color);
            }
            
            // Decrement
            item.count--;
            if (item.count <= 0) {
                state.inventory[state.selectedSlot] = null;
                state.selectedSlot = null;
            }
            engine.updateInventory();
        }
    }
}
```

### handlePickup()

Picks up entities and food:

```javascript
handlePickup() {
    // 1. Check foods first (closer range)
    const foodHits = raycaster.intersectObjects(state.foods, true);
    if (foodHits.length && foodHits[0].distance < 8) {
        const food = foodHits[0].object;
        addToInventory('food', food.material.color);
        world.remove(food);
        state.foods.splice(idx, 1);
        return;
    }
    
    // 2. Check entities
    const entityHits = raycaster.intersectObjects(state.entities, true);
    if (entityHits.length && entityHits[0].distance < 8) {
        const root = findRoot(entityHits[0].object);
        
        // NPC interactions
        if (root.userData.type === 'chief') {
            engine.chatManager.openChat(root);
            return;
        }
        
        if (root.userData.type === 'golem') {
            showDialog(root.userData.dialog);
            return;
        }
        
        if (root.userData.type === 'boat') {
            return;  // Board with E, not pickup
        }
        
        // Tools
        if (root.userData.type === 'axe') {
            state.heldAxe = root;
            engine.playerController.holdItem(root);
            return;
        }
        
        // Pickup items
        if (root.userData.type && root.userData.type !== 'tree') {
            const invType = root.userData.type === 'log' ? 'wood' : root.userData.type;
            if (addToInventory(invType, root.userData.color, styleData, age)) {
                world.remove(root);
                state.entities.splice(idx, 1);
            }
        }
    }
}
```

---

## updateInteraction()

Called every frame to highlight interactable entities:

```javascript
updateInteraction() {
    if (state.phase !== 'playing') return;
    if (state.isOnBoat) return;
    
    const playerPos = state.player.pos;
    const interactRange = 3.0;
    
    // Find nearest choppable tree
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const e of state.entities) {
        if (!e.userData.choppable) continue;
        
        const dist = distance(playerPos, e.position);
        if (dist < interactRange && dist < nearestDist) {
            nearestDist = dist;
            nearest = e;
        }
    }
    
    // Clear old highlight
    if (state.interactionTarget && state.interactionTarget !== nearest) {
        setHighlight(state.interactionTarget, false);
    }
    
    // Set new target
    state.interactionTarget = nearest;
    if (nearest) {
        setHighlight(nearest, true);
    }
}
```

### Highlight Effect

```javascript
setHighlight(entity, on) {
    entity.traverse(child => {
        if (child.material && child.material.emissive) {
            child.material.emissive.setHex(
                on ? 0x222222 : 0x000000
            );
        }
    });
}
```

---

## Tool Handling

### dropTool()

```javascript
dropTool(type) {
    let tool = type === 'axe' ? state.heldAxe : state.heldPickaxe;
    if (!tool) return;
    
    // Detach from hand
    playerController.heldItem = null;
    if (type === 'axe') state.heldAxe = null;
    if (type === 'pickaxe') state.heldPickaxe = null;
    
    // Reattach to world
    tool.position.copy(state.player.pos);
    tool.position.y = factory.O_Y + 0.1;
    tool.rotation.y = Math.random() * Math.PI * 2;
    tool.scale.set(1, 1, 1);
    
    world.add(tool);
    state.entities.push(tool);
    audio.pickup();
}
```

### tryPickupTool()

```javascript
tryPickupTool() {
    let nearest = null;
    let nearestDist = 4;
    
    for (const e of state.entities) {
        if (e.userData.type !== 'axe' && e.userData.type !== 'pickaxe') continue;
        
        const dist = state.player.pos.distanceTo(e.position);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = e;
        }
    }
    
    if (nearest) {
        // Remove from world
        const idx = state.entities.indexOf(nearest);
        state.entities.splice(idx, 1);
        world.remove(nearest);
        
        // Attach to hand
        if (nearest.userData.type === 'axe') state.heldAxe = nearest;
        if (nearest.userData.type === 'pickaxe') state.heldPickaxe = nearest;
        
        playerController.holdItem(nearest);
        audio.pickup();
    }
}
```

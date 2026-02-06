// =====================================================
// INPUT HANDLER - THIRD PERSON CONTROLS + BOAT
// =====================================================

export default class InputHandler {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupKeyboard();
        this.setupMouse();
        this.setupTouch();
    }

    setupKeyboard() {
        const state = this.engine.state;
        const sfx = this.engine.audio;
        document.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w') state.inputs.w = true;
            if (k === 'a') state.inputs.a = true;
            if (k === 's') state.inputs.s = true;
            if (k === 'd') state.inputs.d = true;
            if (k === ' ') state.inputs.space = true;
            // Inventory slots
            const idx = parseInt(k) - 1;
            if (idx >= 0 && idx < 8) {
                if (state.selectedSlot === idx) { state.selectedSlot = null; sfx.select(); }
                else if (state.inventory[idx]) { state.selectedSlot = idx; sfx.select(); }
                this.engine.updateInventory();
            }
            // ESC to exit pointer lock (browser handles this, we just update UI in pointerlockchange)
            if (k === 'escape') {
                if (document.pointerLockElement) document.exitPointerLock();
            }
            // G to toggle camera mode (First/Third person)
            if (k === 'g' && state.phase === 'playing') {
                state.player.cameraMode = state.player.cameraMode === 'third' ? 'first' : 'third';
                sfx.select();
                // If switching to first person, reset vertical angle for better view
                if (state.player.cameraMode === 'first') state.player.cameraAngle.y = 0.0;
            }
            // E to board/exit boat
            if (k === 'e' && state.phase === 'playing' && !state.isBoardingBoat) {
                if (state.isOnBoat) {
                    this.engine.disembarkBoat();
                } else if (this.engine._nearestBoat) {
                    this.engine.boardBoat(this.engine._nearestBoat);
                }
            }
            // F to pick up/drop axe
            if (k === 'f' && state.phase === 'playing' && !state.isOnBoat) {
                if (state.heldAxe) {
                    this.dropAxe();
                } else {
                    this.tryPickupAxe();
                }
            }
        });
        document.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w') state.inputs.w = false;
            if (k === 'a') state.inputs.a = false;
            if (k === 's') state.inputs.s = false;
            if (k === 'd') state.inputs.d = false;
            if (k === ' ') state.inputs.space = false;
        });
    }

    setupMouse() {
        const renderer = this.engine.world.renderer;
        const state = this.engine.state;
        const cursor = document.getElementById('custom-cursor');

        // Request pointer lock on click
        renderer.domElement.addEventListener('click', () => {
            if (state.phase === 'playing' && !document.pointerLockElement) {
                renderer.domElement.requestPointerLock();
            }
        });

        // Camera control via mouse movement when locked
        document.addEventListener('mousemove', (e) => {
            if (state.phase !== 'playing') return;
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;

            // Third-person camera orbit
            if (document.pointerLockElement === renderer.domElement) {
                state.player.cameraAngle.x -= e.movementX * state.sensitivity;
                state.player.cameraAngle.y += e.movementY * state.sensitivity;
                state.player.cameraAngle.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.player.cameraAngle.y));
            } else {
                // Update custom cursor position
                if (cursor) {
                    cursor.style.left = e.clientX + 'px';
                    cursor.style.top = e.clientY + 'px';
                }
            }
        });

        // Scroll — cycle inventory
        window.addEventListener('wheel', (e) => {
            if (state.phase !== 'playing') return;
            if (e.deltaY > 0) state.selectedSlot = (state.selectedSlot === null ? 0 : (state.selectedSlot + 1) % 8);
            else state.selectedSlot = (state.selectedSlot === null ? 7 : (state.selectedSlot + 7) % 8);
            if (!state.inventory[state.selectedSlot]) {
                for (let i = 0; i < 8; i++) { if (state.inventory[i]) { state.selectedSlot = i; break; } }
            }
            this.engine.audio.select();
            this.engine.updateInventory();
        });

        // --- Pointer lock change handler ---
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === renderer.domElement) {
                cursor.style.display = 'none';
            } else {
                cursor.style.display = 'block';
                cursor.style.left = state.mouseX + 'px';
                cursor.style.top = state.mouseY + 'px';
            }
        });

        // Left click: start chopping if interacting with tree, OR place/pickup items
        renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (state.phase !== 'playing') return;
            if (!document.pointerLockElement) return;
            if (state.isOnBoat) return; // No interaction while sailing

            // Start chopping if interactionTarget is a choppable tree AND player has axe
            if (state.interactionTarget && state.interactionTarget.userData.choppable && state.heldAxe) {
                state.isChopping = true;
                state.chopTimer = 0;
                return;
            }

            // Otherwise, try to interact with nearby entities
            this.handleInteraction();
        });

        renderer.domElement.addEventListener('mouseup', (e) => {
            if (e.button !== 0) return;
            state.isChopping = false;
        });
    }

    handleInteraction() {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;

        // Set up raycaster from camera center
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);

        const playerPos = state.player.pos;

        // If holding the axe, drop it
        if (state.heldAxe) {
            this.dropAxe();
            return;
        }

        // If holding an item in inventory, try to place it
        if (state.selectedSlot !== null && state.inventory[state.selectedSlot]) {
            this.handlePlace();
            return;
        }

        // Otherwise, try to pick up nearby items
        this.handlePickup();
    }

    dropAxe() {
        const state = this.engine.state;
        const world = this.engine.world;
        const sfx = this.engine.audio;

        if (!state.heldAxe) return;

        // Detach from player hand
        this.engine.playerController.holdItem(null);

        // Re-attach to world
        const axe = state.heldAxe;
        state.heldAxe = null;

        // Position at player's feet
        axe.position.copy(state.player.pos);
        axe.position.y = this.engine.factory.O_Y + 0.1;

        // Add random rotation
        axe.rotation.y = Math.random() * Math.PI * 2;

        world.add(axe);
        state.entities.push(axe);

        sfx.pickup();
    }

    tryPickupAxe() {
        const state = this.engine.state;
        const world = this.engine.world;
        const sfx = this.engine.audio;

        if (state.heldAxe) return;

        // Find nearest axe
        let nearestAxe = null;
        let nearestDist = 4;

        for (const e of state.entities) {
            if (e.userData.type !== 'axe') continue;
            const dist = state.player.pos.distanceTo(e.position);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestAxe = e;
            }
        }

        if (nearestAxe) {
            sfx.pickup();
            // Remove from world entities
            const idx = state.entities.indexOf(nearestAxe);
            if (idx > -1) state.entities.splice(idx, 1);
            world.remove(nearestAxe);
            // Attach to player's hand
            state.heldAxe = nearestAxe;
            this.engine.playerController.holdItem(nearestAxe);
        }
    }

    handlePlace() {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        const it = state.inventory[state.selectedSlot];
        if (!it) return;

        // Check if placing on water (for log/boat building)
        if ((it.type === 'wood' || it.type === 'log') && this.engine.waterMesh) {
            const waterHits = this.raycaster.intersectObject(this.engine.waterMesh);
            if (waterHits.length && waterHits[0].distance < 15) {
                sfx.place();
                const p = waterHits[0].point;
                const logColor = it.color || new THREE.Color(0x8B4513);
                const log = factory.createLog(logColor, p.x, p.z);
                world.add(log);
                state.entities.push(log);
                this.engine.logs.push(log);
                for (let i = 0; i < 8; i++) factory.createParticle(p, logColor);
                it.count = (it.count || 1) - 1;
                if (it.count <= 0) { state.inventory[state.selectedSlot] = null; state.selectedSlot = null; }
                this.engine.updateInventory();
                this.checkForBoat();
                this.updateBuildProgress();
                return;
            }
        }

        // Check ground planes for placement
        const allHits = [];
        this.engine.groundPlanes.forEach(gp => {
            const hits = this.raycaster.intersectObject(gp);
            hits.forEach(h => allHits.push(h));
        });
        allHits.sort((a, b) => a.distance - b.distance);

        if (allHits.length && allHits[0].distance < 12) {
            sfx.place();
            const p = allHits[0].point;
            const ent = this.createEntityFromItem(it, p);
            if (ent) {
                for (let i = 0; i < 8; i++) factory.createParticle(p, it.color);
                it.count = (it.count || 1) - 1;
                if (it.count <= 0) { state.inventory[state.selectedSlot] = null; state.selectedSlot = null; }
                this.engine.updateInventory();
            }
        }
    }

    handlePickup() {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;

        // Check foods
        const foodHits = this.raycaster.intersectObjects(state.foods, true);
        if (foodHits.length && foodHits[0].distance < 8) {
            const f = foodHits[0].object;
            sfx.pickup();
            const color = f.material.color;
            const success = this.engine.addToInventory('food', color, null, 0);
            if (success) {
                const center = f.position.clone();
                for (let i = 0; i < 15; i++) factory.createParticle(center, color, 1.0);
                world.remove(f);
                const idx = state.foods.indexOf(f);
                if (idx > -1) state.foods.splice(idx, 1);
            } else sfx.pop();
            return;
        }

        // Check entities
        const hits = this.raycaster.intersectObjects(state.entities, true);
        if (hits.length && hits[0].distance < 8) {
            let root = hits[0].object;
            while (root.parent && root.parent !== world.scene) root = root.parent;

            if (root.userData.type === 'chief') {
                document.exitPointerLock();
                const d = document.getElementById('dialog-box');
                if (d) {
                    d.style.display = 'flex';
                    document.getElementById('dialog-text').innerHTML = "CHIEF:<br>This island is my home.<br>You're welcome to stay!";
                }
                sfx.sing();
                return;
            }

            if (root.userData.type === 'boat') {
                // Boats are boarded with E key, not picked up
                return;
            }

            // Check for axe - pick up and hold in hand
            if (root.userData.type === 'axe') {
                // Check if player is close enough
                const dist = state.player.pos.distanceTo(root.position);
                if (dist < 4) {
                    sfx.pickup();
                    // Remove from world entities
                    const idx = state.entities.indexOf(root);
                    if (idx > -1) state.entities.splice(idx, 1);
                    world.remove(root);
                    // Attach to player's hand
                    state.heldAxe = root;
                    this.engine.playerController.holdItem(root);
                }
                return;
            }

            if (root.userData.type && root.userData.type !== 'tree') {
                sfx.pickup();
                let styleData = root.userData.style;
                if (root.userData.type === 'egg') styleData = root.userData.parentDNA;
                const pickupType = root.userData.type;
                const invType = pickupType === 'log' ? 'wood' : pickupType;
                const success = this.engine.addToInventory(invType, root.userData.color, styleData, root.userData.age);
                if (success) {
                    const center = root.position.clone();
                    center.y += 0.5;
                    for (let i = 0; i < 25; i++) factory.createParticle(center, root.userData.color, 1.5);
                    world.remove(root);
                    const idx = state.entities.indexOf(root);
                    if (idx > -1) state.entities.splice(idx, 1);
                    if (state.obstacles.includes(root)) state.obstacles.splice(state.obstacles.indexOf(root), 1);
                    // Remove from logs array if it's a log
                    if (pickupType === 'log') {
                        const logIdx = this.engine.logs.indexOf(root);
                        if (logIdx > -1) this.engine.logs.splice(logIdx, 1);
                        this.updateBuildProgress();
                    }
                } else sfx.pop();
            }
        }
    }

    createEntityFromItem(it, p) {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        let ent = null;

        if (it.type === 'tree') ent = factory.createTree(state.palette, p.x, p.z, it.style);
        if (it.type === 'bush') ent = factory.createBush(state.palette, p.x, p.z, it.style);
        if (it.type === 'rock') ent = factory.createRock(state.palette, p.x, p.z, it.style);
        if (it.type === 'grass') ent = factory.createGrass(state.palette, p.x, p.z, it.style);
        if (it.type === 'flower') ent = factory.createFlower(state.palette, p.x, p.z, it.style);
        if (it.type === 'wood' || it.type === 'log') {
            ent = factory.createLog(it.color, p.x, p.z);
            this.engine.logs.push(ent);
        }
        if (it.type === 'creature') {
            ent = factory.createCreature(state.palette, p.x, p.z, it.style);
            if (it.age) ent.userData.age = it.age;
        }
        if (it.type === 'egg') {
            ent = factory.createEgg(p, it.color, it.style);
        }
        if (it.type === 'food') {
            ent = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15), factory.getMat(it.color));
            ent.position.copy(p);
            ent.position.y = factory.O_Y + 0.15;
            ent.scale.set(0, 0, 0);
            world.add(ent);
            state.foods.push(ent);
            return ent;
        }

        if (ent) {
            world.add(ent);
            state.entities.push(ent);
        }
        return ent;
    }

    checkForBoat() {
        const logs = this.engine.logs;
        if (logs.length < 4) return;

        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        const state = this.engine.state;

        const boatRadius = 5;
        const visited = new Set();

        for (let i = 0; i < logs.length; i++) {
            if (visited.has(i)) continue;
            const cluster = [i];
            visited.add(i);

            for (let j = i + 1; j < logs.length; j++) {
                if (visited.has(j)) continue;
                const dist = logs[i].position.distanceTo(logs[j].position);
                if (dist < boatRadius) {
                    cluster.push(j);
                    visited.add(j);
                }
            }

            if (cluster.length >= 4) {
                let centerX = 0, centerZ = 0;
                let boatColor = logs[cluster[0]].userData.color;
                cluster.forEach(idx => {
                    centerX += logs[idx].position.x;
                    centerZ += logs[idx].position.z;
                    world.remove(logs[idx]);
                    const entIdx = state.entities.indexOf(logs[idx]);
                    if (entIdx > -1) state.entities.splice(entIdx, 1);
                });
                centerX /= cluster.length;
                centerZ /= cluster.length;

                const boat = factory.createBoat(centerX, centerZ, boatColor);
                world.add(boat);
                state.entities.push(boat);
                sfx.boatBuild();
                for (let k = 0; k < 30; k++) {
                    factory.createParticle({ x: centerX, y: -1.5, z: centerZ }, boatColor, 2.0);
                }

                // Clean up logs array
                const clusterSet = new Set(cluster);
                this.engine.logs = this.engine.logs.filter((_, idx) => !clusterSet.has(idx));
                this.updateBuildProgress();
                return;
            }
        }
    }

    updateBuildProgress() {
        const logCount = this.engine.logs.length;
        const progress = this.engine.ui.boatBuildProgress;
        if (progress) {
            if (logCount > 0 && logCount < 4) {
                progress.style.display = 'block';
                progress.textContent = `🪵 LOGS: ${logCount}/4`;
            } else {
                progress.style.display = 'none';
            }
        }
    }

    // Called each frame by GameEngine to check interaction targets
    updateInteraction() {
        const state = this.engine.state;
        if (state.phase !== 'playing') return;
        if (state.isOnBoat) return;

        const playerPos = state.player.pos;
        const interactRange = 3.0;

        // Find nearest choppable tree
        let nearest = null;
        let nearestDist = Infinity;
        for (const e of state.entities) {
            if (!e.userData.choppable) continue;
            const dx = e.position.x - playerPos.x;
            const dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < interactRange && dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }

        // Clear highlight on old target
        if (state.interactionTarget && state.interactionTarget !== nearest) {
            this.setHighlight(state.interactionTarget, false);
            if (state.interactionTarget !== nearest) {
                state.chopProgress = 0;
            }
        }

        // Set new target
        state.interactionTarget = nearest;
        if (nearest) {
            this.setHighlight(nearest, true);
        }

        // Show/hide axe hint
        const axeHint = document.getElementById('axe-hint');
        if (axeHint) {
            if (!state.heldAxe) {
                let nearAxe = false;
                for (const e of state.entities) {
                    if (e.userData.type !== 'axe') continue;
                    const dist = state.player.pos.distanceTo(e.position);
                    if (dist < 4) { nearAxe = true; break; }
                }
                axeHint.style.display = nearAxe ? 'block' : 'none';
                if (nearAxe) {
                    axeHint.textContent = 'Press F to pick up Axe';
                }
            } else {
                axeHint.style.display = 'block';
                axeHint.textContent = 'Press F to drop Axe';
            }
        }
    }

    setHighlight(entity, on) {
        entity.traverse(child => {
            if (child.material && child.material.emissive) {
                child.material.emissive.setHex(on ? 0x222222 : 0x000000);
            }
        });
    }

    setupTouch() {
        const state = this.engine.state;
        const sfx = this.engine.audio;
        const reticle = document.getElementById('touch-reticle');
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
            state.player.cameraAngle.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.player.cameraAngle.y));

            touchStartPos = { x: touch.clientX, y: touch.clientY };

            if (reticle) {
                reticle.style.left = touch.clientX + 'px';
                reticle.style.top = touch.clientY + 'px';
            }
        });

        window.addEventListener('touchend', (e) => {
            if (!isTouchActive) return;
            isTouchActive = false;
            const dt = performance.now() - touchStartTime;

            if (reticle) reticle.style.display = 'none';

            // Short tap = interact
            if (dt < 250) {
                if (state.interactionTarget && state.interactionTarget.userData.choppable && state.heldAxe) {
                    state.isChopping = true;
                    state.chopTimer = 0;
                    setTimeout(() => { state.isChopping = false; }, 500);
                }
            }
        });
    }
}

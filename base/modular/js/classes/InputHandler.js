// =====================================================
// POCKET TERRARIUM - INPUT HANDLER CLASS
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
            if (state.phase === 'playing' && !isNaN(parseInt(k)) && parseInt(k) >= 1 && parseInt(k) <= 8) {
                const idx = parseInt(k) - 1;
                if (state.selectedSlot === idx) { state.selectedSlot = null; sfx.select(); }
                else if (state.inventory[idx]) { state.selectedSlot = idx; sfx.select(); }
                this.engine.updateInventory();
            }
            if (k === 'm' && state.gameMode === 'fps') document.exitPointerLock();
            if (k === 'e' && state.phase === 'playing' && state.gameMode === 'fps') {
                if (state.isOnBoat) {
                    this.engine.disembarkBoat();
                } else if (this.engine._nearestBoat) {
                    this.engine.boardBoat(this.engine._nearestBoat);
                }
            }
            if (k === 'g' && state.phase === 'playing') {
                const nextMode = state.gameMode === 'creator' ? 'fps' : 'creator';
                this.engine.switchGameMode(nextMode);
                sfx.select();
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
        const state = this.engine.state;
        const world = this.engine.world;
        const renderer = world.renderer;
        document.addEventListener('mousedown', (e) => {
            if (state.phase === 'playing' && state.gameMode === 'fps' &&
                document.pointerLockElement !== renderer.domElement &&
                !document.getElementById('settings-popup').classList.contains('open') &&
                e.target === renderer.domElement) {
                renderer.domElement.requestPointerLock();
                document.getElementById('fps-msg').style.display = 'none';
            }
        });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === renderer.domElement && state.gameMode === 'fps') {
                state.player.targetYaw -= e.movementX * state.sensitivity;
                state.player.targetPitch -= e.movementY * state.sensitivity;
                state.player.targetPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, state.player.targetPitch));
            }
        });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === renderer.domElement) {
                document.getElementById('custom-cursor').style.display = 'none';
                document.getElementById('fps-msg').style.display = 'none';
            } else {
                if (state.gameMode === 'fps') {
                    document.getElementById('fps-msg').style.display = 'block';
                    document.getElementById('custom-cursor').style.display = 'block';
                }
            }
        });

        window.addEventListener('wheel', (e) => {
            if (state.phase !== 'playing') return;
            if (state.gameMode === 'fps') {
                if (e.deltaY > 0) state.selectedSlot = (state.selectedSlot === null ? 0 : (state.selectedSlot + 1) % 8);
                else state.selectedSlot = (state.selectedSlot === null ? 7 : (state.selectedSlot - 1 + 8) % 8);
                if (state.selectedSlot !== null && !state.inventory[state.selectedSlot]) { }
                this.engine.updateInventory();
            } else {
                state.camRadius += e.deltaY * 0.01;
                state.camRadius = Math.max(5, Math.min(20, state.camRadius));
            }
        });
        window.addEventListener('scroll', (e) => e.preventDefault(), { passive: false });
        window.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
        this.setupPointerEvents();
    }

    setupPointerEvents() {
        const renderer = this.engine.world.renderer;
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        const cursor = document.getElementById('custom-cursor');
        const flash = document.getElementById('white-flash');

        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (!e.isPrimary) return;
            if (state.interaction.isZooming) return;

            if (state.gameMode === 'fps') {
                if (document.pointerLockElement !== renderer.domElement) return;
                if (state.isOnBoat) return; // No interaction while sailing
                const now = performance.now();
                if (now - (state.lastInteractTime || 0) < 800) return;
                state.lastInteractTime = now;
                this.raycaster.setFromCamera(new THREE.Vector2(0, 0), world.camera);
                if (state.selectedSlot !== null) {
                    this.handleFPSPlace();
                    return;
                }
                this.handleFPSPickup();
                return;
            }

            cursor.classList.add('active');
            state.interaction.pressTime = performance.now();
            state.interaction.startPos.set(e.clientX, e.clientY);
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, world.camera);

            if (state.phase === 'essence') {
                const hits = this.raycaster.intersectObjects(this.engine.spheres, true);
                if (hits.length && !state.selectedEssence) {
                    sfx.select();
                    const grp = hits[0].object.parent;
                    state.selectedEssence = grp;
                    state.selectionProgress = 0;
                    state.phase = 'essence-transition';
                    flash.style.transition = 'opacity 0.8s';
                }
                return;
            }

            const hits = this.raycaster.intersectObjects(state.entities, true);
            if (hits.length) {
                let root = hits[0].object;
                while (root.parent && root.parent !== world.scene) root = root.parent;
                if (root.userData.type) {
                    state.interaction.heldEntity = root;
                    if (root.userData.type === 'creature') root.userData.held = true;
                    return;
                }
            }
            state.interaction.mode = 'panning';
        });

        renderer.domElement.addEventListener('pointermove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            if (state.interaction.isZooming) return;
            if (state.phase === 'essence') {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, world.camera);
                const hits = this.raycaster.intersectObjects(this.engine.spheres, true);
                if (hits.length) {
                    const grp = hits[0].object.parent;
                    if (state.hoveredSphere !== grp) {
                        state.hoveredSphere = grp;
                        sfx.chirp(400 + this.engine.spheres.indexOf(grp) * 100, 500 + this.engine.spheres.indexOf(grp) * 100, 0.08, 0.02);
                    }
                } else state.hoveredSphere = null;
            }
            if (state.interaction.mode === 'panning') {
                state.camAngle -= (e.clientX - state.interaction.startPos.x) * 0.005;
                state.interaction.startPos.x = e.clientX;
            } else if (state.interaction.heldEntity && state.interaction.heldEntity.userData.type === 'creature') {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                this.raycaster.setFromCamera(this.mouse, world.camera);
                const hits = this.raycaster.intersectObject(this.engine.groundPlane);
                if (hits.length) {
                    state.interaction.heldEntity.position.copy(hits[0].point);
                    state.interaction.heldEntity.position.y = factory.O_Y + 0.5;
                }
            }
        });

        renderer.domElement.addEventListener('pointerup', (e) => {
            if (e.button !== 0) return;
            cursor.classList.remove('active');
            if (state.interaction.isZooming) return;
            const dt = performance.now() - state.interaction.pressTime;
            const held = state.interaction.heldEntity;
            if (state.phase === 'playing') {
                if (state.selectedSlot !== null && !held) {
                    this.handleCreatorPlace(e);
                } else if (held) {
                    this.handleCreatorPickup(held, dt);
                } else if (dt < 200) {
                    this.handleQuickTap(e);
                }
            }
            state.interaction.heldEntity = null;
            state.interaction.mode = 'idle';
        });
    }

    handleFPSPlace() {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        const it = state.inventory[state.selectedSlot];

        if (!this.engine.waterMesh) return;

        // Wood and tree items can be placed on water to build boats
        if (it.type === 'wood' || it.type === 'tree') {
            const waterHits = this.raycaster.intersectObject(this.engine.waterMesh);
            if (waterHits.length && waterHits[0].distance < 20) {
                sfx.place();
                const p = waterHits[0].point;
                const logColor = it.color || (it.style ? it.style.trunkColor : new THREE.Color(0x8B4513));
                const log = factory.createLog(p.x, p.z, logColor);
                world.add(log);
                state.entities.push(log);
                this.engine.logs.push(log);
                for (let i = 0; i < 8; i++) factory.createParticle(p, logColor);
                it.count = (it.count || 1) - 1;
                if (it.count <= 0) { state.inventory[state.selectedSlot] = null; state.selectedSlot = null; }
                this.engine.updateInventory();
                this.checkForBoat(world, factory, sfx);
                this.updateBuildProgress();
                return;
            }
        }

        // Regular placement on ground
        if (!this.engine.groundPlane) return;
        const groundHits = this.raycaster.intersectObject(this.engine.groundPlane);

        // Also check second island ground
        let secondGroundHits = [];
        if (this.engine.secondGroundPlane) {
            secondGroundHits = this.raycaster.intersectObject(this.engine.secondGroundPlane);
        }

        const allHits = [...groundHits, ...secondGroundHits].sort((a, b) => a.distance - b.distance);
        if (allHits.length && allHits[0].distance < 20) {
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

    handleFPSPickup() {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;

        // Check foods from both islands
        const allFoods = [...state.foods, ...state.secondFoods];
        const foodHits = this.raycaster.intersectObjects(allFoods, true);
        if (foodHits.length && foodHits[0].distance < 8) {
            const f = foodHits[0].object;
            sfx.pickup();
            const color = f.material.color;
            const success = this.engine.addToInventory('food', color, null, 0);
            if (success) {
                const center = f.position.clone();
                for (let i = 0; i < 15; i++) factory.createParticle(center, color, 1.0);
                world.remove(f);
                // Remove from whichever food array it belongs to
                const mainIdx = state.foods.indexOf(f);
                if (mainIdx > -1) state.foods.splice(mainIdx, 1);
                const secIdx = state.secondFoods.indexOf(f);
                if (secIdx > -1) state.secondFoods.splice(secIdx, 1);
            } else sfx.pop();
            return;
        }

        // Check entities from both islands
        const allEntities = [...state.entities, ...state.secondEntities];
        const hits = this.raycaster.intersectObjects(allEntities, true);
        if (hits.length && hits[0].distance < 8) {
            let root = hits[0].object;
            while (root.parent && root.parent !== world.scene) root = root.parent;
            if (root.userData.type === 'chief') {
                document.exitPointerLock();
                const d = document.getElementById('dialog-box');
                d.style.display = 'flex';
                document.getElementById('dialog-text').innerHTML = "CHIEF:<br>Run! The giant is chasing me!<br>...Wait, are you friendly?";
                sfx.sing();
            } else if (root.userData.type === 'boat') {
                // Boats are boarded with E key, not picked up
                return;
            } else if (root.userData.type) {
                sfx.pickup();
                let styleData = root.userData.style;
                if (root.userData.type === 'egg') styleData = root.userData.parentDNA;
                const pickupType = root.userData.type;
                // Logs go into inventory as 'wood'
                const invType = pickupType === 'log' ? 'wood' : pickupType;
                const success = this.engine.addToInventory(invType, root.userData.color, styleData, root.userData.age);
                if (success) {
                    const center = root.position.clone(); center.y += 0.5;
                    for (let i = 0; i < 25; i++) factory.createParticle(center, root.userData.color, 1.5);
                    world.remove(root);
                    state.entities.splice(state.entities.indexOf(root), 1);
                    if (state.obstacles.includes(root)) state.obstacles.splice(state.obstacles.indexOf(root), 1);
                    // Remove from logs array if it's a log
                    if (pickupType === 'log') {
                        const logIdx = this.engine.logs.indexOf(root);
                        if (logIdx > -1) this.engine.logs.splice(logIdx, 1);
                        this.updateBuildProgress();
                    }
                    // Also remove from second island arrays if applicable
                    const secIdx = state.secondEntities.indexOf(root);
                    if (secIdx > -1) state.secondEntities.splice(secIdx, 1);
                    const secObs = state.secondObstacles.indexOf(root);
                    if (secObs > -1) state.secondObstacles.splice(secObs, 1);
                    // Trees drop extra wood for boat building
                    if (pickupType === 'tree') {
                        const woodColor = (root.userData.style && root.userData.style.trunkColor)
                            ? root.userData.style.trunkColor.clone()
                            : (root.userData.color ? root.userData.color.clone() : new THREE.Color(0x8B4513));
                        this.engine.addToInventory('wood', woodColor, null, 0);
                        this.updateBuildProgress();
                    }
                } else sfx.pop();
            }
        }
    }

    handleCreatorPlace(e) {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;

        if (!this.engine.waterMesh) return;

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, world.camera);

        const it = state.inventory[state.selectedSlot];

        // Wood/tree items go to water as logs
        if (it.type === 'wood' || it.type === 'tree') {
            const waterHits = this.raycaster.intersectObject(this.engine.waterMesh);
            if (waterHits.length) {
                sfx.place();
                const p = waterHits[0].point;
                const logColor = it.color || (it.style ? it.style.trunkColor : new THREE.Color(0x8B4513));
                const log = factory.createLog(p.x, p.z, logColor);
                world.add(log);
                state.entities.push(log);
                this.engine.logs.push(log);
                for (let i = 0; i < 8; i++) factory.createParticle(p, logColor);
                it.count = (it.count || 1) - 1;
                if (it.count <= 0) { state.inventory[state.selectedSlot] = null; state.selectedSlot = null; }
                this.engine.updateInventory();
                this.checkForBoat(world, factory, sfx);
                this.updateBuildProgress();
                return;
            }
        }

        // Regular placement on ground
        const groundHits = this.raycaster.intersectObject(this.engine.groundPlane);
        let secondGroundHits = [];
        if (this.engine.secondGroundPlane) {
            secondGroundHits = this.raycaster.intersectObject(this.engine.secondGroundPlane);
        }
        const allHits = [...groundHits, ...secondGroundHits].sort((a, b) => a.distance - b.distance);
        if (allHits.length) {
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

    checkForBoat(world, factory, sfx) {
        const logs = this.engine.logs;
        if (logs.length < 4) return;

        const boatRadius = 4;
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
                cluster.forEach(idx => {
                    centerX += logs[idx].position.x;
                    centerZ += logs[idx].position.z;
                    world.remove(logs[idx]);
                    const entIdx = this.engine.state.entities.indexOf(logs[idx]);
                    if (entIdx > -1) this.engine.state.entities.splice(entIdx, 1);
                });
                centerX /= cluster.length;
                centerZ /= cluster.length;

                const boat = factory.createBoat(centerX, centerZ, logs[i].userData.color);
                world.add(boat);
                this.engine.state.entities.push(boat);
                sfx.boatBuild();
                for (let k = 0; k < 30; k++) factory.createParticle({ x: centerX, y: -1.5, z: centerZ }, logs[i].userData.color, 2.0);

                // Clean up logs array - remove clustered logs
                const clusterSet = new Set(cluster);
                this.engine.logs = this.engine.logs.filter((_, idx) => !clusterSet.has(idx));
                this.updateBuildProgress();
                return;
            }
        }
    }

    handleCreatorPickup(held, dt) {
        const state = this.engine.state;
        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        if (held.userData.type === 'creature') held.userData.held = false;
        if (dt > 300) {
            sfx.pickup();
            const idx = state.entities.indexOf(held);
            if (idx > -1) {
                let styleData = held.userData.style;
                if (held.userData.type === 'egg') styleData = held.userData.parentDNA;
                const pickupType = held.userData.type;
                const invType = pickupType === 'log' ? 'wood' : pickupType;
                const success = this.engine.addToInventory(invType, held.userData.color, styleData, held.userData.age);
                if (success) {
                    const center = held.position.clone(); center.y += 0.5;
                    for (let i = 0; i < 25; i++) factory.createParticle(center, held.userData.color, 1.5);
                    world.remove(held);
                    state.entities.splice(idx, 1);
                    if (state.obstacles.includes(held)) state.obstacles.splice(state.obstacles.indexOf(held), 1);
                    if (pickupType === 'log') {
                        const logIdx = this.engine.logs.indexOf(held);
                        if (logIdx > -1) this.engine.logs.splice(logIdx, 1);
                        this.updateBuildProgress();
                    }
                    if (pickupType === 'tree') {
                        const woodColor = (held.userData.style && held.userData.style.trunkColor)
                            ? held.userData.style.trunkColor.clone()
                            : (held.userData.color ? held.userData.color.clone() : new THREE.Color(0x8B4513));
                        this.engine.addToInventory('wood', woodColor, null, 0);
                    }
                } else sfx.pop();
            }
        } else {
            if (held.userData.type === 'creature') sfx.pet(); else sfx.pop();
            held.rotation.z = 0.5;
            setTimeout(() => held.rotation.z = 0, 150);
        }
    }

    handleQuickTap(e) {
        const state = this.engine.state;
        if (state.selectedSlot !== null) return;

        const world = this.engine.world;
        const factory = this.engine.factory;
        const sfx = this.engine.audio;
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, world.camera);
        const hits = this.raycaster.intersectObject(this.engine.groundPlane);
        if (hits.length) {
            // Check bounds before anything else
            const boundR = 5.0 * (this.engine.islandGroup ? this.engine.islandGroup.scale.x : 1);
            if (hits[0].point.x ** 2 + hits[0].point.z ** 2 > boundR ** 2) return;

            sfx.pop();
            const foodHits = this.raycaster.intersectObjects(state.foods, true);
            if (foodHits.length) {
                const f = foodHits[0].object;
                sfx.pickup();
                const success = this.engine.addToInventory('food', f.material.color, null, 0);
                if (success) { world.remove(f); state.foods.splice(state.foods.indexOf(f), 1); }
                else sfx.pop();
                return;
            }
            const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15), factory.getMat(state.palette.accent));
            fl.position.copy(hits[0].point); fl.position.y = factory.O_Y + 0.15;
            fl.scale.set(0, 0, 0);
            world.add(fl); state.foods.push(fl);
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
        if (it.type === 'wood') {
            ent = factory.createLog(p.x, p.z, it.color);
            this.engine.logs.push(ent);
        }
        if (it.type === 'creature') {
            ent = factory.createCreature(state.palette, p.x, p.z, it.style);
            if (it.age) ent.userData.age = it.age;
            world.add(ent);
        }
        if (it.type === 'egg') { ent = factory.createEgg(p, it.color, it.style); world.add(ent); }
        if (it.type === 'food') {
            ent = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15), factory.getMat(it.color));
            ent.position.copy(p); ent.position.y = factory.O_Y + 0.15;
            ent.scale.set(0, 0, 0);
            world.add(ent); state.foods.push(ent);
        }
        if (ent) {
            if (it.type !== 'creature' && it.type !== 'egg' && it.type !== 'food') world.add(ent);
            if (it.type !== 'food') state.entities.push(ent);
        }
        return ent;
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

    setupTouch() {
        const renderer = this.engine.world.renderer;
        const state = this.engine.state;
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                state.interaction.isZooming = true;
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                state.zoomStart = Math.sqrt(dx * dx + dy * dy);
            } else if (e.touches.length === 1 && state.phase === 'playing') {
                const reticle = document.getElementById('touch-reticle');
                reticle.classList.add('active');
                reticle.style.left = e.touches[0].clientX + 'px';
                reticle.style.top = e.touches[0].clientY + 'px';
            }
        });
        renderer.domElement.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) state.interaction.isZooming = false;
            if (e.touches.length === 0) document.getElementById('touch-reticle').classList.remove('active');
        });
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && state.phase === 'playing') {
                state.interaction.isZooming = true;
                const dx = e.touches[0].pageX - e.touches[1].pageX;
                const dy = e.touches[0].pageY - e.touches[1].pageY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const delta = state.zoomStart - dist;
                state.camRadius += delta * 0.05;
                state.camRadius = Math.max(5, Math.min(20, state.camRadius));
                state.zoomStart = dist;
            } else if (e.touches.length === 1) {
                const reticle = document.getElementById('touch-reticle');
                reticle.style.left = e.touches[0].clientX + 'px';
                reticle.style.top = e.touches[0].clientY + 'px';
            }
        });
    }
}

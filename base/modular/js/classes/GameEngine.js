// =====================================================
// GAME ENGINE - THIRD PERSON ISLAND GAME
// =====================================================

import AudioManager from './AudioManager.js';
import GameState from './GameState.js';
import WorldManager from './WorldManager.js';
import EntityFactory from './EntityFactory.js';
import InputHandler from './InputHandler.js';
import PlayerController from './PlayerController.js';

export default class GameEngine {
    constructor() {
        this.audio = new AudioManager();
        this.state = new GameState();
        this.world = new WorldManager(0.5);
        this.factory = new EntityFactory(this.world, this.state);
        this.playerController = new PlayerController(this.world, this.state);
        this.spheres = [];
        this.islandGroups = [];   // Array of island group objects
        this.groundPlanes = [];   // Ground meshes for raycasting
        this.ui = {};
        this.setupUI();
        this.input = new InputHandler(this);
        this.setupButtons();
        this.initGame(null);
        this.animate = this.animate.bind(this);
        this.animate(0);
        window.onresize = () => this.world.resize();
    }

    setupUI() {
        this.ui.essenceScreen = document.getElementById('essence-screen');
        this.ui.invContainer = document.getElementById('inventory-container');
        this.ui.invGrid = document.getElementById('inventory-grid');
        this.ui.resetBtn = document.getElementById('reset-btn');
        this.ui.flash = document.getElementById('white-flash');
        this.ui.resourceHud = document.getElementById('resource-hud');
        this.ui.logCount = document.getElementById('log-count');
        this.ui.volSlider = document.getElementById('vol-slider');
        this.ui.volIcon = document.getElementById('vol-icon');
        this.ui.settingsBtn = document.getElementById('settings-btn');
        this.ui.settingsPopup = document.getElementById('settings-popup');
        this.ui.chopIndicator = document.getElementById('chop-indicator');
        this.ui.chopFill = document.getElementById('chop-fill');
        for (let i = 0; i < 8; i++) {
            const div = document.createElement('div');
            div.className = 'slot';
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state.selectedSlot === i) { this.state.selectedSlot = null; this.audio.select(); }
                else if (this.state.inventory[i]) { this.state.selectedSlot = i; this.audio.select(); }
                this.updateInventory();
            });
            this.ui.invGrid.appendChild(div);
        }
    }

    setupButtons() {
        this.ui.resetBtn.addEventListener('click', () => this.resetWorld());
    }

    addToInventory(type, color, style, age = 0) {
        const isStackable = ['creature', 'egg'].indexOf(type) === -1;
        if (isStackable) {
            const existingIdx = this.state.inventory.findIndex(item =>
                item && item.type === type && item.color.getHex() === color.getHex()
            );
            if (existingIdx !== -1) {
                this.state.inventory[existingIdx].count = (this.state.inventory[existingIdx].count || 1) + 1;
                this.updateInventory();
                return true;
            }
        }
        const emptyIdx = this.state.inventory.findIndex(item => item === null);
        if (emptyIdx !== -1) {
            this.state.inventory[emptyIdx] = { type, color, style, age, count: 1 };
            this.updateInventory();
            return true;
        }
        return false;
    }

    updateInventory() {
        const slots = document.querySelectorAll('.slot');
        slots.forEach((el, i) => {
            el.innerHTML = '';
            el.classList.toggle('active', this.state.selectedSlot === i);
            const it = this.state.inventory[i];
            if (it) {
                const d = document.createElement('div');
                d.style.color = '#' + it.color.getHexString();
                d.className = `icon-${it.type}`;
                if (['creature', 'rock', 'grass', 'flower', 'egg'].includes(it.type)) d.style.background = d.style.color;
                if (it.type === 'bush') d.style.borderBottomColor = d.style.color;
                el.appendChild(d);
                if (it.count > 1) {
                    const countEl = document.createElement('span');
                    countEl.innerText = it.count;
                    countEl.style.cssText = 'position:absolute;bottom:2px;right:2px;color:#fff;font-size:10px;text-shadow:1px 1px 0 #000;pointer-events:none;';
                    el.appendChild(countEl);
                }
            }
        });
    }

    updateResourceHud() {
        if (this.ui.logCount) {
            this.ui.logCount.textContent = this.state.resources.logs;
        }
    }

    resetWorld() {
        if (this.state.phase !== 'playing') return;
        this.audio.explode();
        this.ui.flash.style.opacity = 1;
        setTimeout(() => this.ui.flash.style.opacity = 0, 500);
        for (let i = 0; i < 60; i++) {
            this.factory.createParticle(new THREE.Vector3(0, 0, 0), new THREE.Color(0xffffff), 4);
            this.factory.createParticle(new THREE.Vector3(0, 0, 0), this.state.palette.flora, 3);
        }
        this.state.entities.forEach(e => {
            e.userData.exploding = true;
            e.userData.vel = e.position.clone().normalize().multiplyScalar(0.2 + Math.random() * 0.3);
            e.userData.vel.y = 0.3 + Math.random() * 0.4;
            e.userData.rotVel = new THREE.Vector3(Math.random(), Math.random(), Math.random());
            this.state.debris.push(e);
        });
        this.state.foods.forEach(f => {
            f.userData.exploding = true;
            f.userData.vel = f.position.clone().normalize().multiplyScalar(0.2 + Math.random() * 0.3);
            f.userData.vel.y = 0.3 + Math.random() * 0.4;
            f.userData.rotVel = new THREE.Vector3(Math.random(), Math.random(), Math.random());
            this.state.debris.push(f);
        });
        this.state.entities = []; this.state.obstacles = []; this.state.foods = [];
        // Remove island groups
        this.islandGroups.forEach(ig => {
            ig.group.children.forEach(c => {
                const chunk = c.clone(); chunk.position.copy(c.position); chunk.rotation.copy(c.rotation);
                this.world.add(chunk); chunk.userData.exploding = true;
                chunk.userData.vel = new THREE.Vector3((Math.random() - .5), -1, (Math.random() - .5)).normalize().multiplyScalar(0.2);
                chunk.userData.rotVel = new THREE.Vector3(0.1, 0, 0);
                this.state.debris.push(chunk);
            });
            this.world.remove(ig.group);
        });
        this.islandGroups = [];
        this.groundPlanes = [];
        this.state.islands = [];
        this.playerController.remove();
        this.audio.fadeOut();
        setTimeout(() => this.initGame(null), 800);
    }

    initGame(sphereColor) {
        this.state.phase = 'playing';
        this.state.palette = this.factory.generatePalette(sphereColor);
        this.state.worldDNA = this.factory.generateWorldDNA();
        this.world.scene.background = this.state.palette.background;
        this.ui.invContainer.style.display = 'flex';
        if (this.ui.resourceHud) this.ui.resourceHud.style.display = 'flex';

        const O_Y = this.factory.O_Y;

        // --- Island 1: Starting island (with trees to chop) ---
        const island1 = this.factory.createIslandAt(this.state.palette, 0, 0, 12, true);
        this.world.add(island1.group);
        this.islandGroups.push(island1);
        this.groundPlanes.push(island1.groundPlane);
        this.state.islands.push({
            center: new THREE.Vector3(0, 0, 0),
            radius: island1.radius,
            floorY: O_Y + 0.05
        });

        // Helper: random polar position within a radius band
        const rndPolar = (cx, cz, minR = 1.0, maxR = 9.0) => {
            const a = Math.random() * 6.28;
            const r = minR + Math.random() * (maxR - minR);
            return { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
        };

        // Trees (choppable)
        for (let i = 0; i < 14; i++) {
            const p = rndPolar(0, 0, 2.0, 9.5);
            const tree = this.factory.createTree(this.state.palette, p.x, p.z);
            this.state.entities.push(tree);
            this.world.add(tree);
        }
        // Decoration
        for (let i = 0; i < 7; i++) { const p = rndPolar(0, 0, 1.5, 9.0); const e = this.factory.createBush(this.state.palette, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 5; i++) { const p = rndPolar(0, 0, 1.5, 9.0); const e = this.factory.createRock(this.state.palette, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 30; i++) { const p = rndPolar(0, 0, 0.5, 10.0); const e = this.factory.createGrass(this.state.palette, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 8; i++) { const p = rndPolar(0, 0, 1.0, 9.0); const e = this.factory.createFlower(this.state.palette, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        // Creatures on island 1
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(0, 0, 2.0, 7.0);
            const c = this.factory.createCreature(this.state.palette, p.x, p.z);
            c.userData.boundCenter = { x: 0, z: 0 };
            c.userData.boundRadius = island1.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // --- Island 2: Second island (different palette, with some life) ---
        const palette2 = this.factory.generatePalette(null);
        const island2 = this.factory.createIslandAt(palette2, 80, 0, 14, false);
        this.world.add(island2.group);
        this.islandGroups.push(island2);
        this.groundPlanes.push(island2.groundPlane);
        this.state.islands.push({
            center: new THREE.Vector3(80, 0, 0),
            radius: island2.radius,
            floorY: O_Y + 0.05
        });
        // Vegetation on island 2
        for (let i = 0; i < 6; i++) { const p = rndPolar(80, 0, 2.0, 11.0); const e = this.factory.createTree(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(80, 0, 1.5, 11.0); const e = this.factory.createBush(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(80, 0, 1.5, 11.0); const e = this.factory.createRock(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 20; i++) { const p = rndPolar(80, 0, 0.5, 12.0); const e = this.factory.createGrass(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 6; i++) { const p = rndPolar(80, 0, 1.0, 11.0); const e = this.factory.createFlower(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        // Creatures on island 2
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(80, 0, 2.0, 9.0);
            const c = this.factory.createCreature(palette2, p.x, p.z);
            c.userData.boundCenter = { x: 80, z: 0 };
            c.userData.boundRadius = island2.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // --- Spawn player on island 1 ---
        this.state.player.pos.set(0, O_Y + 2, 0);
        this.state.player.vel.set(0, 0, 0);
        this.state.player.onGround = false;
        this.state.player.cameraAngle = { x: 0, y: 0.3 };
        this.state.resources.logs = 0;
        this.playerController.createModel(this.state.palette);

        // Set camera initial position behind player
        this.world.camera.position.set(0, O_Y + 5, 6);
        this.world.camera.fov = 60;
        this.world.camera.updateProjectionMatrix();

        if (!this.state.musicStarted) {
            this.audio.startMusic(this.state.worldDNA, this.ui.volSlider, this.ui.volIcon, this.ui.settingsBtn, this.ui.settingsPopup, this.audio);
            this.state.musicStarted = true;
        }

        this.updateResourceHud();
    }

    // --- Chopping system ---
    updateChopping(dt) {
        const state = this.state;
        if (!state.isChopping || !state.interactionTarget) {
            // Hide chop indicator
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            return;
        }

        const tree = state.interactionTarget;
        // Check still in range
        const dx = tree.position.x - state.player.pos.x;
        const dz = tree.position.z - state.player.pos.z;
        if (Math.sqrt(dx * dx + dz * dz) > 3.5) {
            state.isChopping = false;
            state.chopProgress = 0;
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            return;
        }

        state.chopTimer += dt;

        // Show chop progress indicator
        if (this.ui.chopIndicator) {
            this.ui.chopIndicator.style.display = 'block';
            if (this.ui.chopFill) {
                this.ui.chopFill.style.width = ((state.chopProgress / 5) * 100) + '%';
            }
        }

        // Hit every 0.4 seconds
        if (state.chopTimer >= 0.4) {
            state.chopTimer = 0;
            state.chopProgress++;
            this.audio.chop();

            // Visual feedback — shake tree
            const shakeX = (Math.random() - 0.5) * 0.15;
            const origX = tree.position.x;
            tree.position.x += shakeX;
            setTimeout(() => { if (tree.parent) tree.position.x = origX; }, 100);

            // Chop particles
            this.factory.createChopParticles(tree.position.clone(), this.state.palette.trunk);

            // Tree felled!
            if (state.chopProgress >= 5) {
                this.audio.treeFall();
                const logX = tree.position.x + (Math.random() - 0.5) * 0.5;
                const logZ = tree.position.z + (Math.random() - 0.5) * 0.5;

                // Falling particles
                for (let i = 0; i < 15; i++) {
                    this.factory.createParticle(tree.position.clone(), this.state.palette.flora, 1.5);
                }

                // Remove tree
                this.world.remove(tree);
                const idx = state.entities.indexOf(tree);
                if (idx > -1) state.entities.splice(idx, 1);
                if (state.obstacles.includes(tree)) state.obstacles.splice(state.obstacles.indexOf(tree), 1);

                // Spawn log
                const log = this.factory.createLog(this.state.palette, logX, logZ);
                this.world.add(log);
                state.entities.push(log);

                // Reset chopping state
                state.isChopping = false;
                state.chopProgress = 0;
                state.interactionTarget = null;
                if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            }
        }
    }

    // --- Auto-pickup system ---
    updateAutoPickup() {
        const state = this.state;
        const playerPos = state.player.pos;
        const pickupRange = 1.5;

        // Check entities for auto-pickup items (logs)
        for (let i = state.entities.length - 1; i >= 0; i--) {
            const e = state.entities[i];
            if (!e.userData.autoPickup) continue;
            const dx = e.position.x - playerPos.x;
            const dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < pickupRange && e.scale.x > 0.5) { // Wait for spawn-in animation
                if (e.userData.type === 'log') {
                    state.resources.logs++;
                    this.audio.pickup();
                    for (let j = 0; j < 8; j++) this.factory.createParticle(e.position.clone(), e.userData.color, 0.8);
                    this.world.remove(e);
                    state.entities.splice(i, 1);
                    this.updateResourceHud();
                }
            }
        }
    }

    animate(t) {
        requestAnimationFrame(this.animate);
        t *= 0.001;
        const state = this.state;
        const camera = this.world.camera;
        const O_Y = this.factory.O_Y;
        const dt = 0.016; // ~60fps fixed step

        if (state.phase === 'playing') {
            // --- Water animation ---
            this.islandGroups.forEach(ig => {
                const water = ig.group.children.find(c => c.userData.type === 'water');
                if (water) { water.rotation.z += 0.001; water.position.y = -2.0 + Math.sin(t * 0.5) * 0.15; }
            });

            // --- Player update (movement, physics, animation) ---
            this.playerController.update(dt, state.islands);

            // --- Camera ---
            this.playerController.updateCamera(camera);

            // --- Input interaction check (highlighting) ---
            this.input.updateInteraction();

            // --- Chopping ---
            this.updateChopping(dt);

            // --- Auto-pickup ---
            this.updateAutoPickup();

            // --- Entity updates ---
            for (let i = state.entities.length - 1; i >= 0; i--) {
                const e = state.entities[i];
                // Spawn-in scale animation
                if (e.scale.x < 0.99) e.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);

                // Creature/chief bobbing
                if (e.userData.type === 'creature' || e.userData.type === 'chief') {
                    e.position.y = O_Y + 0.3 + Math.sin(t * 4 + (e.userData.hopOffset || 0)) * 0.03;
                }

                // Tree/bush food production
                if (e.userData.type === 'tree' || e.userData.type === 'bush') {
                    e.userData.productionTimer = (e.userData.productionTimer || 0) + dt;
                    if (e.userData.productionTimer > 25) {
                        e.userData.productionTimer = 0;
                        const foodPos = e.position.clone();
                        foodPos.x += (Math.random() - 0.5) * 1.2;
                        foodPos.z += (Math.random() - 0.5) * 1.2;
                        const food = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15), this.world.getMat(state.palette.accent));
                        food.position.set(foodPos.x, O_Y + 0.15, foodPos.z);
                        food.scale.set(0, 0, 0);
                        this.world.add(food);
                        state.foods.push(food);
                    }
                }

                // Creature AI
                if (e.userData.type === 'creature' && !e.userData.held) {
                    e.userData.age = (e.userData.age || 0) + dt;
                    e.userData.hunger = (e.userData.hunger || 0) + dt * 0.1;
                    let nearestFood = null, minDist = Infinity;
                    state.foods.forEach(f => { const d = e.position.distanceTo(f.position); if (d < minDist) { minDist = d; nearestFood = f; } });
                    if (nearestFood && minDist < 0.5) {
                        this.audio.eat();
                        this.world.remove(nearestFood);
                        state.foods.splice(state.foods.indexOf(nearestFood), 1);
                        e.userData.hunger = 0;
                        e.userData.eatenCount = (e.userData.eatenCount || 0) + 1;
                        for (let j = 0; j < 3; j++) this.factory.createParticle(e.position.clone(), state.palette.accent, 0.5);
                        if (e.userData.eatenCount >= 3 && e.userData.age > 8) {
                            e.userData.eatenCount = 0;
                            this.audio.layEgg();
                            const egg = this.factory.createEgg(e.position.clone(), e.userData.color, e.userData.style);
                            state.entities.push(egg);
                            this.world.add(egg);
                        }
                    } else if (nearestFood && minDist < 3) {
                        const dir = nearestFood.position.clone().sub(e.position).normalize();
                        e.position.x += dir.x * e.userData.moveSpeed;
                        e.position.z += dir.z * e.userData.moveSpeed;
                        e.lookAt(new THREE.Vector3(nearestFood.position.x, e.position.y, nearestFood.position.z));
                    } else {
                        e.userData.cooldown = (e.userData.cooldown || 0) - dt;
                        if (e.userData.cooldown <= 0) {
                            e.userData.cooldown = 1 + Math.random() * 2;
                            e.userData.wanderDir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
                        }
                        if (e.userData.wanderDir) {
                            e.position.x += e.userData.wanderDir.x * e.userData.moveSpeed * 0.5;
                            e.position.z += e.userData.wanderDir.z * e.userData.moveSpeed * 0.5;
                        }
                    }
                    // Keep creature on its island
                    const bc = e.userData.boundCenter || { x: 0, z: 0 };
                    const boundR = e.userData.boundRadius || 8;
                    const relX = e.position.x - bc.x;
                    const relZ = e.position.z - bc.z;
                    if (relX ** 2 + relZ ** 2 > boundR ** 2) {
                        const a = Math.atan2(relZ, relX);
                        e.position.x = bc.x + Math.cos(a) * boundR * 0.9;
                        e.position.z = bc.z + Math.sin(a) * boundR * 0.9;
                    }
                    if (e.userData.hunger > 15) {
                        if (!e.userData.bubble) {
                            e.userData.bubble = this.factory.createBubbleTexture('?', '#ff4444');
                            e.add(e.userData.bubble);
                            this.audio.hungry();
                        }
                    } else if (e.userData.bubble) { e.remove(e.userData.bubble); e.userData.bubble = null; }
                    if (e.userData.hunger > 30) {
                        this.audio.die();
                        for (let j = 0; j < 20; j++) this.factory.createParticle(e.position.clone(), e.userData.color, 1.5);
                        this.world.remove(e);
                        state.entities.splice(i, 1);
                        if (state.obstacles.includes(e)) state.obstacles.splice(state.obstacles.indexOf(e), 1);
                    }
                }

                // Egg hatching
                if (e.userData.type === 'egg') {
                    e.userData.hatchTimer = (e.userData.hatchTimer || 10) - dt;
                    e.rotation.z = Math.sin(t * 5) * 0.1 * (1 - e.userData.hatchTimer / 10);
                    if (e.userData.hatchTimer <= 0) {
                        this.audio.pop();
                        for (let j = 0; j < 10; j++) this.factory.createParticle(e.position.clone(), e.userData.color, 1);
                        const baby = this.factory.createCreature(state.palette, e.position.x, e.position.z, e.userData.parentDNA);
                        baby.scale.set(0.5, 0.5, 0.5);
                        baby.userData.targetScale = 0.7 + Math.random() * 0.3;
                        state.entities.push(baby);
                        this.world.add(baby);
                        this.world.remove(e);
                        state.entities.splice(i, 1);
                    }
                }
            }

            // Food animation
            state.foods.forEach(f => {
                if (f.scale.x < 0.99) f.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
                f.position.y = O_Y + 0.15 + Math.sin(t * 3 + f.position.x) * 0.05;
                f.rotation.y += 0.02;
                f.rotation.z = Math.sin(t * 2) * 0.1;
            });

            // Particles
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.position.add(p.userData.vel);
                p.userData.vel.y -= 0.002;
                p.userData.life -= 0.03;
                p.material.opacity = p.userData.life;
                if (p.userData.life <= 0) { this.world.remove(p); state.particles.splice(i, 1); }
            }

            // Debris
            for (let i = state.debris.length - 1; i >= 0; i--) {
                const d = state.debris[i];
                if (d.userData.vel) {
                    d.position.add(d.userData.vel);
                    d.userData.vel.y -= 0.01;
                    if (d.userData.rotVel) {
                        d.rotation.x += d.userData.rotVel.x;
                        d.rotation.y += d.userData.rotVel.y;
                        d.rotation.z += d.userData.rotVel.z;
                    }
                    d.scale.multiplyScalar(0.98);
                    if (d.position.y < -20 || d.scale.x < 0.01) {
                        this.world.remove(d);
                        this.factory.disposeHierarchy(d);
                        state.debris.splice(i, 1);
                    }
                }
            }
        }
        this.world.render();
    }
}

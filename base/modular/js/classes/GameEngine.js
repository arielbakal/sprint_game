// =====================================================
// POCKET TERRARIUM - GAME ENGINE CLASS
// =====================================================

import AudioManager from './AudioManager.js';
import GameState from './GameState.js';
import WorldManager from './WorldManager.js';
import EntityFactory from './EntityFactory.js';
import InputHandler from './InputHandler.js';

export default class GameEngine {
    constructor() {
        this.audio = new AudioManager();
        this.state = new GameState();
        this.world = new WorldManager(0.5);
        this.factory = new EntityFactory(this.world, this.state);
        this.spheres = [];
        this.islandGroup = null;
        this.groundPlane = null;
        this.waterMesh = null;
        this.hintIslands = [];
        this.logs = [];
        this.secondIslandGroup = null;
        this.secondGroundPlane = null;
        this.boatPromptVisible = false;
        this.ui = {};
        this.setupUI();
        this.initSpheres();
        this.input = new InputHandler(this);
        this.setupButtons();
        this.animate = this.animate.bind(this);
        this.animate(0);
        window.onresize = () => this.world.resize();
    }

    setupUI() {
        this.ui.cursor = document.getElementById('custom-cursor');
        this.ui.essenceScreen = document.getElementById('essence-screen');
        this.ui.invContainer = document.getElementById('inventory-container');
        this.ui.invGrid = document.getElementById('inventory-grid');
        this.ui.resetBtn = document.getElementById('reset-btn');
        this.ui.flash = document.getElementById('white-flash');
        this.ui.crosshair = document.getElementById('crosshair');
        this.ui.fpsMsg = document.getElementById('fps-msg');
        this.ui.modeCreatorBtn = document.getElementById('mode-creator');
        this.ui.modeFpsBtn = document.getElementById('mode-fps');
        this.ui.sensSlider = document.getElementById('sens-slider');
        this.ui.growBtn = document.getElementById('grow-btn');
        this.ui.volSlider = document.getElementById('vol-slider');
        this.ui.volIcon = document.getElementById('vol-icon');
        this.ui.settingsBtn = document.getElementById('settings-btn');
        this.ui.settingsPopup = document.getElementById('settings-popup');
        this.ui.boatPrompt = document.getElementById('boat-prompt');
        this.ui.boatBuildProgress = document.getElementById('boat-build-progress');
        this.ui.islandIndicator = document.getElementById('island-indicator');
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
        this.ui.modeCreatorBtn.addEventListener('click', () => this.switchGameMode('creator'));
        this.ui.modeFpsBtn.addEventListener('click', () => this.switchGameMode('fps'));
        this.ui.sensSlider.addEventListener('input', (e) => this.state.sensitivity = e.target.value / 500);
        this.state.sensitivity = this.ui.sensSlider.value / 500;
        this.ui.growBtn.addEventListener('click', () => this.growTerrain());
        this.ui.resetBtn.addEventListener('click', () => this.resetWorld());
    }

    switchGameMode(mode) {
        this.state.gameMode = mode;
        const camera = this.world.camera;
        if (mode === 'fps') {
            this.ui.modeFpsBtn.classList.add('active');
            this.ui.modeCreatorBtn.classList.remove('active');
            this.ui.crosshair.style.display = 'block';
            this.ui.fpsMsg.style.display = 'block';
            this.ui.cursor.style.display = 'none';
            if (this.state.player.pos.y < -10) this.state.player.pos.set(0, 5, 0);
            camera.rotation.set(0, 0, 0);
            camera.up.set(0, 1, 0);
            this.state.player.yaw = 0; this.state.player.pitch = 0;
            this.state.player.targetYaw = 0; this.state.player.targetPitch = 0;
            camera.fov = 93; camera.updateProjectionMatrix();
        } else {
            this.ui.modeCreatorBtn.classList.add('active');
            this.ui.modeFpsBtn.classList.remove('active');
            this.ui.crosshair.style.display = 'none';
            this.ui.fpsMsg.style.display = 'none';
            this.ui.cursor.style.display = 'block';
            if (document.pointerLockElement) document.exitPointerLock();
            camera.fov = 50; camera.updateProjectionMatrix();
        }
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
                if (it.type === 'wood') d.style.background = d.style.color;
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

    growTerrain() {
        if (!this.islandGroup) return;
        const oldScale = this.islandGroup.scale.x;
        const newScale = oldScale * 1.2;
        this.islandGroup.scale.set(newScale, newScale, newScale);
        this.islandGroup.position.y = this.factory.O_Y * (1 - newScale);
        const spawnCount = Math.floor(15 * newScale);
        const innerR = 4.0 * oldScale;
        const outerR = 4.5 * newScale;
        for (let i = 0; i < spawnCount; i++) {
            const r = innerR + Math.random() * (outerR - innerR);
            const theta = Math.random() * Math.PI * 2;
            const x = Math.cos(theta) * r;
            const z = Math.sin(theta) * r;
            const typeRoll = Math.random();
            let ent;
            if (typeRoll < 0.1) ent = this.factory.createTree(this.state.palette, x, z);
            else if (typeRoll < 0.25) ent = this.factory.createBush(this.state.palette, x, z);
            else if (typeRoll < 0.4) ent = this.factory.createRock(this.state.palette, x, z);
            else if (typeRoll < 0.9) ent = this.factory.createGrass(this.state.palette, x, z);
            else ent = this.factory.createFlower(this.state.palette, x, z);
            if (Math.random() < 0.05) {
                const c = this.factory.createCreature(this.state.palette, x, z);
                c.userData.age = 5;
                this.world.add(c); this.state.entities.push(c);
            } else {
                this.world.add(ent); this.state.entities.push(ent);
            }
        }
        this.audio.select();
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
        this.islandGroup.children.forEach(c => {
            const chunk = c.clone(); chunk.position.copy(c.position); chunk.rotation.copy(c.rotation);
            this.world.add(chunk); chunk.userData.exploding = true;
            chunk.userData.vel = new THREE.Vector3((Math.random() - .5), -1, (Math.random() - .5)).normalize().multiplyScalar(0.2);
            chunk.userData.rotVel = new THREE.Vector3(0.1, 0, 0);
            this.state.debris.push(chunk);
        });
        this.world.remove(this.islandGroup);
        this.hintIslands.forEach(h => this.world.remove(h));
        // Clean up second island
        if (this.secondIslandGroup) {
            this.world.remove(this.secondIslandGroup);
            this.secondIslandGroup = null;
            this.secondGroundPlane = null;
        }
        this.state.secondEntities.forEach(e => this.world.remove(e));
        this.state.secondFoods.forEach(f => this.world.remove(f));
        this.state.secondEntities = [];
        this.state.secondFoods = [];
        this.state.secondObstacles = [];
        this.state.isOnBoat = false;
        this.state.activeBoat = null;
        this.state.currentIsland = 0;
        this.logs = [];
        this.audio.fadeOut();
        setTimeout(() => this.initGame(null), 800);
    }

    initSpheres() {
        const colors = ['red', 'blue', 'yellow'];
        const positions = [new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0), new THREE.Vector3(0, 0, 3)];
        for (let i = 0; i < 3; i++) {
            const g = new THREE.Group();
            const sp = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.6, 1),
                new THREE.MeshBasicMaterial({ color: colors[i], wireframe: true })
            );
            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.65, 16, 16),
                new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.2 })
            );
            g.add(sp); g.add(glow);
            g.position.copy(positions[i]);
            g.userData = { baseY: 0, color: colors[i], glowMat: glow.material };
            this.world.add(g);
            this.spheres.push(g);
        }
        this.world.camera.position.set(0, 4, 7);
        this.world.camera.lookAt(0, 0, 0);
    }

    initGame(sphereColor) {
        this.state.phase = 'playing';
        this.state.palette = this.factory.generatePalette(sphereColor);
        this.state.worldDNA = this.factory.generateWorldDNA();
        this.world.scene.background = this.state.palette.background;
        this.ui.invContainer.style.display = 'flex';

        // Initial island scale doubled
        const initialScale = 2.0;

        // Rnd radius increased to match new scale (approx 5.5 * 2 = 11.0 max)
        const rnd = (minR = 2.0) => {
            const a = Math.random() * 6.28;
            const r = minR + Math.random() * (11.0 - minR);
            return { x: Math.cos(a) * r, z: Math.sin(a) * r };
        };

        const island = this.factory.createIsland(this.state.palette);
        this.islandGroup = island.group;
        this.groundPlane = island.groundPlane;

        // Re-apply scale logic
        this.islandGroup.scale.set(initialScale, initialScale, initialScale);
        this.islandGroup.position.y = this.factory.O_Y * (1 - initialScale);

        this.waterMesh = island.group.children.find(c => c.userData.type === 'water');
        this.world.add(this.islandGroup);

        const leftHint = this.factory.createHintIsland(this.state.palette, -30, 0.25);
        const rightHint = this.factory.createHintIsland(this.state.palette, 30, 0.25);
        this.hintIslands = [leftHint, rightHint];
        this.world.add(leftHint);
        this.world.add(rightHint);

        // === SECOND ISLAND ===
        this.state.secondPalette = this.factory.generatePalette(null);
        this.state.secondWorldDNA = this.factory.generateWorldDNA();
        const secondIsland = this.factory.createIsland(this.state.secondPalette);
        this.secondIslandGroup = secondIsland.group;
        this.secondGroundPlane = secondIsland.groundPlane;
        const secondScale = 1.8;
        this.secondIslandGroup.scale.set(secondScale, secondScale, secondScale);
        const offset = this.state.secondIslandOffset;
        this.secondIslandGroup.position.set(offset.x, this.factory.O_Y * (1 - secondScale), offset.z);
        // Remove the second island's water plane (we use the main island's water)
        const secondWater = this.secondIslandGroup.children.find(c => c.userData.type === 'water');
        if (secondWater) this.secondIslandGroup.remove(secondWater);
        this.world.add(this.secondIslandGroup);

        // Populate second island
        const savedDNA = this.state.worldDNA;
        this.state.worldDNA = this.state.secondWorldDNA;
        const rnd2 = (minR = 2.0) => {
            const a = Math.random() * 6.28;
            const r2 = minR + Math.random() * (9.0 - minR);
            return { x: offset.x + Math.cos(a) * r2, z: offset.z + Math.sin(a) * r2 };
        };
        for (let i = 0; i < 10; i++) { const p2 = rnd2(); const e = this.factory.createTree(this.state.secondPalette, p2.x, p2.z); this.world.add(e); this.state.secondEntities.push(e); }
        for (let i = 0; i < 14; i++) { const p2 = rnd2(); const e = this.factory.createBush(this.state.secondPalette, p2.x, p2.z); this.world.add(e); this.state.secondEntities.push(e); }
        for (let i = 0; i < 8; i++) { const p2 = rnd2(); const e = this.factory.createRock(this.state.secondPalette, p2.x, p2.z); this.world.add(e); this.state.secondEntities.push(e); }
        for (let i = 0; i < 50; i++) { const p2 = rnd2(1.0); const e = this.factory.createGrass(this.state.secondPalette, p2.x, p2.z); this.world.add(e); this.state.secondEntities.push(e); }
        for (let i = 0; i < 12; i++) { const p2 = rnd2(); const e = this.factory.createFlower(this.state.secondPalette, p2.x, p2.z); this.world.add(e); this.state.secondEntities.push(e); }
        for (let i = 0; i < 3; i++) { const p2 = rnd2(); const c = this.factory.createCreature(this.state.secondPalette, p2.x, p2.z); this.world.add(c); this.state.secondEntities.push(c); }
        this.state.worldDNA = savedDNA;

        this.state.player.pos = new THREE.Vector3(0, 5, 0);

        // Spawn more entities for the larger space
        for (let i = 0; i < 12; i++) { const p = rnd(); this.state.entities.push(this.factory.createTree(this.state.palette, p.x, p.z)); this.world.add(this.state.entities[this.state.entities.length - 1]); }
        for (let i = 0; i < 16; i++) { const p = rnd(); this.state.entities.push(this.factory.createBush(this.state.palette, p.x, p.z)); this.world.add(this.state.entities[this.state.entities.length - 1]); }
        for (let i = 0; i < 10; i++) { const p = rnd(); this.state.entities.push(this.factory.createRock(this.state.palette, p.x, p.z)); this.world.add(this.state.entities[this.state.entities.length - 1]); }
        for (let i = 0; i < 60; i++) { const p = rnd(1.0); this.state.entities.push(this.factory.createGrass(this.state.palette, p.x, p.z)); this.world.add(this.state.entities[this.state.entities.length - 1]); }
        for (let i = 0; i < 16; i++) { const p = rnd(); this.state.entities.push(this.factory.createFlower(this.state.palette, p.x, p.z)); this.world.add(this.state.entities[this.state.entities.length - 1]); }
        for (let i = 0; i < 4; i++) { const p = rnd(); const c = this.factory.createCreature(this.state.palette, p.x, p.z); this.state.entities.push(c); this.world.add(c); }

        const chiefPos = rnd(4.0);
        const chief = this.factory.createChief(this.state.palette, chiefPos.x, chiefPos.z);
        this.state.entities.push(chief);
        this.world.add(chief);

        if (!this.state.musicStarted) {
            this.audio.startMusic(this.state.worldDNA, this.ui.volSlider, this.ui.volIcon, this.ui.settingsBtn, this.ui.settingsPopup, this.audio);
            this.state.musicStarted = true;
        }
    }

    updatePlayerPhysics() {
        const state = this.state;
        const camera = this.world.camera;
        const O_Y = this.factory.O_Y;

        // If on boat, use boat physics instead
        if (state.isOnBoat) {
            this.updateBoatPhysics();
            return;
        }

        state.player.yaw += (state.player.targetYaw - state.player.yaw) * 0.3;
        state.player.pitch += (state.player.targetPitch - state.player.pitch) * 0.3;
        const forward = new THREE.Vector3(-Math.sin(state.player.targetYaw), 0, -Math.cos(state.player.targetYaw));
        const right = new THREE.Vector3(-forward.z, 0, forward.x);
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (state.inputs.w) moveDir.add(forward);
        if (state.inputs.s) moveDir.sub(forward);
        if (state.inputs.a) moveDir.sub(right);
        if (state.inputs.d) moveDir.add(right);
        if (moveDir.length() > 0) moveDir.normalize();
        state.player.vel.x = moveDir.x * state.player.speed;
        state.player.vel.z = moveDir.z * state.player.speed;
        if (state.inputs.space && state.player.canJump) {
            state.player.vel.y = 0.15;
            state.player.canJump = false;
        }
        state.player.vel.y -= 0.007;
        state.player.pos.add(state.player.vel);

        const floorY = O_Y + 1.0;

        // Check ground for current island
        const mainRadius = 7 * (this.islandGroup ? this.islandGroup.scale.x : 1);
        const offset = state.secondIslandOffset;
        const secondRadius = 7 * (this.secondIslandGroup ? this.secondIslandGroup.scale.x : 1);
        const dxMain = state.player.pos.x;
        const dzMain = state.player.pos.z;
        const distToMain = Math.sqrt(dxMain * dxMain + dzMain * dzMain);
        const dxSecond = state.player.pos.x - offset.x;
        const dzSecond = state.player.pos.z - offset.z;
        const distToSecond = Math.sqrt(dxSecond * dxSecond + dzSecond * dzSecond);

        let onGround = false;
        if (state.player.pos.y < floorY) {
            if (distToMain < mainRadius) {
                state.player.pos.y = floorY;
                state.player.vel.y = 0;
                state.player.canJump = true;
                onGround = true;
                if (state.currentIsland !== 0) {
                    state.currentIsland = 0;
                    this.updateIslandIndicator();
                }
            } else if (distToSecond < secondRadius) {
                state.player.pos.y = floorY;
                state.player.vel.y = 0;
                state.player.canJump = true;
                onGround = true;
                if (state.currentIsland !== 1) {
                    state.currentIsland = 1;
                    this.updateIslandIndicator();
                }
            }
        }

        if (state.player.pos.y < -15) state.player.pos.set(0, 5, 0);

        // Boat proximity check
        let nearBoat = null;
        let nearBoatDist = Infinity;
        state.entities.forEach(e => {
            if (e.userData.type === 'boat') {
                const d = state.player.pos.distanceTo(e.position);
                if (d < 5 && d < nearBoatDist) {
                    nearBoat = e;
                    nearBoatDist = d;
                }
            }
        });
        if (nearBoat && !this.boatPromptVisible) {
            this.ui.boatPrompt.style.display = 'block';
            this.boatPromptVisible = true;
        } else if (!nearBoat && this.boatPromptVisible) {
            this.ui.boatPrompt.style.display = 'none';
            this.boatPromptVisible = false;
        }
        this._nearestBoat = nearBoat;
    }

    boardBoat(boat) {
        const state = this.state;
        state.isOnBoat = true;
        state.activeBoat = boat;
        state.boatSpeed = 0;
        state.boatRotation = boat.rotation.y;
        state.player.vel.set(0, 0, 0);
        state.player.canJump = false;
        this.ui.boatPrompt.style.display = 'none';
        this.boatPromptVisible = false;
        this.audio.place();
        // Show navigation hint
        this.showBoatHUD(true);
    }

    disembarkBoat() {
        const state = this.state;
        if (!state.activeBoat) return;
        const boatPos = state.activeBoat.position;

        // Determine which island we're near
        const offset = state.secondIslandOffset;
        const distToMain = Math.sqrt(boatPos.x ** 2 + boatPos.z ** 2);
        const distToSecond = Math.sqrt((boatPos.x - offset.x) ** 2 + (boatPos.z - offset.z) ** 2);

        const islandScale = this.islandGroup ? this.islandGroup.scale.x : 2.0;
        const secondScale = this.secondIslandGroup ? this.secondIslandGroup.scale.x : 1.8;
        const mainRadius = 7 * islandScale;
        const secondRadius = 7 * secondScale;

        if (distToMain < mainRadius + 5) {
            state.currentIsland = 0;
            state.player.pos.set(boatPos.x * 0.7, this.factory.O_Y + 2, boatPos.z * 0.7);
        } else if (distToSecond < secondRadius + 5) {
            state.currentIsland = 1;
            const dx = boatPos.x - offset.x;
            const dz = boatPos.z - offset.z;
            state.player.pos.set(offset.x + dx * 0.7, this.factory.O_Y + 2, offset.z + dz * 0.7);
        } else {
            // Too far from any island
            this.audio.pop();
            return;
        }

        state.isOnBoat = false;
        state.boatSpeed = 0;
        state.player.vel.set(0, 0, 0);
        this.audio.pickup();
        this.showBoatHUD(false);
        this.updateIslandIndicator();
    }

    showBoatHUD(show) {
        const prompt = document.getElementById('boat-nav-hint');
        if (prompt) prompt.style.display = show ? 'block' : 'none';
    }

    updateIslandIndicator() {
        if (this.ui.islandIndicator) {
            const names = ['🏝️ HOME ISLAND', '🏝️ NEW ISLAND'];
            this.ui.islandIndicator.textContent = names[this.state.currentIsland];
            this.ui.islandIndicator.style.display = 'block';
            setTimeout(() => { if (this.ui.islandIndicator) this.ui.islandIndicator.style.display = 'none'; }, 3000);
        }
    }

    updateBoatPhysics() {
        const state = this.state;
        const boat = state.activeBoat;
        if (!boat) return;

        // Acceleration / deceleration
        if (state.inputs.w) state.boatSpeed = Math.min(state.boatSpeed + 0.003, state.boatMaxSpeed);
        else if (state.inputs.s) state.boatSpeed = Math.max(state.boatSpeed - 0.004, -state.boatMaxSpeed * 0.3);
        else state.boatSpeed *= 0.98; // friction

        // Steering
        if (state.inputs.a) state.boatRotation += 0.02;
        if (state.inputs.d) state.boatRotation -= 0.02;

        // Apply movement
        const forward = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
        boat.position.x += forward.x * state.boatSpeed;
        boat.position.z += forward.z * state.boatSpeed;
        boat.rotation.y = state.boatRotation;

        // Bobbing
        const t = performance.now() * 0.001;
        boat.position.y = Math.sin(t * 1.5) * 0.15;
        boat.rotation.x = Math.sin(t * 1.2) * 0.03;
        boat.rotation.z = Math.sin(t * 0.8) * 0.02;

        // Position player on boat
        state.player.pos.copy(boat.position);
        state.player.pos.y += 0.5;

        // Camera follows boat
        const camera = this.world.camera;
        state.player.yaw += (state.player.targetYaw - state.player.yaw) * 0.3;
        state.player.pitch += (state.player.targetPitch - state.player.pitch) * 0.3;
        camera.rotation.order = "YXZ";
        camera.rotation.y = state.player.yaw;
        camera.rotation.x = state.player.pitch;
        camera.position.copy(state.player.pos);

        // Wake particles
        if (Math.abs(state.boatSpeed) > 0.02 && Math.random() < 0.3) {
            const wakePos = boat.position.clone();
            wakePos.x -= forward.x * 2;
            wakePos.z -= forward.z * 2;
            wakePos.y = -1.8;
            this.factory.createParticle(wakePos, new THREE.Color(0x88ccff), 0.8);
        }
    }

    animate(t) {
        requestAnimationFrame(this.animate);
        t *= 0.001;
        const state = this.state;
        const camera = this.world.camera;
        const O_Y = this.factory.O_Y;

        this.ui.cursor.style.left = state.mouseX + 'px';
        this.ui.cursor.style.top = state.mouseY + 'px';

        if (state.phase === 'essence') {
            this.spheres.forEach((s, i) => {
                s.rotation.y += 0.01;
                s.position.y = s.userData.baseY + Math.sin(t * 2 + i) * 0.3;
                const isHov = s === state.hoveredSphere;
                s.scale.lerp(new THREE.Vector3(isHov ? 1.4 : 1, isHov ? 1.4 : 1, isHov ? 1.4 : 1), 0.1);
                s.userData.glowMat.opacity = isHov ? 0.4 : 0.2;
            });
        } else if (state.phase === 'essence-transition') {
            state.selectionProgress += 0.02;
            const sel = state.selectedEssence;
            this.spheres.forEach(s => {
                if (s !== sel) { s.scale.multiplyScalar(0.95); s.material && (s.material.opacity *= 0.95); }
                else { s.scale.lerp(new THREE.Vector3(3, 3, 3), 0.05); s.rotation.y += 0.05; }
            });
            if (state.selectionProgress > 0.5) { this.ui.flash.style.opacity = (state.selectionProgress - 0.5) * 2; }
            if (state.selectionProgress >= 1) {
                this.spheres.forEach(s => this.world.remove(s));
                this.spheres = [];
                this.ui.flash.style.opacity = 0;
                this.initGame(sel.userData.color);
            }
        } else if (state.phase === 'playing') {
            if (this.islandGroup) {
                const water = this.islandGroup.children.find(c => c.userData.type === 'water');
                if (water) { water.rotation.z += 0.001; water.position.y = -2.0 + Math.sin(t * 0.5) * 0.15; }
            }

            // Animate boat entities (bobbing when not being ridden)
            state.entities.forEach(e => {
                if (e.userData.type === 'boat' && e !== state.activeBoat) {
                    e.position.y = Math.sin(t * 1.5 + e.position.x) * 0.1;
                    e.rotation.z = Math.sin(t * 0.8 + e.position.z) * 0.02;
                }
                if (e.userData.type === 'log') {
                    e.position.y = Math.sin(t * 2 + e.position.x * 0.5) * 0.08 - 0.1;
                    e.rotation.z = Math.PI / 2 + Math.sin(t * 1.2 + e.position.z) * 0.05;
                }
            });

            if (state.gameMode === 'fps') {
                this.updatePlayerPhysics();
                if (!state.isOnBoat) {
                    camera.rotation.order = "YXZ";
                    camera.rotation.y = state.player.yaw;
                    camera.rotation.x = state.player.pitch;
                    camera.position.copy(state.player.pos);
                }
            } else {
                const targetY = 4 + Math.sin(t * 0.5) * 0.3;
                camera.position.x = Math.sin(state.camAngle) * state.camRadius;
                camera.position.z = Math.cos(state.camAngle) * state.camRadius;
                camera.position.y += (targetY - camera.position.y) * 0.05;
                camera.lookAt(0, 0, 0);
            }

            for (let i = state.entities.length - 1; i >= 0; i--) {
                const e = state.entities[i];
                if (e.scale.x < 0.99) e.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
                if (e.userData.type === 'creature' || e.userData.type === 'chief') {
                    e.position.y = O_Y + 0.3 + Math.sin(t * 4 + e.userData.hopOffset) * 0.03;
                }
                if (e.userData.type === 'tree' || e.userData.type === 'bush') {
                    e.userData.productionTimer = (e.userData.productionTimer || 0) + 0.016;
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
                if (e.userData.type === 'chief') {
                    if (state.gameMode === 'fps') {
                        const distToPlayer = e.position.distanceTo(state.player.pos);
                        if (distToPlayer < 8.0) {
                            const dir = e.position.clone().sub(state.player.pos).normalize();
                            e.position.x += dir.x * e.userData.moveSpeed;
                            e.position.z += dir.z * e.userData.moveSpeed;
                            e.lookAt(new THREE.Vector3(e.position.x - dir.x, e.position.y, e.position.z - dir.z));
                        } else {
                            e.lookAt(new THREE.Vector3(state.player.pos.x, e.position.y, state.player.pos.z));
                        }
                    } else {
                        e.userData.fleeTimer = (e.userData.fleeTimer || 0) + 0.016;
                        if (e.userData.fleeTimer > 3) {
                            e.userData.fleeTimer = 0;
                            e.userData.wanderDir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
                        }
                        if (e.userData.wanderDir) {
                            e.position.x += e.userData.wanderDir.x * 0.01;
                            e.position.z += e.userData.wanderDir.z * 0.01;
                        }
                        const boundR = 5.0 * (this.islandGroup ? this.islandGroup.scale.x : 1);
                        if (e.position.x ** 2 + e.position.z ** 2 > boundR ** 2) {
                            const a = Math.atan2(e.position.z, e.position.x);
                            e.position.x = Math.cos(a) * boundR * 0.9;
                            e.position.z = Math.sin(a) * boundR * 0.9;
                        }
                    }
                }
                if (e.userData.type === 'creature' && !e.userData.held) {
                    e.userData.age = (e.userData.age || 0) + 0.016;
                    e.userData.hunger = (e.userData.hunger || 0) + 0.016 * 0.1;

                    // 1. Perception: Find Food
                    let nearestFood = null, minDist = Infinity;
                    state.foods.forEach(f => {
                        const d = e.position.distanceTo(f.position);
                        if (d < minDist) { minDist = d; nearestFood = f; }
                    });

                    // 2. Intent: Determine Base Direction
                    let moveDir = new THREE.Vector3();
                    let speed = e.userData.moveSpeed;

                    if (nearestFood && minDist < 6.0) {
                        if (minDist < 0.5) {
                            // Eat Logic
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
                            nearestFood = null; // Consumed
                        } else {
                            // Seek Food
                            moveDir.subVectors(nearestFood.position, e.position).normalize().multiplyScalar(1.0);
                        }
                    }

                    if (!nearestFood) {
                        // Wander Logic
                        e.userData.cooldown = (e.userData.cooldown || 0) - 0.016;
                        if (e.userData.cooldown <= 0) {
                            e.userData.cooldown = 1 + Math.random() * 2;
                            e.userData.wanderDir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
                        }
                        if (e.userData.wanderDir) moveDir.add(e.userData.wanderDir.clone().multiplyScalar(0.7));
                    }

                    // 3. Steering: Obstacle Avoidance & Separation
                    let separation = new THREE.Vector3();
                    state.obstacles.forEach(obs => {
                        if (obs === e) return;
                        const dist = e.position.distanceTo(obs.position);
                        const radius = obs.userData.radius || 0.5;
                        const avoidThreshold = radius + 0.6; // Safety bubble
                        if (dist < avoidThreshold) {
                            let push = new THREE.Vector3().subVectors(e.position, obs.position).normalize();
                            push.multiplyScalar((avoidThreshold - dist) * 2.0); // Stronger push when closer
                            separation.add(push);
                        }
                    });

                    moveDir.add(separation);

                    // 4. Locomotion
                    if (moveDir.lengthSq() > 0.001) {
                        moveDir.normalize();
                        // Smooth rotation (optional, sticking to direct lookAt for responsiveness)
                        const lookTarget = e.position.clone().add(moveDir);
                        lookTarget.y = e.position.y;
                        e.lookAt(lookTarget);
                        e.position.add(moveDir.multiplyScalar(speed));
                    }

                    // Bounds Check
                    const boundR = 5.0 * (this.islandGroup ? this.islandGroup.scale.x : 1);
                    if (e.position.x ** 2 + e.position.z ** 2 > boundR ** 2) {
                        const a = Math.atan2(e.position.z, e.position.x);
                        e.position.x = Math.cos(a) * boundR * 0.9;
                        e.position.z = Math.sin(a) * boundR * 0.9;
                    }

                    // Hunger & Death
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
                if (e.userData.type === 'egg') {
                    e.userData.hatchTimer = (e.userData.hatchTimer || 10) - 0.016;
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

            // Update second island entities (scale-in animation + creature/plant behavior)
            for (let i = state.secondEntities.length - 1; i >= 0; i--) {
                const e = state.secondEntities[i];
                if (!e.parent) { state.secondEntities.splice(i, 1); continue; }
                if (e.scale.x < 0.99) e.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
                if (e.userData.type === 'creature') {
                    e.position.y = O_Y + 0.3 + Math.sin(t * 4 + (e.userData.hopOffset || 0)) * 0.03;
                    // Simple wander on second island
                    e.userData.cooldown = (e.userData.cooldown || 0) - 0.016;
                    if (e.userData.cooldown <= 0) {
                        e.userData.cooldown = 2 + Math.random() * 3;
                        e.userData.wanderDir = new THREE.Vector3((Math.random() - 0.5), 0, (Math.random() - 0.5)).normalize();
                    }
                    if (e.userData.wanderDir) {
                        e.position.x += e.userData.wanderDir.x * 0.01;
                        e.position.z += e.userData.wanderDir.z * 0.01;
                    }
                    const off = state.secondIslandOffset;
                    const bR = 6.0 * (this.secondIslandGroup ? this.secondIslandGroup.scale.x : 1);
                    const dx = e.position.x - off.x;
                    const dz = e.position.z - off.z;
                    if (dx * dx + dz * dz > bR * bR) {
                        const a = Math.atan2(dz, dx);
                        e.position.x = off.x + Math.cos(a) * bR * 0.9;
                        e.position.z = off.z + Math.sin(a) * bR * 0.9;
                    }
                }
                if (e.userData.type === 'tree' || e.userData.type === 'bush') {
                    e.userData.productionTimer = (e.userData.productionTimer || 0) + 0.016;
                    if (e.userData.productionTimer > 30) {
                        e.userData.productionTimer = 0;
                        const foodPos = e.position.clone();
                        foodPos.x += (Math.random() - 0.5) * 1.2;
                        foodPos.z += (Math.random() - 0.5) * 1.2;
                        const food = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15), this.world.getMat(state.secondPalette ? state.secondPalette.accent : state.palette.accent));
                        food.position.set(foodPos.x, O_Y + 0.15, foodPos.z);
                        food.scale.set(0, 0, 0);
                        this.world.add(food);
                        state.secondFoods.push(food);
                    }
                }
            }

            // Update second island foods
            state.secondFoods.forEach(f => {
                if (f.scale.x < 0.99) f.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
                f.position.y = O_Y + 0.15 + Math.sin(t * 3 + f.position.x) * 0.05;
                f.rotation.y += 0.02;
            });

            state.foods.forEach(f => {
                if (f.scale.x < 0.99) f.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
                f.position.y = O_Y + 0.15 + Math.sin(t * 3 + f.position.x) * 0.05;
                f.rotation.y += 0.02;
                f.rotation.z = Math.sin(t * 2) * 0.1;
            });

            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.position.add(p.userData.vel);
                p.userData.vel.y -= 0.002;
                p.userData.life -= 0.03;
                p.material.opacity = p.userData.life;
                if (p.userData.life <= 0) { this.world.remove(p); state.particles.splice(i, 1); }
            }

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

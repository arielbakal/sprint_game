// =====================================================
// GAME ENGINE - THIRD PERSON ISLAND GAME
// =====================================================

import AudioManager from './AudioManager.js';
import GameState from './GameState.js';
import WorldManager from './WorldManager.js';
import EntityFactory from './EntityFactory.js';
import InputHandler from './InputHandler.js';
import PlayerController from './PlayerController.js';
import ChatManager from './ChatManager.js';

export default class GameEngine {
    constructor() {
        this.audio = new AudioManager();
        this.chatManager = new ChatManager(this); // Initialize before listeners
        this.state = new GameState();
        this.world = new WorldManager(0.5);
        this.factory = new EntityFactory(this.world, this.state);
        this.playerController = new PlayerController(this.world, this.state);
        this.spheres = [];
        this.islandGroups = [];   // Array of island group objects
        this.groundPlanes = [];   // Ground meshes for raycasting
        this.waterMesh = null;    // Reference to main water mesh
        this.logs = [];           // Logs placed on water
        this.boatPromptVisible = false;
        this._nearestBoat = null;
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
                if (it.type === 'wood' || it.type === 'log') d.style.background = d.style.color;
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
        this.state.heldAxe = null;
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
        this.logs = [];
        this.state.isOnBoat = false;
        this.state.activeBoat = null;
        this.state.heldAxe = null;
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
        // Get water mesh reference for boat placement
        this.waterMesh = island1.group.children.find(c => c.userData.type === 'water');

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

        // Spawn Chief Ruru on Island 1
        const chiefPos = rndPolar(0, 0, 3.0, 6.0);
        const chief = this.factory.createChief(this.state.palette, chiefPos.x, chiefPos.z);
        this.state.entities.push(chief);
        this.world.add(chief);

        // Axe placed randomly on island 1
        const axePos = rndPolar(0, 0, 2.0, 9.0);
        const axe = this.factory.createAxe(this.state.palette, axePos.x, axePos.z);
        this.state.entities.push(axe);
        this.world.add(axe);

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

        // Spawn companion cat near player
        this.playerCat = this.factory.createCat(1.5, 1.5);
        this.playerCat.scale.set(0.3, 0.3, 0.3);
        this.state.entities.push(this.playerCat);
        this.world.add(this.playerCat);

        // Set camera initial position behind player
        this.world.camera.position.set(0, O_Y + 5, 6);
        this.world.camera.fov = 60;
        this.world.camera.updateProjectionMatrix();

        if (!this.state.musicStarted) {
            this.audio.startMusic(this.state.worldDNA, this.ui.volSlider, this.ui.volIcon, this.ui.settingsBtn, this.ui.settingsPopup, this.audio);
            this.state.musicStarted = true;
        }
    }

    // --- Boat system ---
    boardBoat(boat) {
        const state = this.state;
        // Start the boarding animation instead of instantly boarding
        state.isBoardingBoat = true;
        state.boardingPhase = 0;
        state.boardingProgress = 0;
        state.boardingStartPos = state.player.pos.clone();
        state.boardingTargetBoat = boat;
        state.player.vel.set(0, 0, 0);
        if (this.ui.boatPrompt) this.ui.boatPrompt.style.display = 'none';
        this.boatPromptVisible = false;
        this.audio.sail();

        // Start cat boarding with 1-second delay
        if (this.playerCat) {
            state.catOnBoat = false;
            state.catBoardingDelay = 1.0;
            state.catBoardingQueued = true;
            state.catBoardingStartPos = this.playerCat.position.clone();
        }
    }

    finishBoarding() {
        const state = this.state;
        const boat = state.boardingTargetBoat;
        state.isBoardingBoat = false;
        state.boardingTargetBoat = null;
        state.isOnBoat = true;
        state.activeBoat = boat;
        state.boatSpeed = 0;
        state.boatRotation = boat.rotation.y;
        this.showBoatHUD(true);
        // Set player to seated pose on boat
        if (this.playerController.playerGroup) {
            this.playerController.playerGroup.visible = true;
            this.setSeatedPose();
        }
    }

    updateBoardingAnimation(dt) {
        const state = this.state;
        if (!state.isBoardingBoat || !state.boardingTargetBoat) return;

        const boat = state.boardingTargetBoat;
        const player = state.player;
        const pc = this.playerController;

        // Phase speeds
        const walkSpeed = 2.5;  // phase 0: walk to boat side
        const hopSpeed = 2.8;   // phase 1: hop up onto deck
        const settleSpeed = 3.0; // phase 2: settle into position

        if (state.boardingPhase === 0) {
            // --- Phase 0: Walk toward the boat edge ---
            state.boardingProgress += dt * walkSpeed;

            // Target: a point at the boat's side
            const boatSide = boat.position.clone();
            const sideAngle = Math.atan2(
                state.boardingStartPos.x - boat.position.x,
                state.boardingStartPos.z - boat.position.z
            );
            boatSide.x += Math.sin(sideAngle) * 2.0;
            boatSide.z += Math.cos(sideAngle) * 2.0;
            boatSide.y = player.pos.y;

            // Lerp position
            const t0 = Math.min(state.boardingProgress, 1);
            const ease = t0 * (2 - t0); // ease-out
            player.pos.lerpVectors(state.boardingStartPos, boatSide, ease);

            // Face the boat
            if (pc.modelPivot) {
                const lookAngle = Math.atan2(
                    boat.position.x - player.pos.x,
                    boat.position.z - player.pos.z
                );
                const targetQ = new THREE.Quaternion();
                targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookAngle);
                pc.modelPivot.quaternion.slerp(targetQ, 0.2);
            }

            // Walk animation
            if (pc.legL && pc.legR && pc.armL && pc.armR) {
                const walkCycle = performance.now() * 0.012;
                pc.legL.rotation.x = Math.sin(walkCycle) * 0.7;
                pc.legR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.7;
                pc.armL.rotation.x = Math.sin(walkCycle + Math.PI) * 0.4;
                pc.armR.rotation.x = Math.sin(walkCycle) * 0.4;
            }

            if (pc.playerGroup) pc.playerGroup.position.copy(player.pos);

            if (state.boardingProgress >= 1) {
                state.boardingPhase = 1;
                state.boardingProgress = 0;
                state._boardingHopStart = player.pos.clone();
            }
        } else if (state.boardingPhase === 1) {
            // --- Phase 1: Hop up onto the boat deck ---
            state.boardingProgress += dt * hopSpeed;
            const t1 = Math.min(state.boardingProgress, 1);
            const ease = t1 * t1 * (3 - 2 * t1); // smooth-step

            // Arc from side to boat center, with vertical hop
            const hopStart = state._boardingHopStart;
            const deckPos = boat.position.clone();
            deckPos.y = boat.position.y - 1.30; // deck height (matches seated position)

            player.pos.lerpVectors(hopStart, deckPos, ease);
            // Parabolic arc for the hop
            const hopHeight = 1.2;
            player.pos.y += Math.sin(t1 * Math.PI) * hopHeight;

            // Tuck legs mid-jump
            if (pc.legL && pc.legR) {
                const tuck = Math.sin(t1 * Math.PI) * 0.8;
                pc.legL.rotation.x = -tuck;
                pc.legR.rotation.x = -tuck;
            }
            if (pc.armL && pc.armR) {
                const reach = Math.sin(t1 * Math.PI) * 0.6;
                pc.armL.rotation.x = -reach;
                pc.armR.rotation.x = -reach;
                pc.armL.rotation.z = reach * 0.5;
                pc.armR.rotation.z = -reach * 0.5;
            }

            if (pc.playerGroup) pc.playerGroup.position.copy(player.pos);

            if (state.boardingProgress >= 1) {
                state.boardingPhase = 2;
                state.boardingProgress = 0;
            }
        } else if (state.boardingPhase === 2) {
            // --- Phase 2: Settle on deck, reset pose ---
            state.boardingProgress += dt * settleSpeed;
            const t2 = Math.min(state.boardingProgress, 1);

            // Snap onto boat position
            player.pos.copy(boat.position);
            player.pos.y = boat.position.y - 1.30;

            // Smoothly reset limbs to idle
            if (pc.legL && pc.legR && pc.armL && pc.armR) {
                pc.legL.rotation.x *= (1 - t2);
                pc.legR.rotation.x *= (1 - t2);
                pc.armL.rotation.x *= (1 - t2);
                pc.armR.rotation.x *= (1 - t2);
                pc.armL.rotation.z = (pc.armL.rotation.z || 0) * (1 - t2);
                pc.armR.rotation.z = (pc.armR.rotation.z || 0) * (1 - t2);
            }

            if (pc.playerGroup) pc.playerGroup.position.copy(player.pos);

            if (state.boardingProgress >= 1) {
                this.finishBoarding();
            }
        }

        // Camera follows smoothly during animation
        const ca = player.cameraAngle;
        ca.y = Math.max(0.1, Math.min(1.4, ca.y));
        const camDist = 6.0;
        const camX = player.pos.x + camDist * Math.sin(ca.x) * Math.cos(ca.y);
        const camZ = player.pos.z + camDist * Math.cos(ca.x) * Math.cos(ca.y);
        const camY = player.pos.y + camDist * Math.sin(ca.y) + 1.0;
        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        this.world.camera.position.lerp(desiredPos, 0.08);
        this.world.camera.lookAt(player.pos.x, player.pos.y + 0.5, player.pos.z);
    }

    disembarkBoat() {
        const state = this.state;
        if (!state.activeBoat) return;
        const boatPos = state.activeBoat.position;

        // Find nearest island to disembark
        let nearestIsland = null;
        let nearestDist = Infinity;
        for (const island of state.islands) {
            const dist = Math.sqrt((boatPos.x - island.center.x) ** 2 + (boatPos.z - island.center.z) ** 2);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIsland = island;
            }
        }

        if (nearestIsland && nearestDist < nearestIsland.radius + 10) {
            // Place player on the island edge nearest to boat
            var disembarkAngle = Math.atan2(boatPos.z - nearestIsland.center.z, boatPos.x - nearestIsland.center.x);
            state.player.pos.set(
                nearestIsland.center.x + Math.cos(disembarkAngle) * (nearestIsland.radius * 0.8),
                nearestIsland.floorY + 1,
                nearestIsland.center.z + Math.sin(disembarkAngle) * (nearestIsland.radius * 0.8)
            );
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
        // Reset player pose from seated and show
        if (this.playerController.playerGroup) {
            this.playerController.playerGroup.visible = true;
            this.resetSeatedPose();
        }

        // Disembark cat: place near player on island
        if (this.playerCat) {
            state.catOnBoat = false;
            state.catBoarding = false;
            state.catBoardingQueued = false;
            const cat = this.playerCat;
            const catAngle = disembarkAngle + 0.3;
            cat.position.set(
                nearestIsland.center.x + Math.cos(catAngle) * (nearestIsland.radius * 0.75),
                this.O_Y,
                nearestIsland.center.z + Math.sin(catAngle) * (nearestIsland.radius * 0.75)
            );
        }
    }

    setSeatedPose() {
        const pc = this.playerController;
        if (!pc.modelPivot) return;
        // Bend legs forward (sitting on deck)
        if (pc.legL) { pc.legL.rotation.x = -Math.PI / 2; pc.legL.position.y = 0.3; }
        if (pc.legR) { pc.legR.rotation.x = -Math.PI / 2; pc.legR.position.y = 0.3; }
        // Arms resting on lap
        if (pc.armL) { pc.armL.rotation.x = -0.4; pc.armL.rotation.z = 0.25; }
        if (pc.armR) { pc.armR.rotation.x = -0.4; pc.armR.rotation.z = -0.25; }
        // Lower the pivot so the character sits on the deck surface
        pc.modelPivot.position.y = -0.20;
    }

    resetSeatedPose() {
        const pc = this.playerController;
        if (!pc.modelPivot) return;
        if (pc.legL) { pc.legL.rotation.x = 0; pc.legL.position.y = 0.4; }
        if (pc.legR) { pc.legR.rotation.x = 0; pc.legR.position.y = 0.4; }
        if (pc.armL) { pc.armL.rotation.set(0, 0, 0); }
        if (pc.armR) { pc.armR.rotation.set(0, 0, 0); }
        pc.modelPivot.position.y = 0;
    }

    updateCatBoardingAnimation(dt) {
        const state = this.state;
        const cat = this.playerCat;
        if (!cat || !state.catBoarding) return;
        const boat = state.boardingTargetBoat || state.activeBoat;
        if (!boat) return;

        const catData = cat.userData;
        const t = performance.now() * 0.001;

        // Same phase speeds as player
        const walkSpeed = 2.5;
        const hopSpeed = 2.8;
        const settleSpeed = 3.0;

        // Cat's final deck position: behind the player (toward stern)
        const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation || boat.rotation.y), 0, -Math.cos(state.boatRotation || boat.rotation.y));
        const catDeckTarget = boat.position.clone();
        catDeckTarget.x -= bowDir.x * 1.2;
        catDeckTarget.z -= bowDir.z * 1.2;
        catDeckTarget.y = boat.position.y - 1.30;

        if (state.catBoardingPhase === 0) {
            // --- Phase 0: Walk toward the boat edge (same as player) ---
            state.catBoardingProgress += dt * walkSpeed;

            const sideAngle = Math.atan2(
                state.catBoardingStartPos.x - boat.position.x,
                state.catBoardingStartPos.z - boat.position.z
            );
            const boatSide = boat.position.clone();
            boatSide.x += Math.sin(sideAngle) * 2.0;
            boatSide.z += Math.cos(sideAngle) * 2.0;
            boatSide.y = this.O_Y;

            const t0 = Math.min(state.catBoardingProgress, 1);
            const ease = t0 * (2 - t0); // ease-out (same as player)
            cat.position.lerpVectors(state.catBoardingStartPos, boatSide, ease);

            // Face the boat (same as player)
            const lookAngle = Math.atan2(
                boat.position.x - cat.position.x,
                boat.position.z - cat.position.z
            );
            cat.rotation.y = lookAngle;

            // Walk animation (leg movement)
            if (catData.legs) {
                const walkCycle = t * 10;
                catData.legs[0].position.y = 0.1 + Math.sin(walkCycle) * 0.06;
                catData.legs[1].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.06;
                catData.legs[2].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.06;
                catData.legs[3].position.y = 0.1 + Math.sin(walkCycle) * 0.06;
            }

            if (state.catBoardingProgress >= 1) {
                state.catBoardingPhase = 1;
                state.catBoardingProgress = 0;
                state._catHopStart = cat.position.clone();
            }
        } else if (state.catBoardingPhase === 1) {
            // --- Phase 1: Hop up onto the boat deck (same as player) ---
            state.catBoardingProgress += dt * hopSpeed;
            const t1 = Math.min(state.catBoardingProgress, 1);
            const ease = t1 * t1 * (3 - 2 * t1); // smooth-step (same as player)

            cat.position.lerpVectors(state._catHopStart, catDeckTarget, ease);
            // Parabolic arc (same height as player)
            const hopHeight = 1.2;
            cat.position.y += Math.sin(t1 * Math.PI) * hopHeight;

            // Tuck legs mid-jump
            if (catData.legs) {
                const tuck = Math.sin(t1 * Math.PI) * 0.08;
                catData.legs.forEach(leg => {
                    leg.position.y = 0.1 + tuck;
                });
            }

            // Face the boat during hop
            cat.rotation.y = Math.atan2(
                boat.position.x - cat.position.x,
                boat.position.z - cat.position.z
            );

            if (state.catBoardingProgress >= 1) {
                state.catBoardingPhase = 2;
                state.catBoardingProgress = 0;
            }
        } else if (state.catBoardingPhase === 2) {
            // --- Phase 2: Settle on deck (same as player) ---
            state.catBoardingProgress += dt * settleSpeed;
            const t2 = Math.min(state.catBoardingProgress, 1);

            cat.position.copy(catDeckTarget);

            // Face the bow: cat model faces -Z, bow is -Z in boat space
            const bowAngle = state.boatRotation || boat.rotation.y;
            cat.rotation.y += (bowAngle - cat.rotation.y) * 0.15;

            // Reset legs to standing/sitting
            if (catData.legs) {
                catData.legs.forEach(leg => {
                    leg.position.y += (0.1 - leg.position.y) * 0.15;
                });
            }

            if (state.catBoardingProgress >= 1) {
                state.catBoarding = false;
                state.catOnBoat = true;
            }
        }

        // Tail sway during boarding
        if (catData.tail) {
            catData.tail.rotation.z = Math.sin(t * 3) * 0.4;
            catData.tail.rotation.x = 0.6 + Math.sin(t * 2) * 0.2;
        }
    }

    showBoatHUD(show) {
        const hint = document.getElementById('boat-nav-hint');
        if (hint) hint.style.display = show ? 'block' : 'none';
    }

    updateBoatPhysics(dt) {
        const state = this.state;
        const boat = state.activeBoat;
        if (!boat) return;

        // Steering
        const speedFactor = Math.min(Math.abs(state.boatSpeed) / state.boatMaxSpeed, 1);
        const turnRate = 0.02 * (0.3 + speedFactor * 0.7);
        if (state.inputs.a) state.boatRotation += turnRate;
        if (state.inputs.d) state.boatRotation -= turnRate;

        // Acceleration
        if (state.inputs.w) {
            state.boatSpeed = Math.min(state.boatSpeed + 0.003, state.boatMaxSpeed);
        } else if (state.inputs.s) {
            state.boatSpeed = Math.max(state.boatSpeed - 0.004, -state.boatMaxSpeed * 0.3);
        } else {
            state.boatSpeed *= 0.985;
            if (Math.abs(state.boatSpeed) < 0.001) state.boatSpeed = 0;
        }

        // Forward direction
        const forward = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));

        // New position
        const newX = boat.position.x + forward.x * state.boatSpeed;
        const newZ = boat.position.z + forward.z * state.boatSpeed;

        // Island collision
        const boatCollisionR = 3.0;
        let blocked = false;
        for (const island of state.islands) {
            const dx = newX - island.center.x;
            const dz = newZ - island.center.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = island.radius + boatCollisionR;
            if (dist < minDist) {
                const angle = Math.atan2(dz, dx);
                boat.position.x = island.center.x + Math.cos(angle) * minDist;
                boat.position.z = island.center.z + Math.sin(angle) * minDist;
                if (Math.abs(state.boatSpeed) > 0.02) this.audio.pop();
                state.boatSpeed *= -0.15;
                blocked = true;
                break;
            }
        }

        if (!blocked) {
            boat.position.x = newX;
            boat.position.z = newZ;
        }
        boat.rotation.y = state.boatRotation;

        // Ocean bobbing
        const t = performance.now() * 0.001;
        boat.position.y = Math.sin(t * 1.2) * 0.12 + Math.sin(t * 0.7) * 0.06;

        // Lean into turns
        const turnInput = (state.inputs.a ? 1 : 0) - (state.inputs.d ? 1 : 0);
        const targetLean = turnInput * speedFactor * -0.08;
        boat.rotation.z = boat.rotation.z * 0.9 + targetLean * 0.1;
        boat.rotation.x = Math.sin(t * 1.0 + 0.5) * 0.025 + state.boatSpeed * 0.1;

        // Position player on boat
        state.player.pos.copy(boat.position);
        state.player.pos.y += 0.6;

        // Update player model: seated on boat, facing bow (-Z)
        const pc = this.playerController;
        if (pc.playerGroup) {
            // Place player on the deck (deck is at y=-1.42 in boat local space)
            pc.playerGroup.position.copy(boat.position);
            pc.playerGroup.position.y = boat.position.y - 1.20;
            // Sit slightly toward the stern so they're behind the mast
            const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
            pc.playerGroup.position.x -= bowDir.x * 0.6;
            pc.playerGroup.position.z -= bowDir.z * 0.6;

            // Face the bow: player model faces +Z by default, bow is -Z, so add PI
            if (pc.modelPivot) {
                const targetQ = new THREE.Quaternion();
                targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.boatRotation + Math.PI);
                pc.modelPivot.quaternion.slerp(targetQ, 0.15);
            }

            // Gentle body sway with the waves
            if (pc.armL && pc.armR) {
                const sway = Math.sin(t * 1.5) * 0.06;
                pc.armL.rotation.z = 0.25 + sway;
                pc.armR.rotation.z = -0.25 - sway;
            }
        }

        // Position cat on boat (seated near the bow)
        if (this.playerCat && state.catOnBoat) {
            const cat = this.playerCat;
            const catData = cat.userData;
            const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
            cat.position.copy(boat.position);
            cat.position.y = boat.position.y - 1.30;
            // Offset behind the player toward stern
            cat.position.x -= bowDir.x * 1.2;
            cat.position.z -= bowDir.z * 1.2;
            // Face the bow (cat model faces -Z, bow direction is bowDir)
            cat.rotation.y = state.boatRotation;
            // Tail sway on boat
            if (catData.tail) {
                catData.tail.rotation.z = Math.sin(t * 2.0) * 0.2;
                catData.tail.rotation.x = 0.6 + Math.sin(t * 1.2) * 0.1;
            }
            // Legs tucked under (sitting)
            if (catData.legs) {
                catData.legs.forEach(leg => {
                    leg.position.y += (0.08 - leg.position.y) * 0.1;
                });
            }
        }

        // Update camera to follow boat
        const ca = state.player.cameraAngle;
        ca.y = Math.max(0.1, Math.min(1.4, ca.y));
        const dist = 8.0;
        const camX = boat.position.x + dist * Math.sin(ca.x) * Math.cos(ca.y);
        const camZ = boat.position.z + dist * Math.cos(ca.x) * Math.cos(ca.y);
        const camY = boat.position.y + dist * Math.sin(ca.y) + 1.5;
        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        this.world.camera.position.lerp(desiredPos, 0.08);
        this.world.camera.lookAt(boat.position.x, boat.position.y + 0.5, boat.position.z);

        // Wake particles
        if (Math.abs(state.boatSpeed) > 0.02 && Math.random() < 0.3) {
            const wakePos = boat.position.clone();
            wakePos.x -= forward.x * 2.5;
            wakePos.z -= forward.z * 2.5;
            wakePos.y = -1.9;
            this.factory.createParticle(wakePos, new THREE.Color(0xaaddff), 0.7);
        }
    }

    // --- Chopping system ---
    updateChopping(dt) {
        const state = this.state;
        if (!state.isChopping || !state.interactionTarget) {
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            return;
        }

        const tree = state.interactionTarget;
        const dx = tree.position.x - state.player.pos.x;
        const dz = tree.position.z - state.player.pos.z;
        if (Math.sqrt(dx * dx + dz * dz) > 3.5) {
            state.isChopping = false;
            state.chopProgress = 0;
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            return;
        }

        state.chopTimer += dt;

        if (this.ui.chopIndicator) {
            this.ui.chopIndicator.style.display = 'block';
            if (this.ui.chopFill) {
                this.ui.chopFill.style.width = ((state.chopProgress / 5) * 100) + '%';
            }
        }

        if (state.chopTimer >= 0.4) {
            state.chopTimer = 0;
            state.chopProgress++;
            this.audio.chop();

            const shakeX = (Math.random() - 0.5) * 0.15;
            const origX = tree.position.x;
            tree.position.x += shakeX;
            setTimeout(() => { if (tree.parent) tree.position.x = origX; }, 100);

            this.factory.createChopParticles(tree.position.clone(), this.state.palette.trunk);

            if (state.chopProgress >= 5) {
                this.audio.treeFall();
                const logX = tree.position.x + (Math.random() - 0.5) * 0.5;
                const logZ = tree.position.z + (Math.random() - 0.5) * 0.5;

                for (let i = 0; i < 15; i++) {
                    this.factory.createParticle(tree.position.clone(), this.state.palette.flora, 1.5);
                }

                this.world.remove(tree);
                const idx = state.entities.indexOf(tree);
                if (idx > -1) state.entities.splice(idx, 1);
                if (state.obstacles.includes(tree)) state.obstacles.splice(state.obstacles.indexOf(tree), 1);

                const log = this.factory.createLog(this.state.palette, logX, logZ);
                this.world.add(log);
                state.entities.push(log);

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

        for (let i = state.entities.length - 1; i >= 0; i--) {
            const e = state.entities[i];
            if (!e.userData.autoPickup) continue;
            const dx = e.position.x - playerPos.x;
            const dz = e.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < pickupRange && e.scale.x > 0.5) {
                if (e.userData.type === 'log') {
                    const added = this.addToInventory('wood', e.userData.color, null);
                    if (added) {
                        this.audio.pickup();
                        for (let j = 0; j < 8; j++) this.factory.createParticle(e.position.clone(), e.userData.color, 0.8);
                        this.world.remove(e);
                        state.entities.splice(i, 1);
                    }
                }
            }
        }
    }

    // --- Boat proximity check ---
    updateBoatProximity() {
        const state = this.state;
        if (state.isOnBoat) return;

        let nearBoat = null;
        let nearBoatDist = Infinity;
        state.entities.forEach(e => {
            if (e.userData.type === 'boat') {
                const d = state.player.pos.distanceTo(e.position);
                if (d < 6 && d < nearBoatDist) {
                    nearBoat = e;
                    nearBoatDist = d;
                }
            }
        });

        if (nearBoat && !this.boatPromptVisible) {
            if (this.ui.boatPrompt) this.ui.boatPrompt.style.display = 'block';
            this.boatPromptVisible = true;
        } else if (!nearBoat && this.boatPromptVisible) {
            if (this.ui.boatPrompt) this.ui.boatPrompt.style.display = 'none';
            this.boatPromptVisible = false;
        }
        this._nearestBoat = nearBoat;
    }

    animate(t) {
        requestAnimationFrame(this.animate);
        t *= 0.001;
        const state = this.state;
        const camera = this.world.camera;
        const O_Y = this.factory.O_Y;
        const dt = 0.016;

        if (state.phase === 'playing') {
            // --- Water animation ---
            this.islandGroups.forEach(ig => {
                const water = ig.group.children.find(c => c.userData.type === 'water');
                if (water) { water.rotation.z += 0.001; water.position.y = -2.0 + Math.sin(t * 0.5) * 0.15; }
            });

            // --- Boat/log animation ---
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

            // --- Player/Boat update ---
            if (state.isBoardingBoat) {
                this.updateBoardingAnimation(dt);
            }

            // Cat boarding delay countdown
            if (state.catBoardingQueued) {
                state.catBoardingDelay -= dt;
                if (state.catBoardingDelay <= 0) {
                    state.catBoardingQueued = false;
                    state.catBoarding = true;
                    state.catBoardingPhase = 0;
                    state.catBoardingProgress = 0;
                }
            }

            if (state.catBoarding) {
                this.updateCatBoardingAnimation(dt);
            }

            if (state.isOnBoat) {
                this.updateBoatPhysics(dt);
            } else if (!state.isBoardingBoat) {
                this.playerController.update(dt, state.islands);
                this.playerController.updateCamera(camera);
                this.input.updateInteraction();
                this.updateChopping(dt);
                this.updateAutoPickup();
                this.updateBoatProximity();
            }

            // --- Entity updates ---
            for (let i = state.entities.length - 1; i >= 0; i--) {
                const e = state.entities[i];
                if (e.scale.x < 0.99) e.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);

                if (e.userData.type === 'creature' || e.userData.type === 'chief') {
                    e.position.y = O_Y + 0.3 + Math.sin(t * 4 + (e.userData.hopOffset || 0)) * 0.03;
                }

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

            // Cat follow-player AI
            if (this.playerCat) {
                const cat = this.playerCat;
                const catData = cat.userData;
                const playerPos = state.player.pos;
                const dx = playerPos.x - cat.position.x;
                const dz = playerPos.z - cat.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                // Find which island the cat is on
                let catIsland = null;
                for (const island of state.islands) {
                    const ix = cat.position.x - island.center.x;
                    const iz = cat.position.z - island.center.z;
                    if (ix * ix + iz * iz < (island.radius * 0.95) * (island.radius * 0.95)) {
                        catIsland = island;
                        break;
                    }
                }
                if (!catIsland) catIsland = state.islands[0]; // fallback to island 1

                // Check if player is on the same island
                const playerOnCatIsland = (() => {
                    const px = playerPos.x - catIsland.center.x;
                    const pz = playerPos.z - catIsland.center.z;
                    return px * px + pz * pz < catIsland.radius * catIsland.radius;
                })();

                // If cat is on the boat or currently boarding, skip ground AI
                if (state.catOnBoat || state.catBoarding) {
                    // Cat is handled by updateBoatPhysics / updateCatBoardingAnimation
                } else if (state.catBoardingQueued) {
                    // Cat runs toward the boat during the delay
                    const boat = state.boardingTargetBoat || state.activeBoat;
                    if (boat) {
                        const bx = boat.position.x - cat.position.x;
                        const bz = boat.position.z - cat.position.z;
                        const bDist = Math.sqrt(bx * bx + bz * bz);
                        if (bDist > 1.5) {
                            const speed = catData.moveSpeed * 2.0;
                            cat.position.x += (bx / bDist) * speed;
                            cat.position.z += (bz / bDist) * speed;
                            cat.rotation.y = Math.atan2(bx / bDist, bz / bDist) + Math.PI;
                            // Run animation
                            if (catData.legs) {
                                const walkCycle = t * 10;
                                catData.legs[0].position.y = 0.1 + Math.sin(walkCycle) * 0.06;
                                catData.legs[1].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.06;
                                catData.legs[2].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.06;
                                catData.legs[3].position.y = 0.1 + Math.sin(walkCycle) * 0.06;
                            }
                        }
                    }
                } else if (state.isOnBoat || !playerOnCatIsland) {
                    catData.isIdle = true;
                    // Face player direction
                    if (dist > 0.3) {
                        const targetRot = Math.atan2(dx, dz) + Math.PI;
                        cat.rotation.y += (targetRot - cat.rotation.y) * 0.05;
                    }
                    if (catData.legs) {
                        catData.legs.forEach(leg => {
                            leg.position.y += (0.1 - leg.position.y) * 0.1;
                        });
                    }
                } else if (dist > catData.followDist) {
                    // Move toward player
                    catData.isIdle = false;
                    const speed = dist > 5 ? catData.moveSpeed * 2.5 : catData.moveSpeed;
                    const nx = dx / dist;
                    const nz = dz / dist;
                    cat.position.x += nx * speed;
                    cat.position.z += nz * speed;
                    // Face direction of movement
                    cat.rotation.y = Math.atan2(nx, nz) + Math.PI;

                    // Leg walk animation
                    if (catData.legs) {
                        const walkCycle = t * 8;
                        catData.legs[0].position.y = 0.1 + Math.sin(walkCycle) * 0.05;
                        catData.legs[1].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.05;
                        catData.legs[2].position.y = 0.1 + Math.sin(walkCycle + Math.PI) * 0.05;
                        catData.legs[3].position.y = 0.1 + Math.sin(walkCycle) * 0.05;
                    }
                } else {
                    catData.isIdle = true;
                    // Face player when idle
                    if (dist > 0.3) {
                        const targetRot = Math.atan2(dx, dz) + Math.PI;
                        cat.rotation.y += (targetRot - cat.rotation.y) * 0.05;
                    }
                    // Reset legs to standing
                    if (catData.legs) {
                        catData.legs.forEach(leg => {
                            leg.position.y += (0.1 - leg.position.y) * 0.1;
                        });
                    }
                }

                // Tail sway (always, unless on boat)
                if (catData.tail && !state.catOnBoat) {
                    catData.tail.rotation.z = Math.sin(t * 2.5) * 0.3;
                    catData.tail.rotation.x = 0.6 + Math.sin(t * 1.5) * 0.15;
                }

                // Gentle body bob (only on ground)
                if (!state.catOnBoat && !state.catBoarding) {
                    cat.position.y = O_Y + Math.sin(t * 3 + catData.hopOffset) * 0.015;
                }

                // Clamp cat to its current island (only when on ground, not boarding)
                if (!state.catOnBoat && !state.catBoarding && !state.catBoardingQueued) {
                    const rx = cat.position.x - catIsland.center.x;
                    const rz = cat.position.z - catIsland.center.z;
                    const r2 = rx * rx + rz * rz;
                    const maxR = catIsland.radius * 0.8;
                    if (r2 > maxR * maxR) {
                        const a = Math.atan2(rz, rx);
                        cat.position.x = catIsland.center.x + Math.cos(a) * maxR;
                        cat.position.z = catIsland.center.z + Math.sin(a) * maxR;
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

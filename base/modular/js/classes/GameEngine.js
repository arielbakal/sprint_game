// =====================================================
// GAME ENGINE - THIRD PERSON ISLAND GAME
// Refactored: delegates to extracted systems
// =====================================================

import AudioManager from './AudioManager.js';
import GameState from './GameState.js';
import WorldManager from './WorldManager.js';
import EntityFactory from './EntityFactory.js';
import InputHandler from './InputHandler.js';
import PlayerController from './PlayerController.js';
import ChatManager from './ChatManager.js';

// Extracted systems
import SystemManager from '../systems/SystemManager.js';
import BoatSystem from '../systems/BoatSystem.js';
import ChopSystem from '../systems/ChopSystem.js';
import MineSystem from '../systems/MineSystem.js';
import InventoryManager from '../systems/InventoryManager.js';
import EntityAISystem from '../systems/EntityAISystem.js';
import CatAI from '../systems/CatAI.js';
import ParticleSystem from '../systems/ParticleSystem.js';

// Network / multiplayer
import NetworkManager from '../network/NetworkManager.js';
import RemotePlayerManager from '../network/RemotePlayerManager.js';
import SeededRandom from '../network/SeededRandom.js';

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
        this.waterMesh = null;    // Reference to main water mesh
        this.logs = [];           // Logs placed on water
        this.clouds = [];         // Clouds in the sky
        this.boatPromptVisible = false;
        this.ui = {};
        this.setupUI();

        // Initialize extracted systems
        this.systems = new SystemManager();
        this.boatSystem = new BoatSystem(this.ui);
        this.chopSystem = new ChopSystem(this.ui);
        this.mineSystem = new MineSystem(this.ui);
        this.inventorySystem = new InventoryManager(this.state, this.audio, this.ui);
        this.entityAISystem = new EntityAISystem();
        this.catAI = new CatAI();
        this.particleSystem = new ParticleSystem();

        this.systems.register('boat', this.boatSystem);
        this.systems.register('chop', this.chopSystem);
        this.systems.register('mine', this.mineSystem);
        this.systems.register('inventory', this.inventorySystem);
        this.systems.register('entityAI', this.entityAISystem);
        this.systems.register('catAI', this.catAI);
        this.systems.register('particles', this.particleSystem);

        // --- Multiplayer ---
        this.network = new NetworkManager();
        this.remotePlayers = new RemotePlayerManager(this.world);
        this._setupNetworkCallbacks();

        this.chatManager = new ChatManager(this); // Initialize AFTER setupUI
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

        // Multiplayer connect/disconnect
        const mpBtn = document.getElementById('mp-connect-btn');
        const mpUrl = document.getElementById('mp-url');
        if (mpBtn && mpUrl) {
            mpBtn.addEventListener('click', () => {
                if (this.network.connected) {
                    this.disconnectMultiplayer();
                } else {
                    this.connectMultiplayer(mpUrl.value.trim());
                }
            });
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
                if (it.type === 'wood' || it.type === 'log') d.style.background = d.style.color;
                if (it.type === 'axe' || it.type === 'pickaxe') d.style.background = d.style.color;
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
        this.playerController.remove();
        this.audio.fadeOut();
        setTimeout(() => this.initGame(null), 800);
    }

    initGame(sphereColor) {
        // Use server seed if available (multiplayer world sync)
        let seededOverride = null;
        if (this.network && this.network.worldSeed !== null) {
            seededOverride = new SeededRandom(this.network.worldSeed).override();
        }

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
            floorY: O_Y + 0.05,
            name: "STARTING SHORE"
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
        // Creatures on island 1 - one of each type (blobby, blocky, conehead)
        const speciesTypes = ['blobby', 'blocky', 'conehead'];
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(0, 0, 2.0, 7.0);
            const creatureDNA = this.factory.generateCreatureDNA(this.state.palette, speciesTypes[i]);
            const c = this.factory.createCreature(this.state.palette, p.x, p.z, creatureDNA);
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
            floorY: O_Y + 0.05,
            name: "FLORA HAVEN"
        });
        // Vegetation on island 2
        for (let i = 0; i < 18; i++) { const p = rndPolar(80, 0, 2.0, 11.0); const e = this.factory.createTree(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 12; i++) { const p = rndPolar(80, 0, 1.5, 11.0); const e = this.factory.createBush(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(80, 0, 1.5, 11.0); const e = this.factory.createRock(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 20; i++) { const p = rndPolar(80, 0, 0.5, 12.0); const e = this.factory.createGrass(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 6; i++) { const p = rndPolar(80, 0, 1.0, 11.0); const e = this.factory.createFlower(palette2, p.x, p.z); this.state.entities.push(e); this.world.add(e); }

        // Pickaxe on island 2
        const pickPos = rndPolar(80, 0, 2.0, 10.0);
        const pickaxe = this.factory.createPickaxe(palette2, pickPos.x, pickPos.z);
        this.state.entities.push(pickaxe);
        this.world.add(pickaxe);

        // Creatures on island 2 - one of each type
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(80, 0, 2.0, 9.0);
            const creatureDNA = this.factory.generateCreatureDNA(palette2, speciesTypes[i]);
            const c = this.factory.createCreature(palette2, p.x, p.z, creatureDNA);
            c.userData.boundCenter = { x: 80, z: 0 };
            c.userData.boundRadius = island2.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // --- Island 3: The Ancient Island (Bigger, Mountain, Golem) ---
        const palette3 = this.factory.generatePalette('blue');
        const island3 = this.factory.createIslandAt(palette3, 0, 110, 28, false);
        this.world.add(island3.group);
        this.islandGroups.push(island3);
        this.groundPlanes.push(island3.groundPlane);
        this.state.islands.push({
            center: new THREE.Vector3(0, 0, 110),
            radius: island3.radius,
            floorY: O_Y + 0.05,
            name: "ANCIENT PEAKS"
        });

        // Mountain in the center (climbable)
        const mountain = this.factory.createMountain(palette3, 0, 110, 1.5);
        this.world.add(mountain);
        this.state.entities.push(mountain);
        mountain.userData.isMountain = true;
        mountain.userData.mountRadius = 15.0;
        mountain.userData.mountHeight = 18.0;

        // Stone Golem near the mountain
        const golem = this.factory.createStoneGolem(palette3, 0, 127);
        this.world.add(golem);
        this.state.entities.push(golem);

        // Bigger rocks on island 3
        for (let i = 0; i < 8; i++) {
            const p = rndPolar(0, 110, 18.0, 26.0);
            const rock = this.factory.createRock(palette3, p.x, p.z);
            rock.scale.set(3, 3, 3);
            this.state.entities.push(rock);
            this.world.add(rock);
            this.state.obstacles.push(rock);
        }

        // Gold rocks on the edges of island 3 (mineable with pickaxe)
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = island3.radius * 0.9;
            const px = 0 + Math.cos(angle) * r;
            const pz = 110 + Math.sin(angle) * r;
            const scale = (2.5 + Math.random() * 1.5) * 0.2;
            const goldRock = this.factory.createGoldRock(palette3, px, pz, scale);
            this.state.entities.push(goldRock);
            this.world.add(goldRock);
        }

        // Vegetation for island 3 (Outside mountain radius)
        for (let i = 0; i < 10; i++) { const p = rndPolar(0, 110, 17.0, 26.0); const e = this.factory.createTree(palette3, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 40; i++) { const p = rndPolar(0, 110, 17.0, 27.0); const e = this.factory.createGrass(palette3, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 12; i++) { const p = rndPolar(0, 110, 17.0, 22.0); const e = this.factory.createFlower(palette3, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        // Creatures on island 3 - 3 types + 2 random
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(0, 110, 17.0, 24.0);
            const creatureDNA = this.factory.generateCreatureDNA(palette3, speciesTypes[i]);
            const c = this.factory.createCreature(palette3, p.x, p.z, creatureDNA);
            c.userData.boundCenter = { x: 0, z: 110 };
            c.userData.boundRadius = island3.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }
        for (let i = 0; i < 2; i++) {
            const p = rndPolar(0, 110, 17.0, 24.0);
            const c = this.factory.createCreature(palette3, p.x, p.z);
            c.userData.boundCenter = { x: 0, z: 110 };
            c.userData.boundRadius = island3.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // --- Island 4: Fourth island ---
        const palette4 = this.factory.generatePalette(null);
        const island4 = this.factory.createIslandAt(palette4, -90, -50, 11, false);
        this.world.add(island4.group);
        this.islandGroups.push(island4);
        this.groundPlanes.push(island4.groundPlane);
        this.state.islands.push({
            center: new THREE.Vector3(-90, 0, -50),
            radius: island4.radius,
            floorY: O_Y + 0.05,
            name: "ROCKY OUTPOST"
        });
        for (let i = 0; i < 4; i++) { const p = rndPolar(-90, -50, 2.0, 8.0); const e = this.factory.createTree(palette4, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 3; i++) { const p = rndPolar(-90, -50, 1.5, 8.0); const e = this.factory.createBush(palette4, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 3; i++) { const p = rndPolar(-90, -50, 1.5, 8.0); const e = this.factory.createRock(palette4, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 12; i++) { const p = rndPolar(-90, -50, 0.5, 9.0); const e = this.factory.createGrass(palette4, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(-90, -50, 1.0, 8.0); const e = this.factory.createFlower(palette4, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        // Creatures on island 4 - one of each type
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(-90, -50, 2.0, 6.0);
            const creatureDNA = this.factory.generateCreatureDNA(palette4, speciesTypes[i]);
            const c = this.factory.createCreature(palette4, p.x, p.z, creatureDNA);
            c.userData.boundCenter = { x: -90, z: -50 };
            c.userData.boundRadius = island4.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // --- Island 5: Fifth island ---
        const palette5 = this.factory.generatePalette(null);
        const island5 = this.factory.createIslandAt(palette5, 50, -100, 13, false);
        this.world.add(island5.group);
        this.islandGroups.push(island5);
        this.groundPlanes.push(island5.groundPlane);
        this.state.islands.push({
            center: new THREE.Vector3(50, 0, -100),
            radius: island5.radius,
            floorY: O_Y + 0.05,
            name: "DISTANT SHORES"
        });
        for (let i = 0; i < 5; i++) { const p = rndPolar(50, -100, 2.0, 10.0); const e = this.factory.createTree(palette5, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(50, -100, 1.5, 10.0); const e = this.factory.createBush(palette5, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 4; i++) { const p = rndPolar(50, -100, 1.5, 10.0); const e = this.factory.createRock(palette5, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 18; i++) { const p = rndPolar(50, -100, 0.5, 11.0); const e = this.factory.createGrass(palette5, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        for (let i = 0; i < 5; i++) { const p = rndPolar(50, -100, 1.0, 10.0); const e = this.factory.createFlower(palette5, p.x, p.z); this.state.entities.push(e); this.world.add(e); }
        // Creatures on island 5 - 3 types
        for (let i = 0; i < 3; i++) {
            const p = rndPolar(50, -100, 2.0, 8.0);
            const creatureDNA = this.factory.generateCreatureDNA(palette5, speciesTypes[i]);
            const c = this.factory.createCreature(palette5, p.x, p.z, creatureDNA);
            c.userData.boundCenter = { x: 50, z: -100 };
            c.userData.boundRadius = island5.radius * 0.85;
            this.state.entities.push(c);
            this.world.add(c);
        }

        // Global clouds scattered across the entire map
        for (let i = 0; i < 40; i++) {
            const cx = (Math.random() - 0.5) * 300;
            const cz = (Math.random() - 0.5) * 300;
            const cloud = this.factory.createCloud(cx, 15 + Math.random() * 15, cz);
            cloud.scale.set(1, 1, 1);
            cloud.userData.speed = 0.5 + Math.random() * 1.5;
            this.world.add(cloud);
            this.clouds.push(cloud);
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
        this.playerCat.scale.set(0.15, 0.15, 0.15);
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

        // Restore Math.random after seeded world generation
        if (seededOverride) seededOverride.restore();
    }

    // --- Boat system (delegated to BoatSystem) ---
    boardBoat(boat) {
        const ctx = {
            state: this.state,
            audio: this.audio,
            playerCat: this.playerCat
        };
        this.boatSystem.boardBoat(boat, ctx);
    }

    finishBoarding() {
        const ctx = {
            state: this.state,
            playerController: this.playerController
        };
        this.boatSystem.finishBoarding(ctx);
    }

    // Old methods removed — now handled by:
    //   BoatSystem    → boarding, physics, proximity, seated pose
    //   ChopSystem    → tree chopping
    //   MineSystem    → rock mining
    //   InventoryManager → auto-pickup
    //   EntityAISystem   → creature AI, food, eggs, golem
    //   CatAI            → cat follow AI
    //   ParticleSystem   → particles & debris

    disembarkBoat() {
        const ctx = {
            state: this.state,
            audio: this.audio,
            playerController: this.playerController,
            playerCat: this.playerCat,
            factory: this.factory
        };
        this.boatSystem.disembarkBoat(ctx);
    }

    // Legacy accessor - InputHandler reads _nearestBoat
    get _nearestBoat() {
        return this.boatSystem ? this.boatSystem.nearestBoat : null;
    }

    updateIslandIndicator() {
        const state = this.state;
        const playerPos = state.isOnBoat ? state.activeBoat.position : state.player.pos;
        let currentIsland = null;

        for (const island of state.islands) {
            const dx = playerPos.x - island.center.x;
            const dz = playerPos.z - island.center.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < island.radius + 5) {
                currentIsland = island;
                break;
            }
        }

        if (currentIsland) {
            if (state.lastIslandName !== currentIsland.name) {
                state.lastIslandName = currentIsland.name;
                if (this.ui.islandIndicator) {
                    this.ui.islandIndicator.textContent = currentIsland.name;
                    this.ui.islandIndicator.style.display = 'block';
                    // Hide after a few seconds
                    if (this.islandIndicatorTimeout) clearTimeout(this.islandIndicatorTimeout);
                    this.islandIndicatorTimeout = setTimeout(() => {
                        this.ui.islandIndicator.style.display = 'none';
                    }, 4000);
                }
            }
        } else {
            state.lastIslandName = null;
        }
    }

    // =====================================================
    // MULTIPLAYER
    // =====================================================

    _setupNetworkCallbacks() {
        this.network.onPlayerJoin = (id, data) => {
            this.remotePlayers.addPlayer(id, data);
            this._showMultiplayerToast(`Player ${id} joined`);
        };

        this.network.onPlayerLeave = (id) => {
            this.remotePlayers.removePlayer(id);
            this._showMultiplayerToast(`Player ${id} left`);
        };

        this.network.onPlayerUpdate = (id, data) => {
            this.remotePlayers.updatePlayer(id, data);
        };

        this.network.onWorldEvent = (event) => {
            this._handleRemoteWorldEvent(event);
        };
    }

    async connectMultiplayer(url) {
        if (this.network.connected) return;
        try {
            await this.network.connect(url);
            this._showMultiplayerToast(`Connected as Player ${this.network.playerId}`);
            const btn = document.getElementById('mp-connect-btn');
            if (btn) {
                btn.textContent = 'DISCONNECT';
                btn.classList.add('connected');
            }
            const status = document.getElementById('mp-status');
            if (status) status.textContent = `Player #${this.network.playerId}`;
        } catch (err) {
            console.error('[Multiplayer] Connection failed:', err);
            this._showMultiplayerToast('Connection failed!');
        }
    }

    disconnectMultiplayer() {
        this.network.disconnect();
        this.remotePlayers.clear();
        const btn = document.getElementById('mp-connect-btn');
        if (btn) {
            btn.textContent = 'CONNECT';
            btn.classList.remove('connected');
        }
        const status = document.getElementById('mp-status');
        if (status) status.textContent = 'Offline';
        this._showMultiplayerToast('Disconnected');
    }

    _showMultiplayerToast(msg) {
        let toast = document.getElementById('mp-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mp-toast';
            toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);' +
                'background:rgba(0,0,0,0.8);color:#0f0;padding:8px 20px;border-radius:4px;' +
                'font-family:monospace;font-size:13px;z-index:9999;transition:opacity 0.5s;pointer-events:none;';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
    }

    _handleRemoteWorldEvent(event) {
        switch (event.action) {
            case 'tree_chopped': {
                const idx = this.state.entities.findIndex(e =>
                    e.userData.type === 'tree' &&
                    Math.abs(e.position.x - event.x) < 1 &&
                    Math.abs(e.position.z - event.z) < 1
                );
                if (idx !== -1) {
                    const tree = this.state.entities[idx];
                    this.world.scene.remove(tree);
                    this.state.entities.splice(idx, 1);
                    const oi = this.state.obstacles.indexOf(tree);
                    if (oi !== -1) this.state.obstacles.splice(oi, 1);
                }
                break;
            }
            case 'rock_mined': {
                const idx = this.state.entities.findIndex(e =>
                    (e.userData.type === 'rock' || e.userData.type === 'goldrock') &&
                    Math.abs(e.position.x - event.x) < 1 &&
                    Math.abs(e.position.z - event.z) < 1
                );
                if (idx !== -1) {
                    const rock = this.state.entities[idx];
                    this.world.scene.remove(rock);
                    this.state.entities.splice(idx, 1);
                    const oi = this.state.obstacles.indexOf(rock);
                    if (oi !== -1) this.state.obstacles.splice(oi, 1);
                }
                break;
            }
        }
    }

    broadcastWorldEvent(action, x, z) {
        this.network.sendWorldEvent({ action, x, z });
    }

    animate(t) {
        requestAnimationFrame(this.animate);
        t *= 0.001;
        const state = this.state;
        const camera = this.world.camera;
        const O_Y = this.factory.O_Y;

        // Fixed timestep → actual delta (TODO: accumulator-based fixed step)
        if (!this._lastTime) this._lastTime = t;
        const dt = Math.min(t - this._lastTime, 0.05); // cap at 50ms
        this._lastTime = t;

        if (state.phase === 'playing') {
            // --- Water animation ---
            this.islandGroups.forEach(ig => {
                const water = ig.group.children.find(c => c.userData.type === 'water');
                if (water) { water.rotation.z += 0.001; water.position.y = -2.0 + Math.sin(t * 0.5) * 0.15; }
            });

            // --- Boat/log bob animation ---
            state.entities.forEach(e => {
                if (e.userData.type === 'boat' && e !== state.activeBoat) {
                    e.position.y = Math.sin(t * 1.5 + e.position.x) * 0.1;
                    e.rotation.z = Math.sin(t * 0.8 + e.position.z) * 0.02;
                }
                if (e.userData.type === 'log' && !e.userData.onLand) {
                    e.position.y = Math.sin(t * 2 + e.position.x * 0.5) * 0.08 - 0.1;
                    e.rotation.z = Math.PI / 2 + Math.sin(t * 1.2 + e.position.z) * 0.05;
                }
            });

            // --- Cloud animation ---
            this.clouds.forEach(cloud => {
                cloud.position.x += cloud.userData.speed * dt;
                if (cloud.position.x > 200) {
                    cloud.position.x = -200;
                }
            });

            // Build shared context for all systems
            const ctx = {
                state,
                world: this.world,
                audio: this.audio,
                factory: this.factory,
                camera,
                playerController: this.playerController,
                playerCat: this.playerCat,
                t,
                broadcastWorldEvent: (action, x, z) => this.broadcastWorldEvent(action, x, z)
            };

            // --- Boat system (boarding, physics, proximity) ---
            this.boatSystem.update(dt, ctx);

            // --- Player movement & interaction (when not on boat) ---
            if (state.isOnBoat) {
                // Boat system handles everything
            } else if (!state.isBoardingBoat) {
                this.playerController.update(dt, state.islands);
                this.playerController.updateCamera(camera);
                this.input.updateInteraction();
                this.chopSystem.update(dt, ctx);
                this.mineSystem.update(dt, ctx);
                this.inventorySystem.update(dt, ctx);
            }

            this.updateIslandIndicator();

            // --- Entity AI (creatures, golem, eggs, food) ---
            this.entityAISystem.update(dt, ctx);

            // --- Cat companion AI ---
            this.catAI.update(dt, ctx);

            // --- Particles & debris ---
            this.particleSystem.update(dt, ctx);

            // --- Multiplayer: send state & interpolate remote players ---
            this.network.sendPlayerState(state);
            this.remotePlayers.update(dt);
        }
        this.world.render();
    }
}

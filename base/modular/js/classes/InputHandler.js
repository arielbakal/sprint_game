// =====================================================
// INPUT HANDLER - THIRD PERSON CONTROLS
// =====================================================

export default class InputHandler {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
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
            if (k === ' ') { state.inputs.space = true; e.preventDefault(); }
            // Inventory slots 1-8
            if (state.phase === 'playing' && !isNaN(parseInt(k)) && parseInt(k) >= 1 && parseInt(k) <= 8) {
                const idx = parseInt(k) - 1;
                if (state.selectedSlot === idx) { state.selectedSlot = null; sfx.select(); }
                else if (state.inventory[idx]) { state.selectedSlot = idx; sfx.select(); }
                this.engine.updateInventory();
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
        const renderer = this.engine.world.renderer;

        // Click to capture pointer lock (third person orbit camera)
        document.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (state.phase !== 'playing') return;
            if (document.pointerLockElement === renderer.domElement) return;
            if (document.getElementById('settings-popup').classList.contains('open')) return;
            if (e.target === renderer.domElement) {
                renderer.domElement.requestPointerLock();
            }
        });

        // Mouse look — orbit camera
        document.addEventListener('mousemove', (e) => {
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
            if (document.pointerLockElement === renderer.domElement) {
                state.player.cameraAngle.x -= e.movementX * state.sensitivity;
                state.player.cameraAngle.y -= e.movementY * state.sensitivity;
                // Clamp vertical
                state.player.cameraAngle.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.player.cameraAngle.y));
            }
        });

        // Scroll — cycle inventory
        window.addEventListener('wheel', (e) => {
            if (state.phase !== 'playing') return;
            if (e.deltaY > 0) state.selectedSlot = (state.selectedSlot === null ? 0 : (state.selectedSlot + 1) % 8);
            else state.selectedSlot = (state.selectedSlot === null ? 7 : (state.selectedSlot - 1 + 8) % 8);
            if (state.selectedSlot !== null && !state.inventory[state.selectedSlot]) { }
            this.engine.updateInventory();
        });

        window.addEventListener('scroll', (e) => e.preventDefault(), { passive: false });
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        this.setupPointerEvents();
    }

    setupPointerEvents() {
        const renderer = this.engine.world.renderer;
        const state = this.engine.state;
        const world = this.engine.world;
        const sfx = this.engine.audio;

        // Pointer down — start chopping
        renderer.domElement.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (state.phase !== 'playing') return;

            // Start chopping if interactionTarget is a choppable tree
            if (state.interactionTarget && state.interactionTarget.userData.choppable) {
                state.isChopping = true;
                state.chopTimer = 0.4; // Trigger first hit quickly
            }
        });

        // Pointer up — stop chopping
        renderer.domElement.addEventListener('pointerup', (e) => {
            if (e.button !== 0) return;
            state.isChopping = false;
        });


    }

    // Called each frame by GameEngine to check interaction targets
    updateInteraction() {
        const state = this.engine.state;
        if (state.phase !== 'playing') return;

        const playerPos = state.player.pos;
        const interactRange = 3.0;

        // Find nearest choppable tree within range
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
            if (!nearest || nearest !== state.interactionTarget) {
                state.chopProgress = 0;
            }
        }

        state.interactionTarget = nearest;

        // Highlight new target
        if (nearest) {
            this.setHighlight(nearest, true);
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
        const renderer = this.engine.world.renderer;
        const state = this.engine.state;
        // Touch — single finger moves camera
        let lastTouchX = 0, lastTouchY = 0;
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            }
        });
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                const dx = e.touches[0].clientX - lastTouchX;
                const dy = e.touches[0].clientY - lastTouchY;
                state.player.cameraAngle.x -= dx * state.sensitivity * 2;
                state.player.cameraAngle.y -= dy * state.sensitivity * 2;
                state.player.cameraAngle.y = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, state.player.cameraAngle.y));
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            }
        });
    }
}

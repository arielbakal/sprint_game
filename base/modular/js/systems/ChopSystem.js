// =====================================================
// CHOP SYSTEM - Tree chopping mechanics
// =====================================================

import { CHOP_HITS, HIT_INTERVAL, CHOP_MAX_RANGE } from '../constants.js';

export default class ChopSystem {
    constructor(ui) {
        this.ui = ui;
        this.swingTimer = 0;     // counts down from swing duration
        this.swingDuration = 0.15; // how long one swing takes (seconds)
        this.isSwinging = false;
    }

    update(dt, context) {
        const { state, world, audio, factory, broadcastWorldEvent, playerController } = context;

        // Update swing timer
        if (this.isSwinging) {
            this.swingTimer -= dt;
            if (this.swingTimer <= 0) {
                this.isSwinging = false;
            }
        }

        if (!state.isChopping || !state.interactionTarget) {
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            // Reset arm animation state
            if (playerController) playerController.chopAnimState = null;
            return;
        }

        const tree = state.interactionTarget;
        const dx = tree.position.x - state.player.pos.x;
        const dz = tree.position.z - state.player.pos.z;
        if (Math.sqrt(dx * dx + dz * dz) > CHOP_MAX_RANGE) {
            state.isChopping = false;
            state.chopProgress = 0;
            if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            return;
        }

        state.chopTimer += dt;

        if (this.ui.chopIndicator) {
            this.ui.chopIndicator.style.display = 'block';
            if (this.ui.chopFill) {
                this.ui.chopFill.style.width = ((state.chopProgress / CHOP_HITS) * 100) + '%';
            }
        }

        // Make the player face the tree while chopping
        if (playerController && playerController.modelPivot) {
            const faceDx = tree.position.x - state.player.pos.x;
            const faceDz = tree.position.z - state.player.pos.z;
            const targetAngle = Math.atan2(faceDx, faceDz);
            const targetQ = new THREE.Quaternion();
            targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
            playerController.modelPivot.quaternion.slerp(targetQ, 0.2);
        }

        // Send arm animation state to PlayerController
        if (playerController) {
            playerController.chopAnimState = {
                isSwinging: this.isSwinging,
                swingProgress: this.isSwinging ? (this.swingTimer / this.swingDuration) : 0
            };
        }

        if (state.chopTimer >= HIT_INTERVAL) {
            state.chopTimer = 0;
            state.chopProgress++;
            audio.chop();

            // Trigger swing animation
            this.isSwinging = true;
            this.swingTimer = this.swingDuration;

            // Tree shake
            const shakeX = (Math.random() - 0.5) * 0.15;
            const origX = tree.position.x;
            tree.position.x += shakeX;
            setTimeout(() => { if (tree.parent) tree.position.x = origX; }, 100);

            factory.createChopParticles(tree.position.clone(), state.palette.trunk);

            if (state.chopProgress >= CHOP_HITS) {
                audio.treeFall();
                const logX = tree.position.x + (Math.random() - 0.5) * 0.5;
                const logZ = tree.position.z + (Math.random() - 0.5) * 0.5;

                for (let i = 0; i < 15; i++) {
                    factory.createParticle(tree.position.clone(), state.palette.flora, 1.5);
                }

                world.remove(tree);
                const idx = state.entities.indexOf(tree);
                if (idx > -1) state.entities.splice(idx, 1);
                if (state.obstacles.includes(tree)) state.obstacles.splice(state.obstacles.indexOf(tree), 1);

                // Broadcast to other players
                if (broadcastWorldEvent) broadcastWorldEvent('tree_chopped', tree.position.x, tree.position.z);

                const log = factory.createLog(state.palette, logX, logZ);
                world.add(log);
                state.entities.push(log);

                state.isChopping = false;
                state.chopProgress = 0;
                state.interactionTarget = null;
                if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
            }
        }
    }
}

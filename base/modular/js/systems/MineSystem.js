// =====================================================
// MINE SYSTEM - Rock/Gold mining mechanics
// =====================================================

import { MINE_HITS, HIT_INTERVAL, CHOP_MAX_RANGE, MINE_DROP_COUNT } from '../constants.js';

export default class MineSystem {
    constructor(ui) {
        this.ui = ui;
    }

    update(dt, context) {
        const { state, world, audio, factory, broadcastWorldEvent } = context;

        if (!state.isMining || !state.interactionTarget) return;

        const rock = state.interactionTarget;
        const dx = rock.position.x - state.player.pos.x;
        const dz = rock.position.z - state.player.pos.z;
        if (Math.sqrt(dx * dx + dz * dz) > CHOP_MAX_RANGE) {
            state.isMining = false;
            state.mineProgress = 0;
            return;
        }

        state.mineTimer += dt;

        // Reuse chop indicator for mining
        if (this.ui.chopIndicator) {
            this.ui.chopIndicator.style.display = 'block';
            if (this.ui.chopFill) {
                this.ui.chopFill.style.width = ((state.mineProgress / MINE_HITS) * 100) + '%';
                this.ui.chopFill.style.background = '#aaaaaa'; // Grey for stone
            }
        }

        if (state.mineTimer >= HIT_INTERVAL) {
            state.mineTimer = 0;
            state.mineProgress++;
            audio.chop();

            // Rock shake
            const shakeX = (Math.random() - 0.5) * 0.15;
            const origX = rock.position.x;
            rock.position.x += shakeX;
            setTimeout(() => { if (rock.parent) rock.position.x = origX; }, 100);

            factory.createChopParticles(rock.position.clone(), rock.userData.color || new THREE.Color(0x888888));

            if (state.mineProgress >= MINE_HITS) {
                audio.treeFall();

                // Spawn resource drops
                const dropColor = rock.userData.type === 'gold_rock'
                    ? new THREE.Color(0xffd700)
                    : (rock.userData.color || new THREE.Color(0x888888));

                for (let i = 0; i < MINE_DROP_COUNT; i++) {
                    const drop = new THREE.Mesh(
                        new THREE.DodecahedronGeometry(0.15),
                        world.getMat(dropColor)
                    );
                    drop.userData = { type: 'rock', color: dropColor, autoPickup: true };
                    drop.position.copy(rock.position);
                    drop.position.y += 0.5;
                    drop.position.x += (Math.random() - 0.5) * 0.8;
                    drop.position.z += (Math.random() - 0.5) * 0.8;
                    world.add(drop);
                    state.entities.push(drop);
                }

                // Remove rock
                world.remove(rock);
                const idx = state.entities.indexOf(rock);
                if (idx > -1) state.entities.splice(idx, 1);
                if (state.obstacles.includes(rock)) state.obstacles.splice(state.obstacles.indexOf(rock), 1);

                // Broadcast to other players
                if (broadcastWorldEvent) broadcastWorldEvent('rock_mined', rock.position.x, rock.position.z);

                state.isMining = false;
                state.mineProgress = 0;
                state.interactionTarget = null;
                if (this.ui.chopIndicator) this.ui.chopIndicator.style.display = 'none';
                if (this.ui.chopFill) this.ui.chopFill.style.background = '#ff8800'; // Reset color
            }
        }
    }
}

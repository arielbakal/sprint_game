// =====================================================
// BOAT SYSTEM - Boarding, physics, cat boarding
// =====================================================

import {
    BOAT_MAX_SPEED, BOAT_ACCELERATION, BOAT_BRAKE, BOAT_REVERSE_FACTOR,
    BOAT_DRAG, BOAT_MIN_SPEED, BOAT_COLLISION_RADIUS, BOAT_PROXIMITY_RANGE,
    BOAT_DECK_Y_OFFSET, BOAT_PLAYER_Y_OFFSET,
    BOARDING_WALK_SPEED, BOARDING_HOP_SPEED, BOARDING_SETTLE_SPEED,
    BOARDING_HOP_HEIGHT, BOARDING_SIDE_DIST, CAT_BOARDING_DELAY
} from '../constants.js';

export default class BoatSystem {
    constructor(ui) {
        this.ui = ui;
        this.boatPromptVisible = false;
        this._nearestBoat = null;
    }

    get nearestBoat() { return this._nearestBoat; }

    boardBoat(boat, context) {
        const { state, audio, playerCat } = context;
        state.isBoardingBoat = true;
        state.boardingPhase = 0;
        state.boardingProgress = 0;
        state.boardingStartPos = state.player.pos.clone();
        state.boardingTargetBoat = boat;
        state.player.vel.set(0, 0, 0);
        if (this.ui.boatPrompt) this.ui.boatPrompt.style.display = 'none';
        this.boatPromptVisible = false;
        audio.sail();

        // Cat boarding with delay
        if (playerCat) {
            state.catOnBoat = false;
            state.catBoardingDelay = CAT_BOARDING_DELAY;
            state.catBoardingQueued = true;
            state.catBoardingStartPos = playerCat.position.clone();
        }
    }

    finishBoarding(context) {
        const { state, playerController } = context;
        const boat = state.boardingTargetBoat;
        state.isBoardingBoat = false;
        state.boardingTargetBoat = null;
        state.isOnBoat = true;
        state.activeBoat = boat;
        state.boatSpeed = 0;
        state.boatRotation = boat.rotation.y;
        this.showBoatHUD(true);
        if (playerController.playerGroup) {
            playerController.playerGroup.visible = true;
            this.setSeatedPose(playerController);
        }
    }

    disembarkBoat(context) {
        const { state, audio, playerController, playerCat, factory } = context;
        if (!state.activeBoat) return;
        const boatPos = state.activeBoat.position;

        // Find nearest island
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
            var disembarkAngle = Math.atan2(boatPos.z - nearestIsland.center.z, boatPos.x - nearestIsland.center.x);
            state.player.pos.set(
                nearestIsland.center.x + Math.cos(disembarkAngle) * (nearestIsland.radius * 0.8),
                nearestIsland.floorY + 1,
                nearestIsland.center.z + Math.sin(disembarkAngle) * (nearestIsland.radius * 0.8)
            );
        } else {
            audio.pop();
            return;
        }

        state.isOnBoat = false;
        state.boatSpeed = 0;
        state.player.vel.set(0, 0, 0);
        audio.pickup();
        this.showBoatHUD(false);
        if (playerController.playerGroup) {
            playerController.playerGroup.visible = true;
            this.resetSeatedPose(playerController);
        }

        // Disembark cat
        if (playerCat) {
            state.catOnBoat = false;
            state.catBoarding = false;
            state.catBoardingQueued = false;
            const catAngle = disembarkAngle + 0.3;
            playerCat.position.set(
                nearestIsland.center.x + Math.cos(catAngle) * (nearestIsland.radius * 0.75),
                factory.O_Y,
                nearestIsland.center.z + Math.sin(catAngle) * (nearestIsland.radius * 0.75)
            );
        }
    }

    setSeatedPose(pc) {
        if (!pc.modelPivot) return;
        if (pc.legL) { pc.legL.rotation.x = -Math.PI / 2; pc.legL.position.y = 0.3; }
        if (pc.legR) { pc.legR.rotation.x = -Math.PI / 2; pc.legR.position.y = 0.3; }
        if (pc.armL) { pc.armL.rotation.x = -0.4; pc.armL.rotation.z = 0.25; }
        if (pc.armR) { pc.armR.rotation.x = -0.4; pc.armR.rotation.z = -0.25; }
        pc.modelPivot.position.y = -0.20;
    }

    resetSeatedPose(pc) {
        if (!pc.modelPivot) return;
        if (pc.legL) { pc.legL.rotation.x = 0; pc.legL.position.y = 0.4; }
        if (pc.legR) { pc.legR.rotation.x = 0; pc.legR.position.y = 0.4; }
        if (pc.armL) { pc.armL.rotation.set(0, 0, 0); }
        if (pc.armR) { pc.armR.rotation.set(0, 0, 0); }
        pc.modelPivot.position.y = 0;
    }

    showBoatHUD(show) {
        const hint = document.getElementById('boat-nav-hint');
        if (hint) hint.style.display = show ? 'block' : 'none';
    }

    updateBoardingAnimation(dt, context) {
        const { state, playerController: pc } = context;
        if (!state.isBoardingBoat || !state.boardingTargetBoat) return;

        const boat = state.boardingTargetBoat;
        const player = state.player;

        if (state.boardingPhase === 0) {
            state.boardingProgress += dt * BOARDING_WALK_SPEED;
            const boatSide = boat.position.clone();
            const sideAngle = Math.atan2(
                state.boardingStartPos.x - boat.position.x,
                state.boardingStartPos.z - boat.position.z
            );
            boatSide.x += Math.sin(sideAngle) * BOARDING_SIDE_DIST;
            boatSide.z += Math.cos(sideAngle) * BOARDING_SIDE_DIST;
            boatSide.y = player.pos.y;

            const t0 = Math.min(state.boardingProgress, 1);
            const ease = t0 * (2 - t0);
            player.pos.lerpVectors(state.boardingStartPos, boatSide, ease);

            if (pc.modelPivot) {
                const lookAngle = Math.atan2(boat.position.x - player.pos.x, boat.position.z - player.pos.z);
                const targetQ = new THREE.Quaternion();
                targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), lookAngle);
                pc.modelPivot.quaternion.slerp(targetQ, 0.2);
            }

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
            state.boardingProgress += dt * BOARDING_HOP_SPEED;
            const t1 = Math.min(state.boardingProgress, 1);
            const ease = t1 * t1 * (3 - 2 * t1);

            const hopStart = state._boardingHopStart;
            const deckPos = boat.position.clone();
            deckPos.y = boat.position.y + BOAT_DECK_Y_OFFSET;

            player.pos.lerpVectors(hopStart, deckPos, ease);
            player.pos.y += Math.sin(t1 * Math.PI) * BOARDING_HOP_HEIGHT;

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
            state.boardingProgress += dt * BOARDING_SETTLE_SPEED;
            const t2 = Math.min(state.boardingProgress, 1);

            player.pos.copy(boat.position);
            player.pos.y = boat.position.y + BOAT_DECK_Y_OFFSET;

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
                this.finishBoarding(context);
            }
        }

        // Camera follows during animation
        const ca = player.cameraAngle;
        ca.y = Math.max(0.1, Math.min(1.4, ca.y));
        const camDist = 6.0;
        const camX = player.pos.x + camDist * Math.sin(ca.x) * Math.cos(ca.y);
        const camZ = player.pos.z + camDist * Math.cos(ca.x) * Math.cos(ca.y);
        const camY = player.pos.y + camDist * Math.sin(ca.y) + 1.0;
        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        context.camera.position.lerp(desiredPos, 0.08);
        context.camera.lookAt(player.pos.x, player.pos.y + 0.5, player.pos.z);
    }

    updateCatBoardingAnimation(dt, context) {
        const { state, playerCat: cat } = context;
        if (!cat || !state.catBoarding) return;
        const boat = state.boardingTargetBoat || state.activeBoat;
        if (!boat) return;

        const catData = cat.userData;
        const t = performance.now() * 0.001;

        const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation || boat.rotation.y), 0, -Math.cos(state.boatRotation || boat.rotation.y));
        const catDeckTarget = boat.position.clone();
        catDeckTarget.x -= bowDir.x * 1.2;
        catDeckTarget.z -= bowDir.z * 1.2;
        catDeckTarget.y = boat.position.y + BOAT_DECK_Y_OFFSET;

        if (state.catBoardingPhase === 0) {
            state.catBoardingProgress += dt * BOARDING_WALK_SPEED;
            const sideAngle = Math.atan2(
                state.catBoardingStartPos.x - boat.position.x,
                state.catBoardingStartPos.z - boat.position.z
            );
            const boatSide = boat.position.clone();
            boatSide.x += Math.sin(sideAngle) * BOARDING_SIDE_DIST;
            boatSide.z += Math.cos(sideAngle) * BOARDING_SIDE_DIST;
            boatSide.y = context.factory.O_Y;

            const t0 = Math.min(state.catBoardingProgress, 1);
            const ease = t0 * (2 - t0);
            cat.position.lerpVectors(state.catBoardingStartPos, boatSide, ease);
            cat.rotation.y = Math.atan2(boat.position.x - cat.position.x, boat.position.z - cat.position.z);

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
            state.catBoardingProgress += dt * BOARDING_HOP_SPEED;
            const t1 = Math.min(state.catBoardingProgress, 1);
            const ease = t1 * t1 * (3 - 2 * t1);

            cat.position.lerpVectors(state._catHopStart, catDeckTarget, ease);
            cat.position.y += Math.sin(t1 * Math.PI) * BOARDING_HOP_HEIGHT;

            if (catData.legs) {
                const tuck = Math.sin(t1 * Math.PI) * 0.08;
                catData.legs.forEach(leg => { leg.position.y = 0.1 + tuck; });
            }
            cat.rotation.y = Math.atan2(boat.position.x - cat.position.x, boat.position.z - cat.position.z);

            if (state.catBoardingProgress >= 1) {
                state.catBoardingPhase = 2;
                state.catBoardingProgress = 0;
            }
        } else if (state.catBoardingPhase === 2) {
            state.catBoardingProgress += dt * BOARDING_SETTLE_SPEED;
            cat.position.copy(catDeckTarget);
            const bowAngle = state.boatRotation || boat.rotation.y;
            cat.rotation.y += (bowAngle - cat.rotation.y) * 0.15;
            if (catData.legs) {
                catData.legs.forEach(leg => { leg.position.y += (0.1 - leg.position.y) * 0.15; });
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

    updateBoatPhysics(dt, context) {
        const { state, audio, factory, playerController: pc, playerCat, camera } = context;
        const boat = state.activeBoat;
        if (!boat) return;

        // Steering
        const speedFactor = Math.min(Math.abs(state.boatSpeed) / BOAT_MAX_SPEED, 1);
        const turnRate = 0.02 * (0.3 + speedFactor * 0.7);
        if (state.inputs.a) state.boatRotation += turnRate;
        if (state.inputs.d) state.boatRotation -= turnRate;

        // Acceleration
        if (state.inputs.w) {
            state.boatSpeed = Math.min(state.boatSpeed + BOAT_ACCELERATION, BOAT_MAX_SPEED);
        } else if (state.inputs.s) {
            state.boatSpeed = Math.max(state.boatSpeed - BOAT_BRAKE, -BOAT_MAX_SPEED * BOAT_REVERSE_FACTOR);
        } else {
            state.boatSpeed *= BOAT_DRAG;
            if (Math.abs(state.boatSpeed) < BOAT_MIN_SPEED) state.boatSpeed = 0;
        }

        const forward = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
        const newX = boat.position.x + forward.x * state.boatSpeed;
        const newZ = boat.position.z + forward.z * state.boatSpeed;

        // Island collision
        let blocked = false;
        for (const island of state.islands) {
            const dx = newX - island.center.x;
            const dz = newZ - island.center.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const minDist = island.radius + BOAT_COLLISION_RADIUS;
            if (dist < minDist) {
                const angle = Math.atan2(dz, dx);
                boat.position.x = island.center.x + Math.cos(angle) * minDist;
                boat.position.z = island.center.z + Math.sin(angle) * minDist;
                if (Math.abs(state.boatSpeed) > 0.02) audio.pop();
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

        // Lean
        const turnInput = (state.inputs.a ? 1 : 0) - (state.inputs.d ? 1 : 0);
        const targetLean = turnInput * speedFactor * -0.08;
        boat.rotation.z = boat.rotation.z * 0.9 + targetLean * 0.1;
        boat.rotation.x = Math.sin(t * 1.0 + 0.5) * 0.025 + state.boatSpeed * 0.1;

        // Player on boat
        state.player.pos.copy(boat.position);
        state.player.pos.y += 0.6;

        if (pc.playerGroup) {
            pc.playerGroup.position.copy(boat.position);
            pc.playerGroup.position.y = boat.position.y + BOAT_PLAYER_Y_OFFSET;
            const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
            pc.playerGroup.position.x -= bowDir.x * 0.6;
            pc.playerGroup.position.z -= bowDir.z * 0.6;

            if (pc.modelPivot) {
                const targetQ = new THREE.Quaternion();
                targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), state.boatRotation + Math.PI);
                pc.modelPivot.quaternion.slerp(targetQ, 0.15);
            }

            if (pc.armL && pc.armR) {
                const sway = Math.sin(t * 1.5) * 0.06;
                pc.armL.rotation.z = 0.25 + sway;
                pc.armR.rotation.z = -0.25 - sway;
            }
        }

        // Cat on boat
        if (playerCat && state.catOnBoat) {
            const catData = playerCat.userData;
            const bowDir = new THREE.Vector3(-Math.sin(state.boatRotation), 0, -Math.cos(state.boatRotation));
            playerCat.position.copy(boat.position);
            playerCat.position.y = boat.position.y + BOAT_DECK_Y_OFFSET;
            playerCat.position.x -= bowDir.x * 1.2;
            playerCat.position.z -= bowDir.z * 1.2;
            playerCat.rotation.y = state.boatRotation;
            if (catData.tail) {
                catData.tail.rotation.z = Math.sin(t * 2.0) * 0.2;
                catData.tail.rotation.x = 0.6 + Math.sin(t * 1.2) * 0.1;
            }
            if (catData.legs) {
                catData.legs.forEach(leg => { leg.position.y += (0.08 - leg.position.y) * 0.1; });
            }
        }

        // Camera
        const ca = state.player.cameraAngle;
        ca.y = Math.max(0.1, Math.min(1.4, ca.y));
        const dist = 8.0;
        const camX = boat.position.x + dist * Math.sin(ca.x) * Math.cos(ca.y);
        const camZ = boat.position.z + dist * Math.cos(ca.x) * Math.cos(ca.y);
        const camY = boat.position.y + dist * Math.sin(ca.y) + 1.5;
        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        camera.position.lerp(desiredPos, 0.08);
        camera.lookAt(boat.position.x, boat.position.y + 0.5, boat.position.z);

        // Wake particles
        if (Math.abs(state.boatSpeed) > 0.02 && Math.random() < 0.3) {
            const wakePos = boat.position.clone();
            wakePos.x -= forward.x * 2.5;
            wakePos.z -= forward.z * 2.5;
            wakePos.y = -1.9;
            factory.createParticle(wakePos, new THREE.Color(0xaaddff), 0.7);
        }
    }

    updateProximity(context) {
        const { state } = context;
        if (state.isOnBoat) return;

        let nearBoat = null;
        let nearBoatDist = Infinity;
        state.entities.forEach(e => {
            if (e.userData.type === 'boat') {
                const d = state.player.pos.distanceTo(e.position);
                if (d < BOAT_PROXIMITY_RANGE && d < nearBoatDist) {
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

    update(dt, context) {
        const { state } = context;

        // Boarding animation
        if (state.isBoardingBoat) {
            this.updateBoardingAnimation(dt, context);
        }

        // Cat boarding delay
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
            this.updateCatBoardingAnimation(dt, context);
        }

        // Boat physics
        if (state.isOnBoat) {
            this.updateBoatPhysics(dt, context);
        }

        // Proximity check (only when walking)
        if (!state.isOnBoat && !state.isBoardingBoat) {
            this.updateProximity(context);
        }
    }
}

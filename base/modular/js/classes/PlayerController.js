// =====================================================
// PLAYER CONTROLLER - THIRD PERSON CHARACTER
// =====================================================

import { CAMERA_MIN_Y, CAMERA_MAX_Y } from '../constants.js';


export default class PlayerController {
    constructor(world, state) {
        this.world = world;
        this.state = state;
        this.playerGroup = null;
        this.modelPivot = null;
        // Limb refs for animation
        this.legL = null;
        this.legR = null;
        this.armL = null;
        this.armR = null;
        this.time = 0;
        this.chopAnimState = null; // set by ChopSystem: { isSwinging, swingProgress }
    }

    createModel(palette) {
        // Root group — positioned at player world position
        this.playerGroup = new THREE.Group();

        // Pivot — rotates to face movement direction
        this.modelPivot = new THREE.Group();
        this.modelPivot.scale.setScalar(0.6);
        this.playerGroup.add(this.modelPivot);

        // Materials from palette (ties character to world DNA)
        const matBody = this.world.getMat(palette.creature);
        const matLimb = this.world.getMat(palette.flora);
        const matEye = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const matPupil = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Torso (origin at feet)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), matBody);
        torso.position.y = 0.7;
        this.modelPivot.add(torso);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), matLimb);
        head.position.y = 1.2;
        this.modelPivot.add(head);

        // Eyes (face +Z)
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), matEye);
        eyeL.position.set(0.12, 1.2, 0.2);
        const eyeR = eyeL.clone();
        eyeR.position.set(-0.12, 1.2, 0.2);
        const pupilGeo = new THREE.BoxGeometry(0.04, 0.04, 0.06);
        const pupilL = new THREE.Mesh(pupilGeo, matPupil);
        pupilL.position.z = 0.01;
        const pupilR = pupilL.clone();
        eyeL.add(pupilL);
        eyeR.add(pupilR);
        this.modelPivot.add(eyeL, eyeR);

        // Legs — pivot at top
        const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        legGeo.translate(0, -0.2, 0);
        this.legL = new THREE.Mesh(legGeo, matLimb);
        this.legL.position.set(0.15, 0.4, 0);
        this.legR = new THREE.Mesh(legGeo, matLimb);
        this.legR.position.set(-0.15, 0.4, 0);
        this.modelPivot.add(this.legL, this.legR);

        // Arms — pivot at top
        const armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
        armGeo.translate(0, -0.2, 0);
        this.armL = new THREE.Mesh(armGeo, matLimb);
        this.armL.position.set(0.35, 0.9, 0);
        this.armR = new THREE.Mesh(armGeo, matLimb);
        this.armR.position.set(-0.35, 0.9, 0);
        this.modelPivot.add(this.armL, this.armR);

        // Hand anchor points for holding items
        this.handAnchorL = new THREE.Group();
        this.handAnchorL.position.set(0, -0.4, 0);
        this.armL.add(this.handAnchorL);

        this.handAnchorR = new THREE.Group();
        this.handAnchorR.position.set(0, -0.4, 0);
        this.armR.add(this.handAnchorR);

        this.heldItem = null;

        this.world.add(this.playerGroup);
    }

    holdItem(item) {
        if (this.heldItem) {
            this.handAnchorR.remove(this.heldItem);
        }
        this.heldItem = item;
        if (item) {
            item.rotation.set(Math.PI, Math.PI, -Math.PI / 4);
            item.position.set(0, 0, 0);
            this.handAnchorR.add(item);
        }
    }

    update(dt, islands) {
        if (!this.playerGroup) return;
        if (this.state.isDead) return;
        const state = this.state;
        const player = state.player;
        this.time += dt;

        // --- Camera-relative movement direction ---
        const camera = this.world.camera;

        // Robust Forward Calculation:
        // Instead of projecting forward vector (unstable at poles), use Right vector cross Up
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0);

        // Get camera's local X axis (Right) in world space
        // Note: camera.matrixWorld handles rotation. Column 0 is Right, 1 Up, 2 Back usually.
        // Safer to just use cross product of forward if not too steep, OR rely on a known Up?
        // Actually, just projecting camera forward on XZ plane is standard, but let's clamp it.
        const camFwd = new THREE.Vector3();
        camera.getWorldDirection(camFwd);
        camFwd.y = 0;
        if (camFwd.lengthSq() < 0.001) {
            // Camera looking straight down/up - fallback to current player forward or default North
            camFwd.set(0, 0, -1);
        } else {
            camFwd.normalize();
        }

        camRight.crossVectors(camFwd, camUp).normalize();

        // Corrected movement logic relative to camera
        const moveDir = new THREE.Vector3(0, 0, 0);
        let isMoving = false;

        if (player.stunTimer > 0) {
            player.stunTimer -= dt;
            // Apply friction to knockback velocity
            player.vel.x *= 0.9;
            player.vel.z *= 0.9;
        } else {
            if (state.inputs.w) moveDir.add(camFwd);
            if (state.inputs.s) moveDir.sub(camFwd);
            // A moves Left (negative Right)
            if (state.inputs.a) moveDir.sub(camRight);
            // D moves Right (positive Right)
            if (state.inputs.d) moveDir.add(camRight);

            // Check threshold larger than 0 to avoid jitter
            if (moveDir.lengthSq() > 0.01) {
                isMoving = true;
                moveDir.normalize();

                const effectiveSpeed = player.speed + (player.speedBoost || 0);
                player.vel.x = moveDir.x * effectiveSpeed;
                player.vel.z = moveDir.z * effectiveSpeed;

                // Rotation smoothing loop
                // Calculate target angle
                const targetAngle = Math.atan2(moveDir.x, moveDir.z);

                // Shortest path interpolation for angle
                let angleDiff = targetAngle - player.targetRotation;
                // Normalize to -PI..PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Add smoothed diff
                player.targetRotation += angleDiff * 0.2; // Smooth snapping
            } else {
                player.vel.x *= 0.8;
                player.vel.z *= 0.8;
            }
        }

        // Gravity
        player.vel.y -= 0.015;

        // Apply velocity (Temporarily)
        const nextPos = player.pos.clone().add(player.vel);

        // --- Multi-island ground & boundary collision ---
        let onAnyIsland = false;
        let activeIsland = null;

        // First find which island we are most likely on or over
        for (const island of islands) {
            const dx = nextPos.x - island.center.x;
            const dz = nextPos.z - island.center.z;
            const distSq = dx * dx + dz * dz;
            // Check broadly if we are within this island's influence (radius + small buffer)
            if (distSq < (island.radius * 1.5) ** 2) {
                activeIsland = island;
                break;
            }
        }

        if (activeIsland) {
            const dx = nextPos.x - activeIsland.center.x;
            const dz = nextPos.z - activeIsland.center.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // 1. Boundary Check: Prevent walking off
            if (dist > activeIsland.radius - 0.5) {
                const angle = Math.atan2(dz, dx);
                nextPos.x = activeIsland.center.x + Math.cos(angle) * (activeIsland.radius - 0.5);
                nextPos.z = activeIsland.center.z + Math.sin(angle) * (activeIsland.radius - 0.5);
                player.vel.x = 0;
                player.vel.z = 0;
            }

            // 2. Floor collision
            if (nextPos.y < activeIsland.floorY) {
                nextPos.y = activeIsland.floorY;
                player.vel.y = 0;
                player.onGround = true;
                onAnyIsland = true;
            }
        } else if (nextPos.y < -15) {
            // Fallback: only if somehow forced off-island (e.g. initial spawn bug), respawn
            nextPos.set(islands[0].center.x, islands[0].floorY + 3, islands[0].center.z);
            player.vel.set(0, 0, 0);
            onAnyIsland = true; // technically on safe ground now
        }

        // Apply validated position
        player.pos.copy(nextPos);

        // --- Obstacle Collision (Simple circle push-out + Mountain Climbing) ---
        const playerRadius = 0.4;
        let groundHeightOverride = null;

        for (const obs of state.obstacles) {
            // Mountain Climbing Logic
            if (obs.userData.isMountain) {
                const dx = player.pos.x - obs.position.x;
                const dz = player.pos.z - obs.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const maxR = obs.userData.mountRadius;
                if (dist < maxR) {
                    // Simple linear cone height approximation
                    // height at center = mountHeight + base_y
                    // height at edge = base_y
                    // y = base_y + mountHeight * (1 - dist/maxR)
                    // base_y is usually -1.4 (O_Y)
                    const base_y = -1.4;
                    const h = base_y + obs.userData.mountHeight * (1 - dist / maxR);

                    // If we are above (or slightly below) the mountain surface, snap to it
                    // Check if player is somewhat near the surface to snap
                    if (player.pos.y > h - 1.0) {
                        groundHeightOverride = h;
                    }
                }
                continue; // Don't process as a wall
            }

            if (!obs.userData.radius) continue;
            const dx = player.pos.x - obs.position.x;
            const dz = player.pos.z - obs.position.z;
            const distSq = dx * dx + dz * dz;
            const minDist = playerRadius + obs.userData.radius;
            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                if (dist > 0.001) {
                    const pushX = (dx / dist) * overlap;
                    const pushZ = (dz / dist) * overlap;
                    player.pos.x += pushX;
                    player.pos.z += pushZ;
                }
            }
        }

        // Apply mountain height if active
        if (groundHeightOverride !== null) {
            // Only snap if we are falling or walking on it
            if (player.pos.y < groundHeightOverride + 0.5) {
                player.pos.y = groundHeightOverride;
                player.vel.y = 0;
                player.onGround = true;
                // Update playerGroup immediately to avoid jitter
                this.playerGroup.position.copy(player.pos);
            }
        }

        // Jump
        if (player.onGround && state.inputs.space) {
            player.vel.y = 0.2;
            player.onGround = false;
        }

        // If falling, mark not on ground
        if (player.vel.y < -0.001) {
            player.onGround = false;
        }

        // --- Update mesh position ---
        this.playerGroup.position.copy(player.pos);

        // --- Smooth rotation ---
        if (isMoving) {
            const targetQ = new THREE.Quaternion();
            targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), player.targetRotation);
            this.modelPivot.quaternion.slerp(targetQ, 0.2); // Snap faster if input is reliable
        }

        // --- Invincibility flash ---
        if (state.invincibleTimer > 0 && this.modelPivot) {
            this.modelPivot.visible = Math.sin(state.invincibleTimer * 16) > 0;
        } else if (this.modelPivot && !this.modelPivot.visible && player.cameraMode !== 'first') {
            this.modelPivot.visible = true;
        }

        // --- Procedural animation ---
        if (state.isAttacking) {
            // Two-phase attack swing with both arms
            const swingT = (state._attackVisualTimer || 0) / 0.4; // normalized 0→1

            let armAngleR, armAngleL;
            if (swingT < 0.4) {
                // Wind-up: both arms pull back
                const t = swingT / 0.4;
                armAngleR = -1.8 * t;
                armAngleL = -1.4 * t;
            } else if (swingT < 0.8) {
                // Swing: both arms thrust forward
                const t = (swingT - 0.4) / 0.4;
                armAngleR = -1.8 + (1.8 + 1.2) * t;  // -1.8 → 1.2
                armAngleL = -1.4 + (1.4 + 0.8) * t;  // -1.4 → 0.8
            } else {
                // Recovery: lerp back to neutral
                const t = (swingT - 0.8) / 0.2;
                armAngleR = 1.2 * (1 - t);
                armAngleL = 0.8 * (1 - t);
            }

            this.armR.rotation.x = armAngleR;
            this.armL.rotation.x = armAngleL;
            this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, 0.15);
            this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, 0.15);
            this.modelPivot.position.y = THREE.MathUtils.lerp(this.modelPivot.position.y, 0, 0.1);
        } else if (this.chopAnimState) {
            // Chopping animation — override arms while chopping
            const { isSwinging, swingProgress } = this.chopAnimState;

            // Right arm (holds axe): swing forward on hit, hold raised between hits
            if (isSwinging) {
                // Swing: arm goes from raised (-1.2 rad) to forward/down (1.0 rad)
                const t = 1.0 - swingProgress; // 0→1 over swing
                const swingAngle = -1.2 + t * 2.2; // -1.2 → 1.0
                this.armR.rotation.x = swingAngle;
            } else {
                // Between hits: hold arm raised (wind-up pose)
                this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, -1.2, 0.15);
            }

            // Left arm stays relatively still
            this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, -0.3, 0.1);

            // Legs stay still while chopping
            this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, 0.1);
            this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, 0.1);
            this.modelPivot.position.y = THREE.MathUtils.lerp(this.modelPivot.position.y, 0, 0.1);

        } else if (isMoving && player.onGround) {
            const walkCycle = this.time * 10;
            this.legL.rotation.x = Math.sin(walkCycle) * 0.8;
            this.legR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.8;
            this.armL.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
            this.armR.rotation.x = Math.sin(walkCycle) * 0.5;
            this.modelPivot.position.y = Math.abs(Math.sin(walkCycle * 2)) * 0.05;
        } else {
            const lerp = 0.1;
            this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, 0, lerp);
            this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, 0, lerp);
            this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0, lerp);
            this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, 0, lerp);
            this.modelPivot.position.y = THREE.MathUtils.lerp(this.modelPivot.position.y, 0, lerp);
        }
    }

    updateCamera(camera) {
        if (!this.playerGroup) return;
        const player = this.state.player;
        const ca = player.cameraAngle;

        // Clamp vertical angle
        if (player.cameraMode !== 'first') {
            // Restrict for TPS
            ca.y = Math.max(CAMERA_MIN_Y || 0.1, Math.min(CAMERA_MAX_Y || 1.4, ca.y));
        }

        if (player.cameraMode === 'first') {
            if (this.modelPivot) this.modelPivot.visible = false;
            // First person: Camera at eye level
            camera.position.set(player.pos.x, player.pos.y + 1.6, player.pos.z);

            // ca.x = yaw (horizontal), ca.y = pitch (vertical, positive = up)
            const lookX = -Math.sin(ca.x) * Math.cos(ca.y);
            const lookZ = -Math.cos(ca.x) * Math.cos(ca.y);
            const lookY = Math.sin(ca.y);

            const target = new THREE.Vector3(
                camera.position.x + lookX,
                camera.position.y + lookY,
                camera.position.z + lookZ
            );
            camera.lookAt(target);

            // Sync player rotation to camera look for movement
            // Ideally player body rotates with camera in FPS
            player.targetRotation = ca.x;

        } else {
            if (this.modelPivot) this.modelPivot.visible = true;
            const dist = 5.0;
            const camX = player.pos.x + dist * Math.sin(ca.x) * Math.cos(ca.y);
            const camZ = player.pos.z + dist * Math.cos(ca.x) * Math.cos(ca.y);
            // ca.y is elevation angle [0.1, 1.4]
            const camY = player.pos.y + dist * Math.sin(ca.y) + 0.8;

            const desiredPos = new THREE.Vector3(camX, camY, camZ);
            camera.position.lerp(desiredPos, 0.1);
            camera.lookAt(player.pos.x, player.pos.y + 0.8, player.pos.z);
        }
    }

    getPosition() {
        return this.state.player.pos;
    }

    getForward() {
        if (!this.modelPivot) return new THREE.Vector3(0, 0, 1);
        const fwd = new THREE.Vector3(0, 0, 1);
        fwd.applyQuaternion(this.modelPivot.quaternion);
        return fwd;
    }

    remove() {
        if (this.playerGroup) {
            this.world.remove(this.playerGroup);
            this.playerGroup = null;
        }
    }
}

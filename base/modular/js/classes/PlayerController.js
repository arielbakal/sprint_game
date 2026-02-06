// =====================================================
// PLAYER CONTROLLER - THIRD PERSON CHARACTER
// =====================================================

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
        const state = this.state;
        const player = state.player;
        this.time += dt;

        // --- Camera-relative movement direction ---
        const camera = this.world.camera;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        const camRight = new THREE.Vector3();
        camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();

        // Corrected movement logic relative to camera
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (state.inputs.w) moveDir.add(camDir);
        if (state.inputs.s) moveDir.sub(camDir);
        if (state.inputs.a) moveDir.sub(camRight); // A moves Left (subtract Right)
        if (state.inputs.d) moveDir.add(camRight); // D moves Right (add Right)
        const isMoving = moveDir.lengthSq() > 0;

        if (isMoving) {
            moveDir.normalize();
            player.vel.x = moveDir.x * player.speed;
            player.vel.z = moveDir.z * player.speed;
            player.targetRotation = Math.atan2(moveDir.x, moveDir.z);
        } else {
            player.vel.x *= 0.8;
            player.vel.z *= 0.8;
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
            this.modelPivot.quaternion.slerp(targetQ, 0.15);
        }

        // --- Procedural animation ---
        if (isMoving && player.onGround) {
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
        if (player.cameraMode === 'first') {
            // Allow full range for FPS
            ca.y = Math.max(-1.5, Math.min(1.5, ca.y));
        } else {
            // Restrict for TPS
            ca.y = Math.max(0.1, Math.min(1.4, ca.y));
        }

        if (player.cameraMode === 'first') {
            if (this.modelPivot) this.modelPivot.visible = false;
            // First person: Camera at eye level
            camera.position.set(player.pos.x, player.pos.y + 1.6, player.pos.z);
            // Look direction derived from angles (inverted relative to orbit)
            // ca.x is azimuth. In TPS, camera is at +sin(x), +cos(x).
            // To look "outward" in the same direction the camera WAS, we look towards -sin(x), -cos(x).
            // But usually we want W to move forward (towards look dir).
            // In TPS, W moves towards player orientation.
            // Let's enforce that camera looks "forward".

            // Note: ca.x logic in input handler subtracts e.movementX.
            // Map angles to look target
            const lookX = -Math.sin(ca.x);
            const lookZ = -Math.cos(ca.x);
            // Height mapping: ca.y=0 -> horizon.
            // In TPS code: camY = pos.y + dist * sin(ca.y). sin(0)=0 (horizon), sin(1.4)=0.98 (overhead).
            // So ca.y is elevation.
            // For FPS, let's just hold simple pitch.
            const lookY = Math.tan(ca.y - 0.3); // Minus offset to center horizon

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

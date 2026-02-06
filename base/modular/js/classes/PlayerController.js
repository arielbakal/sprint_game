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

        this.world.add(this.playerGroup);
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

        const moveDir = new THREE.Vector3(0, 0, 0);
        if (state.inputs.w) moveDir.add(camDir);
        if (state.inputs.s) moveDir.sub(camDir);
        if (state.inputs.a) moveDir.sub(camRight);
        if (state.inputs.d) moveDir.add(camRight);
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

        // Apply velocity
        player.pos.add(player.vel);

        // --- Multi-island ground collision ---
        let onAnyIsland = false;
        for (const island of islands) {
            const dx = player.pos.x - island.center.x;
            const dz = player.pos.z - island.center.z;
            const distSq = dx * dx + dz * dz;
            const r = island.radius;
            if (distSq < r * r) {
                const floorY = island.floorY;
                if (player.pos.y < floorY) {
                    player.pos.y = floorY;
                    player.vel.y = 0;
                    player.onGround = true;
                    onAnyIsland = true;
                }
                break;
            }
        }
        if (!onAnyIsland && player.pos.y < -15) {
            // Death plane — respawn on first island
            player.pos.set(islands[0].center.x, islands[0].floorY + 3, islands[0].center.z);
            player.vel.set(0, 0, 0);
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

        const dist = 5.0;
        const camX = player.pos.x + dist * Math.sin(ca.x) * Math.cos(ca.y);
        const camZ = player.pos.z + dist * Math.cos(ca.x) * Math.cos(ca.y);
        const camY = player.pos.y + dist * Math.sin(ca.y) + 0.8;

        const desiredPos = new THREE.Vector3(camX, camY, camZ);
        camera.position.lerp(desiredPos, 0.1);
        camera.lookAt(player.pos.x, player.pos.y + 0.8, player.pos.z);
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

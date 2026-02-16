// =====================================================
// REMOTE PLAYER MANAGER - Renders other players in 3D
// =====================================================

export default class RemotePlayerManager {
    constructor(world) {
        this.world = world;
        this.players = new Map(); // id → { group, pivot, limbs, targetPos, targetRot, label }
    }

    /**
     * Assign distinct colors per player slot
     */
    _playerColors(id) {
        const COLORS = [
            { body: 0xe74c3c, limb: 0xc0392b },  // red
            { body: 0x3498db, limb: 0x2980b9 },  // blue
            { body: 0x2ecc71, limb: 0x27ae60 },  // green
            { body: 0xf39c12, limb: 0xe67e22 },  // orange
            { body: 0x9b59b6, limb: 0x8e44ad },  // purple
            { body: 0x1abc9c, limb: 0x16a085 },  // teal
            { body: 0xe91e63, limb: 0xc2185b },  // pink
            { body: 0x00bcd4, limb: 0x0097a7 },  // cyan
        ];
        return COLORS[(id - 1) % COLORS.length];
    }

    /**
     * Build a blocky character matching the local player style
     */
    _buildModel(id) {
        const colors = this._playerColors(id);
        const matBody = new THREE.MeshToonMaterial({ color: colors.body });
        const matLimb = new THREE.MeshToonMaterial({ color: colors.limb });
        const matEye  = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const matPupil = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const group = new THREE.Group();
        const pivot = new THREE.Group();
        pivot.scale.setScalar(0.6);
        group.add(pivot);

        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), matBody);
        torso.position.y = 0.7;
        pivot.add(torso);

        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), matLimb);
        head.position.y = 1.2;
        pivot.add(head);

        // Eyes
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
        pivot.add(eyeL, eyeR);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        legGeo.translate(0, -0.2, 0);
        const legL = new THREE.Mesh(legGeo, matLimb);
        legL.position.set(0.15, 0.4, 0);
        const legR = new THREE.Mesh(legGeo.clone(), matLimb);
        legR.position.set(-0.15, 0.4, 0);
        pivot.add(legL, legR);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
        armGeo.translate(0, -0.2, 0);
        const armL = new THREE.Mesh(armGeo, matLimb);
        armL.position.set(0.35, 0.9, 0);
        const armR = new THREE.Mesh(armGeo.clone(), matLimb);
        armR.position.set(-0.35, 0.9, 0);
        pivot.add(armL, armR);

        // Nametag (sprite)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const c = canvas.getContext('2d');
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(0, 0, 256, 64);
        c.fillStyle = '#ffffff';
        c.font = 'bold 28px sans-serif';
        c.textAlign = 'center';
        c.fillText(`Player ${id}`, 128, 42);
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 1.8;
        sprite.scale.set(1.5, 0.4, 1);
        group.add(sprite);

        return { group, pivot, legL, legR, armL, armR };
    }

    /**
     * Add a new remote player to the scene
     */
    addPlayer(id, data) {
        if (this.players.has(id)) return;

        const model = this._buildModel(id);
        const pos = data.position || { x: 0, y: 0, z: 0 };
        model.group.position.set(pos.x, pos.y, pos.z);

        this.world.add(model.group);

        this.players.set(id, {
            ...model,
            targetPos: new THREE.Vector3(pos.x, pos.y, pos.z),
            currentPos: new THREE.Vector3(pos.x, pos.y, pos.z),
            targetRot: data.rotation || 0,
            currentRot: data.rotation || 0,
            time: 0,
            isOnBoat: false,
            activeAction: null
        });

        console.log(`[Remote] Player ${id} added`);
    }

    /**
     * Remove a remote player from the scene
     */
    removePlayer(id) {
        const p = this.players.get(id);
        if (!p) return;
        this.world.remove(p.group);
        this.players.delete(id);
        console.log(`[Remote] Player ${id} removed`);
    }

    /**
     * Update target position/rotation from network data
     */
    updatePlayer(id, data) {
        const p = this.players.get(id);
        if (!p) return;
        if (data.position) {
            p.targetPos.set(data.position.x, data.position.y, data.position.z);
        }
        if (data.rotation !== undefined) {
            p.targetRot = data.rotation;
        }
        p.isOnBoat = data.isOnBoat || false;
        p.activeAction = data.activeAction || null;
    }

    /**
     * Per-frame interpolation for smooth movement
     */
    update(dt) {
        for (const [id, p] of this.players) {
            p.time += dt;

            // Smooth position interpolation
            p.currentPos.lerp(p.targetPos, 0.15);
            p.group.position.copy(p.currentPos);

            // Smooth rotation
            const targetQ = new THREE.Quaternion();
            targetQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.targetRot);
            p.pivot.quaternion.slerp(targetQ, 0.15);

            // Walk animation when moving
            const dx = p.targetPos.x - p.currentPos.x;
            const dz = p.targetPos.z - p.currentPos.z;
            const isMoving = (dx * dx + dz * dz) > 0.0001;

            if (isMoving) {
                const walkCycle = p.time * 10;
                p.legL.rotation.x = Math.sin(walkCycle) * 0.8;
                p.legR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.8;
                p.armL.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
                p.armR.rotation.x = Math.sin(walkCycle) * 0.5;
            } else {
                // Action animations
                if (p.activeAction === 'chop' || p.activeAction === 'mine') {
                    const swing = p.time * 8;
                    p.armR.rotation.x = Math.sin(swing) * 1.2;
                } else {
                    const lerp = 0.1;
                    p.legL.rotation.x *= (1 - lerp);
                    p.legR.rotation.x *= (1 - lerp);
                    p.armL.rotation.x *= (1 - lerp);
                    p.armR.rotation.x *= (1 - lerp);
                }
            }
        }
    }

    /**
     * Remove all remote players
     */
    clear() {
        for (const [id] of this.players) {
            this.removePlayer(id);
        }
    }

    get count() {
        return this.players.size;
    }
}

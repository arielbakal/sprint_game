// =====================================================
// ENTITY FACTORY CLASS
// =====================================================

export default class EntityFactory {
    constructor(world, state) {
        this.world = world;
        this.state = state;
        this.O_Y = -1.4;
    }

    getMat(color, flat = true) { return this.world.getMat(color, flat); }

    generatePalette(sphereColor) {
        let hue;
        if (!sphereColor) hue = Math.random();
        else {
            let base = sphereColor === 'red' ? 0.95 : sphereColor === 'blue' ? 0.6 : 0.1;
            hue = (base + (Math.random() - 0.5) * 0.3) % 1;
            if (hue < 0) hue += 1;
        }
        const baseDark = new THREE.Color().setHSL(hue, 0.2, 0.15);
        const soil = new THREE.Color().setHSL((hue + 0.05) % 1, 0.3, 0.25);
        const floraHue = (hue + 0.2 + Math.random() * 0.4) % 1;
        const flora = new THREE.Color().setHSL(floraHue, 0.5 + Math.random() * 0.4, 0.3 + Math.random() * 0.3);
        const groundTop = flora.clone().multiplyScalar(0.75);
        const creatureHue = (floraHue + 0.5) % 1;
        const creature = new THREE.Color().setHSL(creatureHue, 0.8, 0.6);
        const accent = new THREE.Color().setHSL((creatureHue + 0.2) % 1, 0.9, 0.6);
        const background = new THREE.Color().setHSL((hue + 0.5) % 1, 0.3, 0.8);
        return { background, baseRock: baseDark, trunk: baseDark, soil, groundTop, flora, tallGrass: flora, creature, accent };
    }

    generateWorldDNA() {
        const eyeRoll = Math.random();
        const eyeCount = eyeRoll < 0.1 ? 1 : eyeRoll < 0.2 ? 3 : 2;
        return {
            tree: { shape: ['cone', 'box', 'round', 'cylinder'][Math.floor(Math.random() * 4)], heightMod: 1.2 + Math.random() * 1.0, thickMod: 0.6 + Math.random() },
            bush: { shape: ['sphere', 'cone'][Math.floor(Math.random() * 2)], scaleY: 0.7 + Math.random() * 0.5 },
            rock: { shape: ['ico', 'box', 'dodec', 'slab'][Math.floor(Math.random() * 4)], stretch: 0.8 + Math.random() * 0.8 },
            creature: { shape: ['box', 'sphere'][Math.floor(Math.random() * 2)], eyes: eyeCount, scale: 0.9 + Math.random() * 0.5, eyeScale: 1.0 + Math.random() * 0.6 },
            grass: { height: 0.3 + Math.random() * 0.5 }
        };
    }

    generateTerrain(r, s, min, max) {
        const geo = new THREE.CircleGeometry(r, s);
        const pos = geo.attributes.position;
        for (let i = 1; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * (max - min));
        pos.setZ(pos.count - 1, pos.getZ(1));
        geo.computeVertexNormals();
        return geo;
    }

    createBubbleTexture(char, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(32, 32, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, 32, 34);
        const tex = new THREE.CanvasTexture(canvas);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
        sprite.scale.set(0.6, 0.6, 1);
        sprite.position.y = 1.0;
        return sprite;
    }

    disposeHierarchy(obj) {
        if (!obj) return;
        obj.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) Array.isArray(child.material) ? child.material.forEach(m => m.dispose()) : child.material.dispose();
        });
    }

    createTree(p, x, z, style = null) {
        const g = new THREE.Group();
        const dna = style || {
            color: p.flora.clone(), trunkColor: p.trunk.clone(), shape: this.state.worldDNA.tree.shape,
            height: 1.5 * this.state.worldDNA.tree.heightMod + Math.random() * 0.5, thickness: 0.2 * this.state.worldDNA.tree.thickMod
        };
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(dna.thickness * 0.7, dna.thickness, dna.height, 5), this.getMat(dna.trunkColor));
        trunk.position.y = dna.height / 2;
        let leafGeo = dna.shape === 'cone' ? new THREE.ConeGeometry(1.0, 1.8, 5) :
            dna.shape === 'box' ? new THREE.BoxGeometry(1.2, 1.2, 1.2) :
                dna.shape === 'cylinder' ? new THREE.CylinderGeometry(0.8, 0.8, 1.0, 6) : new THREE.DodecahedronGeometry(0.9);
        const leaves = new THREE.Mesh(leafGeo, this.getMat(dna.color));
        leaves.position.y = dna.height;
        if (dna.shape === 'cone') leaves.position.y += 0.2;
        g.add(trunk, leaves);
        g.position.set(x, this.O_Y, z);
        g.rotation.y = Math.random() * Math.PI * 2;
        g.scale.set(0, 0, 0);
        g.userData = { type: 'tree', radius: 0.6, style: dna, color: dna.color, productionTimer: Math.random() * 20, health: 5, choppable: true };
        this.state.obstacles.push(g);
        return g;
    }

    createBush(p, x, z, style = null) {
        const g = new THREE.Group();
        const dna = style || { color: p.flora.clone(), shape: this.state.worldDNA.bush.shape, scaleY: this.state.worldDNA.bush.scaleY };
        let geo = dna.shape === 'flat' ? new THREE.BoxGeometry(0.8, 0.1, 0.8) :
            dna.shape === 'box' ? new THREE.BoxGeometry(0.6, 0.6, 0.6) :
                dna.shape === 'cone' ? new THREE.ConeGeometry(0.4, 0.7, 5) : new THREE.DodecahedronGeometry(0.4);
        const m = new THREE.Mesh(geo, this.getMat(dna.color));
        m.position.y = dna.shape === 'flat' ? 0.05 : 0.35 * dna.scaleY;
        if (dna.shape !== 'flat') m.scale.y = dna.scaleY;
        g.add(m);
        g.position.set(x, this.O_Y, z);
        g.rotation.y = Math.random() * Math.PI * 2;
        g.scale.set(0, 0, 0);
        g.userData = { type: 'bush', radius: 0.4, style: dna, color: dna.color, productionTimer: Math.random() * 20 };
        return g;
    }

    createRock(p, x, z, style = null) {
        const g = new THREE.Group();
        const dna = style || { color: p.baseRock.clone(), shape: this.state.worldDNA.rock.shape };
        let geo = dna.shape === 'ico' ? new THREE.IcosahedronGeometry(0.35, 0) :
            dna.shape === 'box' ? new THREE.BoxGeometry(0.6, 0.5, 0.6) :
                dna.shape === 'slab' ? new THREE.BoxGeometry(0.7, 0.25, 0.5) : new THREE.DodecahedronGeometry(0.35);
        const m = new THREE.Mesh(geo, this.getMat(dna.color));
        if (dna.shape === 'slab') m.rotation.y = Math.random() * Math.PI;
        else m.rotation.set(Math.random(), Math.random(), Math.random());
        g.add(m);
        g.position.set(x, this.O_Y, z);
        g.scale.set(0, 0, 0);
        g.userData = { type: 'rock', style: dna, color: dna.color };
        return g;
    }

    createGrass(p, x, z, style = null) {
        const g = new THREE.Group();
        const h = (style ? style.height : this.state.worldDNA.grass.height);
        const dna = style || { color: p.tallGrass.clone(), height: h };
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, dna.height, 0.07), this.getMat(dna.color));
        m.position.y = dna.height / 2;
        g.add(m);
        g.position.set(x, this.O_Y, z);
        g.scale.set(0, 0, 0);
        g.userData = { type: 'grass', style: dna, color: dna.color, growTimer: Math.random() * 30 };
        return g;
    }

    createFlower(p, x, z, style = null) {
        const g = new THREE.Group();
        const dna = style || { stemColor: p.flora.clone(), petalColor: p.background.clone().offsetHSL(0, 0, 0.1), centerColor: p.creature.clone(), height: 0.5 + Math.random() * 0.2 };
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, dna.height, 0.05), this.getMat(dna.stemColor));
        stem.position.y = dna.height / 2;
        const petals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), this.getMat(dna.petalColor));
        petals.position.y = dna.height;
        const center = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), this.getMat(dna.centerColor));
        center.position.y = dna.height + 0.1;
        g.add(stem, petals, center);
        g.position.set(x, this.O_Y, z);
        g.scale.set(0, 0, 0);
        g.userData = { type: 'flower', style: dna, color: dna.petalColor };
        return g;
    }

    createCloud(x, y, z) {
        const g = new THREE.Group();
        const cloudColor = new THREE.Color(0xffffff);
        const cloudMat = new THREE.MeshLambertMaterial({ color: cloudColor, transparent: true, opacity: 0.8 });

        const sizes = [
            { w: 8 + Math.random() * 6, h: 1 + Math.random() * 1, d: 4 + Math.random() * 3 },
            { w: 6 + Math.random() * 4, h: 0.8 + Math.random() * 0.8, d: 3 + Math.random() * 2 },
            { w: 5 + Math.random() * 3, h: 0.6 + Math.random() * 0.6, d: 2.5 + Math.random() * 2 }
        ];

        for (let i = 0; i < 3; i++) {
            const geo = new THREE.BoxGeometry(sizes[i].w, sizes[i].h, sizes[i].d);
            const mesh = new THREE.Mesh(geo, cloudMat);
            mesh.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 1.5
            );
            g.add(mesh);
        }

        g.position.set(x, y, z);
        g.userData = { type: 'cloud' };
        return g;
    }

    createCreature(p, x, z, style = null) {
        const g = new THREE.Group();
        const dna = style || {
            color: p.creature.clone(), bodyShape: this.state.worldDNA.creature.shape,
            eyeCount: this.state.worldDNA.creature.eyes, scale: this.state.worldDNA.creature.scale,
            eyeScale: this.state.worldDNA.creature.eyeScale
        };
        let body = dna.bodyShape === 'box' ? new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.42), this.getMat(dna.color)) :
            new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), this.getMat(dna.color));
        body.position.y = 0.15;
        g.add(body);
        const baseEyeR = 0.045 * dna.scale * (dna.eyeScale || 1.0);
        const eyeGeo = new THREE.SphereGeometry(baseEyeR, 4, 4);
        const pupGeo = new THREE.SphereGeometry(baseEyeR * 0.4, 4, 4);
        const eyeMat = this.getMat(0xffffff);
        const pupMat = this.getMat(0x000000);
        const addEye = (px, py, pz, ry) => {
            const e = new THREE.Group();
            const em = new THREE.Mesh(eyeGeo, eyeMat);
            const pm = new THREE.Mesh(pupGeo, pupMat);
            pm.position.z = baseEyeR * 0.7;
            e.add(em, pm);
            e.position.set(px, py, pz);
            e.rotation.y = ry;
            e.userData = { isEye: true };
            return e;
        };
        if (dna.bodyShape === 'box') {
            const sideX = 0.19, eyeY = 0.22, eyeZ = 0.15, rot = 0;
            if (dna.eyeCount === 1) g.add(addEye(0, eyeY, 0.22, rot));
            else if (dna.eyeCount === 2) { g.add(addEye(sideX, eyeY, eyeZ, rot)); g.add(addEye(-sideX, eyeY, eyeZ, rot)); }
            else { g.add(addEye(sideX, eyeY, eyeZ, rot)); g.add(addEye(-sideX, eyeY, eyeZ, rot)); g.add(addEye(0, eyeY + 0.08, 0.22, 0)); }
        } else {
            const isFrontEyes = Math.random() < 0.5;
            const eyeY = 0.22;
            if (isFrontEyes) {
                const eyeZ = 0.18;
                if (dna.eyeCount === 1) g.add(addEye(0, eyeY, eyeZ, 0));
                else if (dna.eyeCount === 2) { g.add(addEye(0.08, eyeY, eyeZ, 0.2)); g.add(addEye(-0.08, eyeY, eyeZ, -0.2)); }
                else { g.add(addEye(0, eyeY + 0.05, eyeZ, 0)); g.add(addEye(0.1, eyeY - 0.02, eyeZ - 0.02, 0.25)); g.add(addEye(-0.1, eyeY - 0.02, eyeZ - 0.02, -0.25)); }
            } else {
                const eyeX = 0.15, eyeZ = 0.12, rot = 0.3;
                if (dna.eyeCount === 1) g.add(addEye(0, eyeY, 0.35, 0));
                else if (dna.eyeCount === 2) { g.add(addEye(eyeX, eyeY, eyeZ, rot)); g.add(addEye(-eyeX, eyeY, eyeZ, -rot)); }
                else { g.add(addEye(eyeX, eyeY, eyeZ, rot)); g.add(addEye(-eyeX, eyeY, eyeZ, -rot)); g.add(addEye(0, eyeY + 0.1, 0.25, 0)); }
            }
        }
        g.position.set(x, this.O_Y + 0.3, z);
        g.scale.set(0, 0, 0);
        g.userData = {
            type: 'creature', radius: 0.5, hunger: 0, age: 0, eatenCount: 0,
            moveSpeed: 0.03, hopOffset: Math.random() * 100,
            color: dna.color, bubble: null, style: dna, targetScale: dna.scale, cooldown: 0
        };
        this.state.obstacles.push(g);
        return g;
    }

    createChief(p, x, z) {
        const g = new THREE.Group();
        const color = p.creature.clone().lerp(new THREE.Color(0xffd700), 0.5);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.9, 8), this.getMat(color));
        body.position.y = 0.45;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 6), this.getMat(new THREE.Color(0xffaa00)));
        crown.position.y = 1.1;
        const eyeGeo = new THREE.SphereGeometry(0.08, 4, 4);
        const eyeMat = this.getMat(0xffffff);
        const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(0.15, 0.7, 0.25);
        const e2 = new THREE.Mesh(eyeGeo, eyeMat); e2.position.set(-0.15, 0.7, 0.25);
        g.add(body, crown, e1, e2);
        g.position.set(x, this.O_Y + 0.3, z);
        g.userData = { type: 'chief', radius: 0.6, moveSpeed: 0.045, color: color, fleeTimer: 0 };
        this.state.obstacles.push(g);
        return g;
    }

    createEgg(pos, color, dna) {
        const g = new THREE.Group();
        const eggMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), this.getMat(color));
        eggMesh.scale.y = 1.3;
        g.add(eggMesh);
        g.position.set(pos.x, this.O_Y + 0.3, pos.z);
        g.scale.set(0, 0, 0);
        g.userData = { type: 'egg', color: color, parentDNA: dna, hatchTimer: 10.0 };
        return g;
    }

    createParticle(pos, col, size = 1) {
        const spriteMat = new THREE.SpriteMaterial({ color: col, transparent: true, opacity: 1 });
        const p = new THREE.Sprite(spriteMat);
        p.scale.set(0.075 * size, 0.075 * size, 1);
        p.position.copy(pos);
        p.position.x += (Math.random() - 0.5) * 0.4;
        p.position.y += (Math.random() - 0.5) * 0.4;
        p.position.z += (Math.random() - 0.5) * 0.4;
        p.userData = {
            vel: new THREE.Vector3((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).normalize().multiplyScalar(0.05 * size),
            life: 1.0, maxLife: 1.0
        };
        this.world.add(p);
        this.state.particles.push(p);
    }

    createLog(palette, x, z) {
        const g = new THREE.Group();
        const log = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6),
            this.getMat(palette.trunk)
        );
        log.rotation.z = Math.PI / 2;
        log.position.y = 0.12;
        g.add(log);
        g.position.set(x, this.O_Y, z);
        g.scale.set(0, 0, 0);
        g.userData = { type: 'log', color: palette.trunk, autoPickup: true };
        return g;
    }

    createChopParticles(pos, color, count = 6) {
        for (let i = 0; i < count; i++) {
            this.createParticle(pos.clone(), color, 0.6);
        }
    }

    createAxe(palette, x, z) {
        const g = new THREE.Group();

        const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, flatShading: true });
        const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x78909c, flatShading: true });
        const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, flatShading: true });

        const handleGeo = new THREE.CylinderGeometry(0.0125, 0.015, 0.5, 6);
        const handle = new THREE.Mesh(handleGeo, woodMaterial);
        g.add(handle);

        const headBaseGeo = new THREE.BoxGeometry(0.05, 0.075, 0.1);
        const headBase = new THREE.Mesh(headBaseGeo, metalMaterial);
        headBase.position.y = 0.2;
        headBase.castShadow = true;
        g.add(headBase);

        const bladeGeo = new THREE.BoxGeometry(0.0075, 0.15, 0.125);
        const blade = new THREE.Mesh(bladeGeo, metalMaterial);
        blade.position.set(0, 0.2, 0.0875);
        blade.rotation.x = Math.PI / 8;
        blade.castShadow = true;
        g.add(blade);

        const edgeGeo = new THREE.BoxGeometry(0.0025, 0.1625, 0.0125);
        const edge = new THREE.Mesh(edgeGeo, edgeMaterial);
        edge.position.set(0, 0.2, 0.15);
        edge.rotation.x = Math.PI / 8;
        g.add(edge);

        g.position.set(x, this.O_Y + 0.1, z);
        g.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        g.rotation.y = Math.random() * Math.PI * 2;
        g.scale.set(0, 0, 0);
        g.userData = { type: 'axe', color: null };

        return g;
    }

    // Create island at a specific world position with given radius
    createIslandAt(palette, centerX, centerZ, radius, hasWater = false) {
        const g = new THREE.Group();
        const segments = Math.max(20, Math.floor(radius * 4));
        const baseR = radius;
        const soilR = radius * 0.93;
        const grassR = radius * 0.9;

        const base = new THREE.Mesh(this.generateTerrain(baseR, segments, -0.3, 0.3), this.getMat(palette.baseRock));
        base.rotation.x = -Math.PI / 2; base.position.y = -2;
        const soil = new THREE.Mesh(this.generateTerrain(soilR, segments, -0.2, 0.2), this.getMat(palette.soil));
        soil.rotation.x = -Math.PI / 2; soil.position.y = -1.5;
        const grass = new THREE.Mesh(this.generateTerrain(grassR, segments, -0.1, 0.1), this.getMat(palette.groundTop));
        grass.rotation.x = -Math.PI / 2; grass.position.y = this.O_Y;
        grass.userData = { type: 'ground' };
        g.add(base, soil, grass);

        if (hasWater) {
            const waterGeo = new THREE.CircleGeometry(200, 50);
            const wp = waterGeo.attributes.position;
            for (let i = 1; i < wp.count; i++) wp.setZ(i, wp.getZ(i) + (Math.random() - 0.5) * 0.8);
            waterGeo.computeVertexNormals();
            const waterColor = palette.background.clone().lerp(new THREE.Color(0x0066aa), 0.7);
            const water = new THREE.Mesh(waterGeo, new THREE.MeshPhongMaterial({ color: waterColor, transparent: true, opacity: 0.6, shininess: 90, flatShading: true }));
            water.rotation.x = -Math.PI / 2;
            water.position.y = -2.0;
            water.userData = { type: 'water' };
            g.add(water);
        }

        g.position.set(centerX, 0, centerZ);
        return { group: g, groundPlane: grass, center: new THREE.Vector3(centerX, 0, centerZ), radius: grassR };
    }

    // Legacy wrapper
    createIsland(palette) {
        return this.createIslandAt(palette, 0, 0, 7, true);
    }

    createLog(color, x, z) {
        const g = new THREE.Group();
        const logColor = color instanceof THREE.Color ? color : new THREE.Color(0x8B4513);
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.35, 3, 8);
        const trunk = new THREE.Mesh(trunkGeo, this.getMat(logColor));
        trunk.rotation.z = Math.PI / 2;
        trunk.position.y = -1.7;
        g.add(trunk);
        g.position.set(x, 0, z);
        g.rotation.y = Math.random() * Math.PI * 2;
        g.userData = { type: 'log', color: logColor, autoPickup: true };
        return g;
    }

    createBoat(x, z, color) {
        const g = new THREE.Group();
        const darkWood = color.clone().multiplyScalar(0.6);
        const lightWood = color.clone().lerp(new THREE.Color(0xddccaa), 0.3);

        // Hull bottom (tapered keel shape, length along Z)
        const hullGeo = new THREE.BoxGeometry(1.6, 0.5, 3.8);
        const hull = new THREE.Mesh(hullGeo, this.getMat(darkWood));
        hull.position.y = -2.0;
        hull.scale.set(1, 0.7, 1);
        g.add(hull);

        // Hull upper / gunwales (wider at top)
        const upperHullGeo = new THREE.BoxGeometry(1.9, 0.35, 3.6);
        const upperHull = new THREE.Mesh(upperHullGeo, this.getMat(color));
        upperHull.position.y = -1.6;
        g.add(upperHull);

        // Deck planks
        const deckGeo = new THREE.BoxGeometry(1.5, 0.08, 3.0);
        const deck = new THREE.Mesh(deckGeo, this.getMat(lightWood));
        deck.position.y = -1.42;
        g.add(deck);

        // Deck plank lines (cross beams for detail)
        for (let i = -1; i <= 1; i++) {
            const beam = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.1, 0.06),
                this.getMat(darkWood)
            );
            beam.position.set(0, -1.38, i * 0.8);
            g.add(beam);
        }

        // Bow (front = -Z direction, pointed)
        const bowGeo = new THREE.ConeGeometry(0.65, 1.4, 4);
        const bow = new THREE.Mesh(bowGeo, this.getMat(color));
        bow.rotation.x = -Math.PI / 2; // point along -Z
        bow.position.set(0, -1.75, -2.4);
        g.add(bow);

        // Stern (back = +Z, flat transom)
        const sternGeo = new THREE.BoxGeometry(1.6, 0.7, 0.15);
        const stern = new THREE.Mesh(sternGeo, this.getMat(darkWood));
        stern.position.set(0, -1.75, 1.9);
        g.add(stern);

        // Keel (bottom ridge)
        const keelGeo = new THREE.BoxGeometry(0.12, 0.2, 3.2);
        const keel = new THREE.Mesh(keelGeo, this.getMat(darkWood));
        keel.position.y = -2.35;
        g.add(keel);

        // Mast
        const mastGeo = new THREE.CylinderGeometry(0.05, 0.07, 2.8, 6);
        const mast = new THREE.Mesh(mastGeo, this.getMat(darkWood));
        mast.position.set(0, -0.05, -0.4);
        g.add(mast);

        // Boom (horizontal spar)
        const boomGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 4);
        const boom = new THREE.Mesh(boomGeo, this.getMat(darkWood));
        boom.rotation.z = Math.PI / 2;
        boom.position.set(0.4, -0.6, -0.4);
        g.add(boom);

        // Sail (triangular-ish, offset to one side for character)
        const sailShape = new THREE.Shape();
        sailShape.moveTo(0, 0);
        sailShape.lineTo(0, 2.0);
        sailShape.lineTo(1.3, 0);
        sailShape.closePath();
        const sailGeo = new THREE.ShapeGeometry(sailShape);
        const sailColor = new THREE.Color(0xfff5e6);
        const sail = new THREE.Mesh(sailGeo, new THREE.MeshToonMaterial({ color: sailColor, side: THREE.DoubleSide, flatShading: true }));
        sail.position.set(0.01, -0.85, -0.4);
        sail.rotation.y = Math.PI / 2;
        g.add(sail);

        // Rudder (at stern, below waterline)
        const rudderGeo = new THREE.BoxGeometry(0.06, 0.6, 0.35);
        const rudder = new THREE.Mesh(rudderGeo, this.getMat(darkWood));
        rudder.position.set(0, -2.3, 2.0);
        g.add(rudder);

        // Side rail posts (gunwale details)
        const postPositions = [-1.0, 0, 1.0];
        postPositions.forEach(pz => {
            [-0.85, 0.85].forEach(px => {
                const post = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4),
                    this.getMat(darkWood)
                );
                post.position.set(px, -1.25, pz);
                g.add(post);
            });
        });

        g.position.set(x, 0, z);
        g.userData = { type: 'boat', color: color, radius: 2.5 };
        return g;
    }

    createCat(x, z) {
        const g = new THREE.Group();
        const orange = new THREE.Color(0xE8963E);
        const white = new THREE.Color(0xFAF0E6);
        const darkOrange = orange.clone().multiplyScalar(0.7);
        const pink = new THREE.Color(0xFFB6C1);
        const eyeGreen = new THREE.Color(0x6BA54A);

        // Body (elongated box, white belly implied by front being white)
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.35, 0.7),
            this.getMat(orange)
        );
        body.position.y = 0.35;
        g.add(body);

        // White belly patch
        const belly = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.12, 0.55),
            this.getMat(white)
        );
        belly.position.set(0, 0.14, 0);
        body.add(belly);

        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.32, 0.32),
            this.getMat(orange)
        );
        head.position.set(0, 0.48, -0.42);
        g.add(head);

        // White face/muzzle area
        const muzzle = new THREE.Mesh(
            new THREE.BoxGeometry(0.26, 0.16, 0.1),
            this.getMat(white)
        );
        muzzle.position.set(0, -0.06, -0.14);
        head.add(muzzle);

        // Nose (pink)
        const nose = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.04, 0.04),
            this.getMat(pink)
        );
        nose.position.set(0, -0.01, -0.18);
        head.add(nose);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
        const pupGeo = new THREE.SphereGeometry(0.02, 4, 4);
        const eyeMat = this.getMat(eyeGreen);
        const pupMat = this.getMat(0x111111);

        [-1, 1].forEach(side => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(side * 0.1, 0.04, -0.16);
            head.add(eye);
            const pupil = new THREE.Mesh(pupGeo, pupMat);
            pupil.position.set(side * 0.1, 0.04, -0.19);
            head.add(pupil);
        });

        // Ears (triangular cones, orange)
        [-1, 1].forEach(side => {
            const ear = new THREE.Mesh(
                new THREE.ConeGeometry(0.07, 0.16, 4),
                this.getMat(orange)
            );
            ear.position.set(side * 0.12, 0.2, -0.02);
            ear.rotation.z = side * 0.2;
            head.add(ear);
            // Inner ear (pink)
            const innerEar = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.1, 4),
                this.getMat(pink)
            );
            innerEar.position.set(0, 0.01, -0.01);
            ear.add(innerEar);
        });

        // Legs (4 white paws)
        const legGeo = new THREE.BoxGeometry(0.1, 0.2, 0.1);
        const legMat = this.getMat(white);
        const legPositions = [
            { x: -0.14, z: -0.22 },  // front-left
            { x: 0.14, z: -0.22 },   // front-right
            { x: -0.14, z: 0.22 },   // back-left
            { x: 0.14, z: 0.22 }     // back-right
        ];
        const legs = [];
        legPositions.forEach(lp => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lp.x, 0.1, lp.z);
            g.add(leg);
            legs.push(leg);
        });

        // Tail (curved, orange with white tip)
        const tailBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.04, 0.4, 4),
            this.getMat(orange)
        );
        tailBase.position.set(0, 0.45, 0.4);
        tailBase.rotation.x = 0.6;
        g.add(tailBase);

        const tailTip = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.03, 0.2, 4),
            this.getMat(white)
        );
        tailTip.position.set(0, 0.22, 0.02);
        tailTip.rotation.x = -0.4;
        tailBase.add(tailTip);

        // White chest patch (front of body)
        const chest = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.25, 0.08),
            this.getMat(white)
        );
        chest.position.set(0, 0.02, -0.32);
        body.add(chest);

        g.position.set(x, this.O_Y, z);
        g.userData = {
            type: 'cat',
            radius: 0.4,
            legs: legs,
            tail: tailBase,
            moveSpeed: 0.06,
            hopOffset: Math.random() * 100,
            followDist: 1.8,
            idleTimer: 0,
            isIdle: false
        };
        return g;
    }

    createHintIsland(palette, offsetX, scale = 0.4) {
        const g = new THREE.Group();
        g.position.x = offsetX;
        g.position.z = 25;

        const base = new THREE.Mesh(this.generateTerrain(2.8 * scale, 24, -0.25, 0.25), this.getMat(palette.baseRock));
        base.rotation.x = -Math.PI / 2; base.position.y = -2;
        const soil = new THREE.Mesh(this.generateTerrain(2.5 * scale, 24, -0.2, 0.2), this.getMat(palette.soil));
        soil.rotation.x = -Math.PI / 2; soil.position.y = -1.5;
        const grass = new THREE.Mesh(this.generateTerrain(2.3 * scale, 24, -0.15, 0.15), this.getMat(palette.groundTop));
        grass.rotation.x = -Math.PI / 2; grass.position.y = this.O_Y * scale;

        const sideGeo = new THREE.CylinderGeometry(1.8 * scale, 2.2 * scale, 3.5, 24, 2, true);
        const sidePos = sideGeo.attributes.position;
        for (let i = 0; i < sidePos.count; i++) {
            const x = sidePos.getX(i);
            const y = sidePos.getY(i);
            const z = sidePos.getZ(i);
            const angle = Math.atan2(z, x);
            const wave = Math.sin(angle * 8 + y * 2) * 0.15 * scale;
            sidePos.setX(i, x + wave);
            sidePos.setZ(i, z + wave);
            const py = (y + 1.75) / 3.5;
            sidePos.setY(i, y + (Math.random() - 0.5) * 0.2 * (1 - py));
        }
        sideGeo.computeVertexNormals();
        const sideMat = this.getMat(palette.baseRock);
        sideMat.side = THREE.DoubleSide;
        const side = new THREE.Mesh(sideGeo, sideMat);
        side.position.y = -0.75;

        g.add(base, soil, grass, side);
        g.userData = { type: 'hintIsland' };
        return g;
    }
}

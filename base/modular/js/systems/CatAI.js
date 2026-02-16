// =====================================================
// CAT AI - Follow player, island clamping, boat queue
// =====================================================

export default class CatAI {
    update(dt, context) {
        const { state, factory, t, playerCat: cat } = context;
        if (!cat) return;

        const catData = cat.userData;
        const playerPos = state.player.pos;
        const O_Y = factory.O_Y;
        const dx = playerPos.x - cat.position.x;
        const dz = playerPos.z - cat.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Find which island the cat is on
        let catIsland = null;
        for (const island of state.islands) {
            const ix = cat.position.x - island.center.x;
            const iz = cat.position.z - island.center.z;
            if (ix * ix + iz * iz < (island.radius * 0.95) ** 2) {
                catIsland = island;
                break;
            }
        }
        if (!catIsland) catIsland = state.islands[0];

        // Check if player is on the same island
        const px = playerPos.x - catIsland.center.x;
        const pz = playerPos.z - catIsland.center.z;
        const playerOnCatIsland = px * px + pz * pz < catIsland.radius * catIsland.radius;

        // On boat / boarding → handled by BoatSystem
        if (state.catOnBoat || state.catBoarding) {
            return;
        }

        // Running to boat during boarding delay
        if (state.catBoardingQueued) {
            const boat = state.boardingTargetBoat || state.activeBoat;
            if (boat) {
                const bx = boat.position.x - cat.position.x;
                const bz = boat.position.z - cat.position.z;
                const bDist = Math.sqrt(bx * bx + bz * bz);
                if (bDist > 1.5) {
                    const speed = catData.moveSpeed * 2.0;
                    cat.position.x += (bx / bDist) * speed;
                    cat.position.z += (bz / bDist) * speed;
                    cat.rotation.y = Math.atan2(bx / bDist, bz / bDist) + Math.PI;
                    this.animateLegs(catData, t, 10, 0.06);
                }
            }
            return;
        }

        // Player on boat or different island → idle look
        if (state.isOnBoat || !playerOnCatIsland) {
            catData.isIdle = true;
            if (dist > 0.3) {
                const targetRot = Math.atan2(dx, dz) + Math.PI;
                cat.rotation.y += (targetRot - cat.rotation.y) * 0.05;
            }
            this.resetLegs(catData);
        } else if (dist > catData.followDist) {
            // Follow player
            catData.isIdle = false;
            const speed = dist > 5 ? catData.moveSpeed * 2.5 : catData.moveSpeed;
            const nx = dx / dist;
            const nz = dz / dist;
            cat.position.x += nx * speed;
            cat.position.z += nz * speed;
            cat.rotation.y = Math.atan2(nx, nz) + Math.PI;
            this.animateLegs(catData, t, 8, 0.05);
        } else {
            // Idle near player
            catData.isIdle = true;
            if (dist > 0.3) {
                const targetRot = Math.atan2(dx, dz) + Math.PI;
                cat.rotation.y += (targetRot - cat.rotation.y) * 0.05;
            }
            this.resetLegs(catData);
        }

        // Tail sway
        if (catData.tail) {
            catData.tail.rotation.z = Math.sin(t * 2.5) * 0.3;
            catData.tail.rotation.x = 0.6 + Math.sin(t * 1.5) * 0.15;
        }

        // Body bob
        cat.position.y = O_Y + Math.sin(t * 3 + catData.hopOffset) * 0.015;

        // Clamp to island
        const rx = cat.position.x - catIsland.center.x;
        const rz = cat.position.z - catIsland.center.z;
        const maxR = catIsland.radius * 0.8;
        if (rx * rx + rz * rz > maxR * maxR) {
            const a = Math.atan2(rz, rx);
            cat.position.x = catIsland.center.x + Math.cos(a) * maxR;
            cat.position.z = catIsland.center.z + Math.sin(a) * maxR;
        }
    }

    animateLegs(catData, t, freq, amp) {
        if (!catData.legs) return;
        const c = t * freq;
        catData.legs[0].position.y = 0.1 + Math.sin(c) * amp;
        catData.legs[1].position.y = 0.1 + Math.sin(c + Math.PI) * amp;
        catData.legs[2].position.y = 0.1 + Math.sin(c + Math.PI) * amp;
        catData.legs[3].position.y = 0.1 + Math.sin(c) * amp;
    }

    resetLegs(catData) {
        if (!catData.legs) return;
        catData.legs.forEach(leg => {
            leg.position.y += (0.1 - leg.position.y) * 0.1;
        });
    }
}

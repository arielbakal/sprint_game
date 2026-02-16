// =====================================================
// PARTICLE SYSTEM - Particles & debris physics
// =====================================================

export default class ParticleSystem {
    update(dt, context) {
        const { state, world, factory } = context;

        // Particles
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.position.add(p.userData.vel);
            p.userData.vel.y -= 0.002;
            p.userData.life -= 0.03;
            p.material.opacity = p.userData.life;
            if (p.userData.life <= 0) {
                world.remove(p);
                state.particles.splice(i, 1);
            }
        }

        // Debris
        for (let i = state.debris.length - 1; i >= 0; i--) {
            const d = state.debris[i];
            if (d.userData.vel) {
                d.position.add(d.userData.vel);
                d.userData.vel.y -= 0.01;
                if (d.userData.rotVel) {
                    d.rotation.x += d.userData.rotVel.x;
                    d.rotation.y += d.userData.rotVel.y;
                    d.rotation.z += d.userData.rotVel.z;
                }
                d.scale.multiplyScalar(0.98);
                if (d.position.y < -20 || d.scale.x < 0.01) {
                    world.remove(d);
                    factory.disposeHierarchy(d);
                    state.debris.splice(i, 1);
                }
            }
        }
    }
}

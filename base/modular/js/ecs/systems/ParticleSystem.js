export class ParticleSystem {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.particleMeshes = new Map();
  }

  update(deltaTime) {
    const entities = this.world.query(['Particle', 'Transform']);

    for (const entityId of entities) {
      const particle = this.world.getComponent(entityId, 'Particle');
      const transform = this.world.getComponent(entityId, 'Transform');

      particle.remainingTime -= deltaTime;

      if (particle.remainingTime <= 0) {
        this.destroyParticle(entityId);
        continue;
      }

      this.updateParticlePosition(entityId, transform, particle, deltaTime);
      this.updateParticleVisuals(entityId, particle);
    }
  }

  createParticle(position, color, size = 1) {
    const entity = this.world.createEntity();
    
    this.world.addComponent(entity, 'Transform', {
      entityId: entity,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: size, y: size, z: size }
    });
    
    this.world.addComponent(entity, 'Particle', {
      entityId: entity,
      velocity: { 
        x: (Math.random() - 0.5) * 2, 
        y: Math.random() * 3 + 1, 
        z: (Math.random() - 0.5) * 2 
      },
      color: color,
      size: size,
      lifetime: 1.0,
      remainingTime: 1.0
    });
    
    return entity;
  }

  createBurst(position, color, count = 8) {
    for (let i = 0; i < count; i++) {
      this.createParticle(position, color, 0.5);
    }
  }

  updateParticlePosition(entityId, transform, particle, deltaTime) {
    transform.position.x += particle.velocity.x * deltaTime;
    transform.position.y += particle.velocity.y * deltaTime;
    transform.position.z += particle.velocity.z * deltaTime;
    
    particle.velocity.y -= 5 * deltaTime;
  }

  updateParticleVisuals(entityId, particle) {
    const mesh = this.particleMeshes.get(entityId);
    if (mesh) {
      const lifeRatio = particle.remainingTime / particle.lifetime;
      mesh.scale.setScalar(particle.size * lifeRatio);
    }
  }

  destroyParticle(entityId) {
    const mesh = this.particleMeshes.get(entityId);
    if (mesh && this.scene) {
      this.scene.remove(mesh);
    }
    this.particleMeshes.delete(entityId);
    this.world.destroyEntity(entityId);
  }
}

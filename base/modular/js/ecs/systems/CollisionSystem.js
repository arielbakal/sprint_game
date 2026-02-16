export class CollisionSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['Transform', 'Collider']);
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        this.checkCollision(entities[i], entities[j]);
      }
    }
  }

  checkCollision(entityA, entityB) {
    const transformA = this.world.getComponent(entityA, 'Transform');
    const transformB = this.world.getComponent(entityB, 'Transform');
    const colliderA = this.world.getComponent(entityA, 'Collider');
    const colliderB = this.world.getComponent(entityB, 'Collider');

    if (colliderA.type === 'sphere' && colliderB.type === 'sphere') {
      return this.sphereSphereCollision(transformA, colliderA, transformB, colliderB);
    }
    
    return false;
  }

  sphereSphereCollision(posA, colA, posB, colB) {
    const dx = posA.position.x - posB.position.x;
    const dy = posA.position.y - posB.position.y;
    const dz = posA.position.z - posB.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    return distance < (colA.radius + colB.radius);
  }
}

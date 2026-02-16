export class PhysicsSystem {
  constructor(world) {
    this.world = world;
    this.gravity = -0.015;
    this.islands = [
      { centerX: 0, centerZ: 0, radius: 15, floorY: 0 }
    ];
  }

  addIsland(centerX, centerZ, radius, floorY = 0) {
    this.islands.push({ centerX, centerZ, radius, floorY });
  }

  update(deltaTime) {
    const entities = this.world.query(['Transform', 'Rigidbody', 'PlayerInput']);

    for (const entityId of entities) {
      const transform = this.world.getComponent(entityId, 'Transform');
      const rigidbody = this.world.getComponent(entityId, 'Rigidbody');

      if (rigidbody.isKinematic) continue;

      if (rigidbody.useGravity) {
        rigidbody.velocity.y += this.gravity;
      }

      transform.position.y += rigidbody.velocity.y;
      
      let onGround = false;
      for (const island of this.islands) {
        const dx = transform.position.x - island.centerX;
        const dz = transform.position.z - island.centerZ;
        const distSq = dx * dx + dz * dz;
        
        if (distSq < island.radius * island.radius) {
          const groundY = island.floorY + 0.5;
          if (transform.position.y <= groundY) {
            transform.position.y = groundY;
            rigidbody.velocity.y = 0;
            onGround = true;
          }
        }
      }

      const input = this.world.getComponent(entityId, 'PlayerInput');
      if (input && onGround && input.jump) {
        rigidbody.velocity.y = 0.3;
      }
    }
  }
}

export class MovementSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['Transform', 'Rigidbody', 'PlayerInput']);
    
    for (const entityId of entities) {
      const transform = this.world.getComponent(entityId, 'Transform');
      const rigidbody = this.world.getComponent(entityId, 'Rigidbody');
      const input = this.world.getComponent(entityId, 'PlayerInput');
      
      if (rigidbody.isKinematic) continue;
      
      let moveX = 0;
      let moveZ = 0;
      
      if (input.moveForward) moveZ += 1;
      if (input.moveBackward) moveZ -= 1;
      if (input.moveLeft) moveX -= 1;
      if (input.moveRight) moveX += 1;
      
      if (moveX !== 0 || moveZ !== 0) {
        const speed = rigidbody.speed || 5;
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX = (moveX / length) * speed * deltaTime;
        moveZ = (moveZ / length) * speed * deltaTime;
        
        transform.position.x += moveX;
        transform.position.z += moveZ;
        
        transform.rotation.y = Math.atan2(moveX, moveZ);
      }
      
      transform.position.y += rigidbody.velocity.y * deltaTime;
    }
  }
}

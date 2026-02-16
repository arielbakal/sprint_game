export class PickupSystem {
  constructor(world) {
    this.world = world;
    this.pickupRange = 1.5;
  }

  update(deltaTime) {
    const players = this.world.query(['Transform', 'PlayerInput']);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const playerTransform = this.world.getComponent(playerId, 'Transform');
    
    const resources = this.world.query(['Resource', 'Transform']);
    
    for (const resourceId of resources) {
      const resourceTransform = this.world.getComponent(resourceId, 'Transform');
      const resource = this.world.getComponent(resourceId, 'Resource');
      
      const dx = resourceTransform.position.x - playerTransform.position.x;
      const dz = resourceTransform.position.z - playerTransform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < this.pickupRange && resource.autoPickup) {
        this.pickupResource(resourceId, resource);
      }
    }
  }

  pickupResource(entityId, resource) {
    const renderable = this.world.getComponent(entityId, 'Renderable');
    
    if (renderable && renderable.mesh) {
      renderable.mesh.parent.remove(renderable.mesh);
    }
    
    this.world.destroyEntity(entityId);
    
    console.log(`Picked up ${resource.type}`);
  }
}

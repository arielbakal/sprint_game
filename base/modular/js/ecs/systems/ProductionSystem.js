export class ProductionSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const now = performance.now() / 1000;
    const entities = this.world.query(['Production', 'Transform']);

    for (const entityId of entities) {
      const production = this.world.getComponent(entityId, 'Production');

      if (!production.isActive) continue;

      if (now - production.lastProduction >= production.interval) {
        this.produce(entityId, production);
        production.lastProduction = now;
      }
    }
  }

  produce(entityId, production) {
    const transform = this.world.getComponent(entityId, 'Transform');
    if (!transform) return;
    
    const foodEntity = this.world.createEntity();
    
    const x = transform.position.x + (Math.random() - 0.5) * 0.5;
    const z = transform.position.z + (Math.random() - 0.5) * 0.5;
    
    this.world.addComponent(foodEntity, 'Transform', {
      entityId: foodEntity,
      position: { x, y: transform.position.y + 0.3, z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });
    
    this.world.addComponent(foodEntity, 'Resource', {
      entityId: foodEntity,
      type: production.produces,
      autoPickup: true
    });
    
    console.log(`Entity ${entityId} produced food at (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }

  toggleProduction(entityId) {
    const production = this.world.getComponent(entityId, 'Production');

    if (!production) return false;

    production.isActive = !production.isActive;
    return production.isActive;
  }
}

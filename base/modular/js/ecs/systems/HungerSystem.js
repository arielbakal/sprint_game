export class HungerSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['Hunger']);
    
    for (const entityId of entities) {
      const hunger = this.world.getComponent(entityId, 'Hunger');
      
      hunger.current -= hunger.rate * deltaTime;
      
      if (hunger.current <= 0) {
        hunger.current = 0;
        this.starve(entityId);
      }
    }
  }

  feed(entityId, amount = 10) {
    const hunger = this.world.getComponent(entityId, 'Hunger');
    
    if (!hunger) return false;
    
    hunger.current = Math.min(hunger.current + amount, hunger.max);
    hunger.lastFed = performance.now() / 1000;
    
    return true;
  }

  starve(entityId) {
    console.log(`Entity ${entityId} died of hunger`);
    const renderable = this.world.getComponent(entityId, 'Renderable');
    if (renderable && renderable.mesh) {
      renderable.mesh.parent.remove(renderable.mesh);
    }
    this.world.destroyEntity(entityId);
  }
}

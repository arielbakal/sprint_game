export class HatchingSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['Hatchable', 'Transform']);
    
    for (const entityId of entities) {
      const hatchable = this.world.getComponent(entityId, 'Hatchable');
      
      if (hatchable.isHatching) {
        hatchable.remainingTime -= deltaTime;
        
        if (hatchable.remainingTime <= 0) {
          this.hatch(entityId, hatchable);
        }
      }
    }
  }

  startHatching(entityId) {
    const hatchable = this.world.getComponent(entityId, 'Hatchable');
    
    if (!hatchable) return false;
    
    hatchable.isHatching = true;
    return true;
  }

  hatch(entityId, hatchable) {
    const transform = this.world.getComponent(entityId, 'Transform');
    const renderable = this.world.getComponent(entityId, 'Renderable');
    
    if (renderable && renderable.mesh) {
      renderable.mesh.parent.remove(renderable.mesh);
    }
    
    this.world.destroyEntity(entityId);
    
    this.spawnCreature(hatchable.parentDNA, transform.position);
  }

  spawnCreature(dna, position) {
    const entity = this.world.createEntity();
    
    const color = dna && dna.color ? dna.color : { r: 0.8, g: 0.4, b: 0.2 };
    
    this.world.addComponent(entity, 'Transform', {
      entityId: entity,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    });
    
    this.world.addComponent(entity, 'AIAgent', {
      entityId: entity,
      type: 'creature',
      state: 'idle',
      moveSpeed: 2,
      boundCenter: { x: position.x, z: position.z },
      boundRadius: 10
    });
    
    this.world.addComponent(entity, 'Hunger', {
      entityId: entity,
      current: 15,
      max: 30,
      rate: 0.5,
      lastFed: 0
    });
    
    this.world.addComponent(entity, 'Rigidbody', {
      entityId: entity,
      velocity: { x: 0, y: 0, z: 0 },
      useGravity: false,
      isKinematic: false
    });
    
    console.log(`New creature spawned at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
  }
}

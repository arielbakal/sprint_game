export class ChopSystem {
  constructor(world) {
    this.world = world;
    this.raycaster = new THREE.Raycaster();
    this.lastAttackTime = 0;
    this.attackCooldown = 0.4;
  }

  update(deltaTime) {
    const now = performance.now() / 1000;
    
    const choppables = this.world.query(['Choppable', 'Transform']);
    
    for (const entityId of choppables) {
      const choppable = this.world.getComponent(entityId, 'Choppable');
      
      if (choppable.currentHits >= choppable.maxHits) {
        this.destroyTree(entityId, choppable);
      }
    }
    
    this.processPlayerAttack(deltaTime);
  }

  processPlayerAttack(deltaTime) {
    const now = performance.now() / 1000;
    const players = this.world.query(['PlayerInput', 'Transform']);
    
    for (const playerId of players) {
      const input = this.world.getComponent(playerId, 'PlayerInput');
      const playerTransform = this.world.getComponent(playerId, 'Transform');
      
      if (input.attack && now - this.lastAttackTime >= this.attackCooldown) {
        this.lastAttackTime = now;
        
        const choppables = this.world.query(['Choppable', 'Transform', 'Renderable']);
        
        let closestChoppable = null;
        let closestDist = 3.5;
        
        for (const entityId of choppables) {
          const chopTransform = this.world.getComponent(entityId, 'Transform');
          const dx = chopTransform.position.x - playerTransform.position.x;
          const dz = chopTransform.position.z - playerTransform.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < closestDist) {
            closestDist = dist;
            closestChoppable = entityId;
          }
        }
        
        if (closestChoppable) {
          const choppable = this.world.getComponent(closestChoppable, 'Choppable');
          choppable.currentHits++;
          
          const renderable = this.world.getComponent(closestChoppable, 'Renderable');
          if (renderable && renderable.mesh) {
            renderable.mesh.position.x += (Math.random() - 0.5) * 0.15;
            setTimeout(() => {
              if (renderable.mesh) renderable.mesh.position.x -= (Math.random() - 0.5) * 0.15;
            }, 100);
          }
        }
      }
    }
  }

  hitTree(entityId, tool) {
    const now = performance.now() / 1000;
    const choppable = this.world.getComponent(entityId, 'Choppable');
    
    if (!choppable) return false;
    
    if (now - choppable.lastHitTime < choppable.hitCooldown) {
      return false;
    }
    
    choppable.currentHits += tool ? tool.damage : 1;
    choppable.lastHitTime = now;
    
    return true;
  }

  destroyTree(entityId, choppable) {
    const transform = this.world.getComponent(entityId, 'Transform');
    const renderable = this.world.getComponent(entityId, 'Renderable');
    
    if (renderable && renderable.mesh) {
      renderable.mesh.parent.remove(renderable.mesh);
    }
    
    this.world.destroyEntity(entityId);
    
    console.log(`Tree destroyed! Dropping ${choppable.dropCount} ${choppable.resourceType}`);
  }
}

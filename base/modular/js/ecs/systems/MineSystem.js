export class MineSystem {
  constructor(world) {
    this.world = world;
    this.lastAttackTime = 0;
    this.attackCooldown = 0.4;
  }

  update(deltaTime) {
    const minables = this.world.query(['Minable', 'Transform']);
    
    for (const entityId of minables) {
      const minable = this.world.getComponent(entityId, 'Minable');
      
      if (minable.currentHits >= minable.maxHits) {
        this.destroyRock(entityId, minable);
      }
    }
    
    this.processPlayerMineAttack(deltaTime);
  }

  processPlayerMineAttack(deltaTime) {
    const now = performance.now() / 1000;
    const players = this.world.query(['PlayerInput', 'Transform']);
    
    for (const playerId of players) {
      const input = this.world.getComponent(playerId, 'PlayerInput');
      const playerTransform = this.world.getComponent(playerId, 'Transform');
      
      if (input.attack && now - this.lastAttackTime >= this.attackCooldown) {
        this.lastAttackTime = now;
        
        const minables = this.world.query(['Minable', 'Transform', 'Renderable']);
        
        let closestRock = null;
        let closestDist = 3.5;
        
        for (const entityId of minables) {
          const rockTransform = this.world.getComponent(entityId, 'Transform');
          const dx = rockTransform.position.x - playerTransform.position.x;
          const dz = rockTransform.position.z - playerTransform.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          
          if (dist < closestDist) {
            closestDist = dist;
            closestRock = entityId;
          }
        }
        
        if (closestRock) {
          const minable = this.world.getComponent(closestRock, 'Minable');
          minable.currentHits++;
          
          const renderable = this.world.getComponent(closestRock, 'Renderable');
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

  hitRock(entityId, tool) {
    const minable = this.world.getComponent(entityId, 'Minable');
    
    if (!minable) return false;
    
    if (tool && tool.type !== minable.toolRequired) {
      return false;
    }
    
    minable.currentHits += tool ? tool.damage : 1;
    
    return true;
  }

  destroyRock(entityId, minable) {
    const renderable = this.world.getComponent(entityId, 'Renderable');
    
    if (renderable && renderable.mesh) {
      renderable.mesh.parent.remove(renderable.mesh);
    }
    
    this.world.destroyEntity(entityId);
    
    console.log(`Rock destroyed! Dropping ${minable.dropCount} ${minable.resourceType}`);
  }
}

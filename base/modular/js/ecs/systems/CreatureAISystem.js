export class CreatureAISystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['AIAgent', 'Transform', 'Rigidbody']);
    
    for (const entityId of entities) {
      const agent = this.world.getComponent(entityId, 'AIAgent');
      const transform = this.world.getComponent(entityId, 'Transform');
      const rigidbody = this.world.getComponent(entityId, 'Rigidbody');
      
      const hunger = this.world.getComponent(entityId, 'Hunger');
      if (hunger && hunger.current <= hunger.max * 0.3 && agent.state !== 'chasing_food') {
        agent.state = 'chasing_food';
        this.findFood(entityId, agent);
      }
      
      switch (agent.state) {
        case 'idle':
          this.updateIdle(entityId, agent, transform, rigidbody, deltaTime);
          break;
        case 'wandering':
          this.updateWandering(entityId, agent, transform, rigidbody, deltaTime);
          break;
        case 'chasing_food':
          this.updateChasingFood(entityId, agent, transform, rigidbody, deltaTime);
          break;
      }
    }
  }

  findFood(entityId, agent) {
    const foodEntities = this.world.query(['Production', 'Transform']);
    let closestFood = null;
    let closestDist = Infinity;
    
    const creatureTransform = this.world.getComponent(entityId, 'Transform');
    
    for (const foodId of foodEntities) {
      const foodTransform = this.world.getComponent(foodId, 'Transform');
      const production = this.world.getComponent(foodId, 'Production');
      
      if (production.produces && production.produces === 'food') {
        const dx = foodTransform.position.x - creatureTransform.position.x;
        const dz = foodTransform.position.z - creatureTransform.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < closestDist) {
          closestDist = dist;
          closestFood = foodId;
        }
      }
    }
    
    agent.targetEntity = closestFood;
  }

  updateIdle(entityId, agent, transform, rigidbody, deltaTime) {
    if (Math.random() < 0.01) {
      agent.state = 'wandering';
    }
  }

  updateWandering(entityId, agent, transform, rigidbody, deltaTime) {
    const dx = agent.boundCenter.x - transform.position.x;
    const dz = agent.boundCenter.z - transform.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > agent.boundRadius) {
      rigidbody.velocity.x = -dx / distance * agent.moveSpeed;
      rigidbody.velocity.z = -dz / distance * agent.moveSpeed;
    } else {
      rigidbody.velocity.x = (Math.random() - 0.5) * agent.moveSpeed;
      rigidbody.velocity.z = (Math.random() - 0.5) * agent.moveSpeed;
    }
    
    if (Math.random() < 0.02) {
      agent.state = 'idle';
      rigidbody.velocity.x = 0;
      rigidbody.velocity.z = 0;
    }
  }

  updateChasingFood(entityId, agent, transform, rigidbody, deltaTime) {
    if (!agent.targetEntity) {
      agent.state = 'idle';
      return;
    }
    
    const targetTransform = this.world.getComponent(agent.targetEntity, 'Transform');
    if (!targetTransform) {
      agent.state = 'idle';
      agent.targetEntity = null;
      return;
    }
    
    const dx = targetTransform.position.x - transform.position.x;
    const dz = targetTransform.position.z - transform.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0) {
      rigidbody.velocity.x = (dx / distance) * agent.moveSpeed * 1.5;
      rigidbody.velocity.z = (dz / distance) * agent.moveSpeed * 1.5;
    }
    
    if (distance < 0.5) {
      const hunger = this.world.getComponent(entityId, 'Hunger');
      if (hunger) {
        hunger.current = Math.min(hunger.current + 10, hunger.max);
      }
      this.world.destroyEntity(agent.targetEntity);
      agent.targetEntity = null;
      agent.state = 'idle';
    }
  }
}

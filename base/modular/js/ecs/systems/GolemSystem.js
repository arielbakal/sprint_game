export class GolemSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const golems = this.world.query(['AIAgent', 'Transform', 'Rigidbody']);
    
    for (const golemId of golems) {
      const agent = this.world.getComponent(golemId, 'AIAgent');
      const transform = this.world.getComponent(golemId, 'Transform');
      const rigidbody = this.world.getComponent(golemId, 'Rigidbody');
      
      if (agent.type !== 'golem') continue;
      
      const players = this.world.query(['Transform']);
      if (players.length === 0) continue;
      
      const playerTransform = this.world.getComponent(players[0], 'Transform');
      
      const dx = playerTransform.position.x - transform.position.x;
      const dz = playerTransform.position.z - transform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < 15) {
        agent.state = 'chasing';
        
        if (dist > 1.5) {
          rigidbody.velocity.x = (dx / dist) * agent.moveSpeed;
          rigidbody.velocity.z = (dz / dist) * agent.moveSpeed;
        } else {
          rigidbody.velocity.x = 0;
          rigidbody.velocity.z = 0;
          this.attackPlayer(players[0]);
        }
      } else if (agent.state === 'chasing') {
        agent.state = 'idle';
        rigidbody.velocity.x = 0;
        rigidbody.velocity.z = 0;
      }
    }
  }

  attackPlayer(playerId) {
    console.log('Golem attacks player!');
  }
}

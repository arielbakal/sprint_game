export class BoatSystem {
  constructor(world) {
    this.world = world;
    this.nearestBoat = null;
    this.proximityRange = 6;
    this.isOnBoat = false;
  }

  update(deltaTime) {
    const boats = this.world.query(['Boat', 'Transform', 'Rigidbody']);

    for (const boatId of boats) {
      const boat = this.world.getComponent(boatId, 'Boat');
      const transform = this.world.getComponent(boatId, 'Transform');
      const rigidbody = this.world.getComponent(boatId, 'Rigidbody');

      if (!boat.hasDriver || boat.isAnchored) {
        rigidbody.velocity.x *= 0.9;
        rigidbody.velocity.z *= 0.9;
      } else {
        if (boat.driverEntity) {
          const driverInput = this.world.getComponent(boat.driverEntity, 'PlayerInput');
          if (driverInput) {
            this.processBoatInput(boat, transform, rigidbody, driverInput, deltaTime);
          }
        }
      }
      
      // Ocean bobbing
      const t = performance.now() * 0.001;
      transform.position.y = Math.sin(t * 1.2) * 0.12 + Math.sin(t * 0.7) * 0.06 - 0.5;
    }
    
    this.updateProximityCheck();
    this.handleBoarding();
  }

  updateProximityCheck() {
    if (this.isOnBoat) return;
    
    const players = this.world.query(['Transform', 'PlayerInput']);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const playerTransform = this.world.getComponent(playerId, 'Transform');
    const input = this.world.getComponent(playerId, 'PlayerInput');
    
    let closestBoat = null;
    let closestDist = Infinity;
    let closestBoatId = null;
    
    const boats = this.world.query(['Boat', 'Transform']);
    
    for (const boatId of boats) {
      const boatTransform = this.world.getComponent(boatId, 'Transform');
      const dx = boatTransform.position.x - playerTransform.position.x;
      const dz = boatTransform.position.z - playerTransform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < this.proximityRange && dist < closestDist) {
        closestDist = dist;
        closestBoat = boatTransform;
        closestBoatId = boatId;
      }
    }
    
    this.nearestBoat = closestBoatId;
    
    // Handle boarding
    if (this.nearestBoat && input && input.interact) {
      this.boardBoat(playerId, this.nearestBoat);
    }
  }

  handleBoarding() {
    const players = this.world.query(['PlayerInput']);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const input = this.world.getComponent(playerId, 'PlayerInput');
    
    if (this.isOnBoat && input && input.interact) {
      this.disembarkBoat(playerId);
    }
  }

  boardBoat(playerId, boatId) {
    const boat = this.world.getComponent(boatId, 'Boat');
    const boatTransform = this.world.getComponent(boatId, 'Transform');
    const playerTransform = this.world.getComponent(playerId, 'Transform');
    const playerRigidbody = this.world.getComponent(playerId, 'Rigidbody');
    
    boat.hasDriver = true;
    boat.driverEntity = playerId;
    
    // Move player to boat
    playerTransform.position.x = boatTransform.position.x;
    playerTransform.position.y = boatTransform.position.y - 0.3;
    playerTransform.position.z = boatTransform.position.z;
    
    playerRigidbody.velocity.x = 0;
    playerRigidbody.velocity.z = 0;
    
    this.isOnBoat = true;
    console.log('Boarded boat!');
    
    // Hide boat prompt, show nav hint
    const boatPrompt = document.getElementById('boat-prompt');
    const boatNavHint = document.getElementById('boat-nav-hint');
    if (boatPrompt) boatPrompt.style.display = 'none';
    if (boatNavHint) boatNavHint.style.display = 'block';
  }

  disembarkBoat(playerId) {
    const boats = this.world.query(['Boat']);
    
    for (const boatId of boats) {
      const boat = this.world.getComponent(boatId, 'Boat');
      if (boat.driverEntity === playerId) {
        boat.hasDriver = false;
        boat.driverEntity = null;
        break;
      }
    }
    
    const playerTransform = this.world.getComponent(playerId, 'Transform');
    
    // Place player near boat on island
    playerTransform.position.x += 3;
    playerTransform.position.z += 3;
    
    this.isOnBoat = false;
    console.log('Disembarked!');
    
    const boatNavHint = document.getElementById('boat-nav-hint');
    if (boatNavHint) boatNavHint.style.display = 'none';
  }

  processBoatInput(boat, transform, rigidbody, input, deltaTime) {
    const speedFactor = Math.min(Math.abs(rigidbody.velocity.x + rigidbody.velocity.z) / boat.speed, 1);
    const turnRate = 0.02 * (0.3 + speedFactor * 0.7);
    
    if (input.moveLeft) {
      transform.rotation.y += turnRate;
    }
    if (input.moveRight) {
      transform.rotation.y -= turnRate;
    }

    if (input.moveForward) {
      rigidbody.velocity.x += Math.sin(transform.rotation.y) * boat.speed * deltaTime;
      rigidbody.velocity.z += Math.cos(transform.rotation.y) * boat.speed * deltaTime;
    }
    
    if (input.moveBackward) {
      rigidbody.velocity.x -= Math.sin(transform.rotation.y) * boat.speed * 0.5 * deltaTime;
      rigidbody.velocity.z -= Math.cos(transform.rotation.y) * boat.speed * 0.5 * deltaTime;
    }
    
    // Island collision
    const physicsSystem = this.world.systemManager.systems.find(s => s.constructor.name === 'PhysicsSystem');
    if (physicsSystem) {
      for (const island of physicsSystem.islands) {
        const dx = transform.position.x - island.centerX;
        const dz = transform.position.z - island.centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = island.radius + 3;
        
        if (dist < minDist) {
          const angle = Math.atan2(dz, dx);
          transform.position.x = island.centerX + Math.cos(angle) * minDist;
          transform.position.z = island.centerZ + Math.sin(angle) * minDist;
          rigidbody.velocity.x *= -0.15;
          rigidbody.velocity.z *= -0.15;
          break;
        }
      }
    }
  }

  anchorBoat(boatId) {
    const boat = this.world.getComponent(boatId, 'Boat');
    if (boat) {
      boat.isAnchored = !boat.isAnchored;
      return boat.isAnchored;
    }
    return false;
  }
}

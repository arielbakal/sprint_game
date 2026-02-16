export class UISystem {
  constructor(world) {
    this.world = world;
    this.uiElements = {};
    this.initUIElements();
  }

  initUIElements() {
    this.uiElements.logCount = document.getElementById('log-count');
    this.uiElements.chopIndicator = document.getElementById('chop-indicator');
    this.uiElements.chopFill = document.getElementById('chop-fill');
    this.uiElements.boatPrompt = document.getElementById('boat-prompt');
    this.uiElements.boatNavHint = document.getElementById('boat-nav-hint');
    this.uiElements.islandIndicator = document.getElementById('island-indicator');
    this.uiElements.dialogBox = document.getElementById('dialog-box');
    this.uiElements.dialogText = document.getElementById('dialog-text');
  }

  update(deltaTime) {
    this.updateResourceHUD();
    this.updateBoatUI();
  }

  updateResourceHUD() {
    const resources = this.world.query(['Resource']);
    let logCount = 0;
    
    for (const entityId of resources) {
      const resource = this.world.getComponent(entityId, 'Resource');
      if (resource && resource.type === 'log') {
        logCount++;
      }
    }
    
    if (this.uiElements.logCount) {
      this.uiElements.logCount.textContent = logCount;
    }
  }

  updateBoatUI() {
    const players = this.world.query(['Transform', 'PlayerInput']);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const input = this.world.getComponent(playerId, 'PlayerInput');
    
    if (this.uiElements.boatPrompt) {
      const boats = this.world.query(['Boat']);
      let nearBoat = false;
      
      const playerTransform = this.world.getComponent(playerId, 'Transform');
      
      for (const boatId of boats) {
        const boatTransform = this.world.getComponent(boatId, 'Transform');
        const dx = boatTransform.position.x - playerTransform.position.x;
        const dz = boatTransform.position.z - playerTransform.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 6) {
          nearBoat = true;
          break;
        }
      }
      
      this.uiElements.boatPrompt.style.display = nearBoat ? 'block' : 'none';
    }
  }

  showChopProgress(progress, maxProgress) {
    if (this.uiElements.chopIndicator) {
      this.uiElements.chopIndicator.style.display = 'block';
      if (this.uiElements.chopFill) {
        this.uiElements.chopFill.style.width = ((progress / maxProgress) * 100) + '%';
      }
    }
  }

  hideChopProgress() {
    if (this.uiElements.chopIndicator) {
      this.uiElements.chopIndicator.style.display = 'none';
    }
  }

  showDialog(text) {
    if (this.uiElements.dialogBox && this.uiElements.dialogText) {
      this.uiElements.dialogText.textContent = text;
      this.uiElements.dialogBox.style.display = 'block';
    }
  }

  hideDialog() {
    if (this.uiElements.dialogBox) {
      this.uiElements.dialogBox.style.display = 'none';
    }
  }

  showIslandIndicator(text) {
    if (this.uiElements.islandIndicator) {
      this.uiElements.islandIndicator.textContent = text;
      this.uiElements.islandIndicator.style.display = 'block';
      setTimeout(() => {
        if (this.uiElements.islandIndicator) {
          this.uiElements.islandIndicator.style.display = 'none';
        }
      }, 2000);
    }
  }
}

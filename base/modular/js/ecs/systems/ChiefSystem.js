export class ChiefSystem {
  constructor(world) {
    this.world = world;
    this.dialogActive = false;
    this.hasGivenAxe = false;
  }

  update(deltaTime) {
    const players = this.world.query(['Transform', 'PlayerInput']);
    if (players.length === 0) return;
    
    const playerId = players[0];
    const playerTransform = this.world.getComponent(playerId, 'Transform');
    const input = this.world.getComponent(playerId, 'PlayerInput');
    
    const chiefs = this.world.query(['Interactable', 'Transform']);
    
    for (const chiefId of chiefs) {
      const interactable = this.world.getComponent(chiefId, 'Interactable');
      const chiefTransform = this.world.getComponent(chiefId, 'Transform');
      
      if (interactable.type !== 'chief') continue;
      
      const dx = chiefTransform.position.x - playerTransform.position.x;
      const dz = chiefTransform.position.z - playerTransform.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < 4 && input.interact && !this.dialogActive) {
        this.startDialog(chiefId);
      }
    }
  }

  startDialog(chiefId) {
    this.dialogActive = true;
    
    const dialogBox = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');
    
    if (dialogBox && dialogText) {
      if (!this.hasGivenAxe) {
        dialogText.textContent = "Welcome, traveler! Take this axe to chop trees.";
        this.hasGivenAxe = true;
        
        const players = this.world.query(['Inventory']);
        if (players.length > 0) {
          const inventory = this.world.getComponent(players[0], 'Inventory');
          inventory.slots[0] = { type: 'axe', color: { r: 0.36, g: 0.25, b: 0.2 }, count: 1 };
        }
      } else {
        dialogText.textContent = "Build a boat to explore other islands!";
      }
      
      dialogBox.style.display = 'block';
      
      setTimeout(() => {
        dialogBox.style.display = 'none';
        this.dialogActive = false;
      }, 3000);
    }
  }
}

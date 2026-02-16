export class InventorySystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const players = this.world.query(['Inventory', 'PlayerInput']);
    
    for (const playerId of players) {
      const input = this.world.getComponent(playerId, 'PlayerInput');
      const inventory = this.world.getComponent(playerId, 'Inventory');
      
      if (input.selectSlot !== undefined) {
        const slotNum = parseInt(input.selectSlot);
        if (!isNaN(slotNum) && slotNum >= 0 && slotNum < inventory.slots.length) {
          inventory.selectedSlot = slotNum;
        }
      }
    }
  }

  addItem(entityId, item) {
    const inventory = this.world.getComponent(entityId, 'Inventory');

    if (!inventory) return false;

    const isStackable = !['creature', 'egg'].includes(item.type);
    
    if (isStackable) {
      for (let i = 0; i < inventory.slots.length; i++) {
        if (inventory.slots[i] && 
            inventory.slots[i].type === item.type && 
            inventory.slots[i].color.getHex() === item.color.getHex()) {
          inventory.slots[i].count = (inventory.slots[i].count || 1) + 1;
          return true;
        }
      }
    }

    for (let i = 0; i < inventory.slots.length; i++) {
      if (inventory.slots[i] === null) {
        inventory.slots[i] = item;
        return true;
      }
    }

    return false;
  }

  removeItem(entityId, slotIndex) {
    const inventory = this.world.getComponent(entityId, 'Inventory');

    if (!inventory || slotIndex < 0 || slotIndex >= inventory.slots.length) {
      return null;
    }

    const item = inventory.slots[slotIndex];
    inventory.slots[slotIndex] = null;
    return item;
  }

  selectSlot(entityId, slotIndex) {
    const inventory = this.world.getComponent(entityId, 'Inventory');

    if (!inventory || slotIndex < 0 || slotIndex >= inventory.slots.length) {
      return false;
    }

    inventory.selectedSlot = slotIndex;
    return true;
  }

  getSelectedItem(entityId) {
    const inventory = this.world.getComponent(entityId, 'Inventory');

    if (!inventory || inventory.selectedSlot === null) {
      return null;
    }

    return inventory.slots[inventory.selectedSlot];
  }

  hasTool(toolType) {
    const players = this.world.query(['Inventory']);
    if (players.length === 0) return false;
    
    const inventory = this.world.getComponent(players[0], 'Inventory');
    
    for (const slot of inventory.slots) {
      if (slot && slot.type === toolType) {
        return true;
      }
    }
    return false;
  }
}

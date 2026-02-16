export const Inventory = 'Inventory';

export function createInventory(data = {}) {
  const maxSlots = data.maxSlots || 8;
  return {
    entityId: data.entityId,
    slots: data.slots || new Array(maxSlots).fill(null),
    maxSlots: maxSlots,
    selectedSlot: data.selectedSlot !== undefined ? data.selectedSlot : 0
  };
}

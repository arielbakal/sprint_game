export const Interactable = 'Interactable';

export function createInteractable(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'item',
    range: data.range || 2,
    action: data.action || 'pickup',
    cooldown: data.cooldown || 0,
    lastInteraction: data.lastInteraction || 0,
    isActive: data.isActive !== undefined ? data.isActive : true
  };
}

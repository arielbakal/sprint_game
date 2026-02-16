export const Choppable = 'Choppable';

export function createChoppable(data = {}) {
  return {
    entityId: data.entityId,
    maxHits: data.maxHits || 5,
    currentHits: data.currentHits || 0,
    hitCooldown: data.hitCooldown || 0.4,
    lastHitTime: data.lastHitTime || 0,
    resourceType: data.resourceType || 'log',
    dropCount: data.dropCount || 2
  };
}

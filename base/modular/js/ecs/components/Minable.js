export const Minable = 'Minable';

export function createMinable(data = {}) {
  return {
    entityId: data.entityId,
    maxHits: data.maxHits || 5,
    currentHits: data.currentHits || 0,
    resourceType: data.resourceType || 'rock',
    toolRequired: data.toolRequired || 'pickaxe',
    dropCount: data.dropCount || 1
  };
}

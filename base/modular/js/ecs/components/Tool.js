export const Tool = 'Tool';

export function createTool(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'axe',
    damage: data.damage || 1,
    durability: data.durability || 100,
    maxDurability: data.maxDurability || 100
  };
}

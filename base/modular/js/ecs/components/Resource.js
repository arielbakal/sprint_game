export const Resource = 'Resource';

export function createResource(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'log',
    amount: data.amount || 1,
    canBePickedUp: data.canBePickedUp !== undefined ? data.canBePickedUp : true,
    stackSize: data.stackSize || 10
  };
}

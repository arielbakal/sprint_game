export const Production = 'Production';

export function createProduction(data = {}) {
  return {
    entityId: data.entityId,
    produces: data.produces || 'food',
    interval: data.interval || 25,
    lastProduction: data.lastProduction || 0,
    amountPerCycle: data.amountPerCycle || 1,
    isActive: data.isActive !== undefined ? data.isActive : true
  };
}

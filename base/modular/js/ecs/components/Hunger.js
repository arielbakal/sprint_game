export const Hunger = 'Hunger';

export function createHunger(data = {}) {
  return {
    entityId: data.entityId,
    current: data.current || 0,
    max: data.max || 30,
    rate: data.rate || 0.1,
    lastFed: data.lastFed || 0
  };
}

export const Hatchable = 'Hatchable';

export function createHatchable(data = {}) {
  return {
    entityId: data.entityId,
    hatchTime: data.hatchTime || 10,
    remainingTime: data.remainingTime !== undefined ? data.remainingTime : (data.hatchTime || 10),
    parentDNA: data.parentDNA || null,
    isHatching: data.isHatching || false
  };
}

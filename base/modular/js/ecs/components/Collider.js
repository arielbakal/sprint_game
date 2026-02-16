export const Collider = 'Collider';

export function createCollider(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'sphere',
    radius: data.radius || 0.5,
    size: data.size || { x: 1, y: 1, z: 1 },
    offset: data.offset || { x: 0, y: 0, z: 0 },
    isTrigger: data.isTrigger || false
  };
}

export const Transform = 'Transform';

export function createTransform(data = {}) {
  return {
    entityId: data.entityId,
    position: data.position || { x: 0, y: 0, z: 0 },
    rotation: data.rotation || { x: 0, y: 0, z: 0 },
    scale: data.scale || { x: 1, y: 1, z: 1 }
  };
}

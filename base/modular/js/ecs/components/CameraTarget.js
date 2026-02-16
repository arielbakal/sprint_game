export const CameraTarget = 'CameraTarget';

export function createCameraTarget(data = {}) {
  return {
    entityId: data.entityId,
    offset: data.offset || { x: 0, y: 5, z: 10 },
    mode: data.mode || 'third',
    angle: data.angle || { x: 0.3, y: 0 },
    distance: data.distance || 10,
    smoothSpeed: data.smoothSpeed || 5
  };
}

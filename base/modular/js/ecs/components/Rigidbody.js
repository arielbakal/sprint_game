export const Rigidbody = 'Rigidbody';

export function createRigidbody(data = {}) {
  return {
    entityId: data.entityId,
    velocity: data.velocity || { x: 0, y: 0, z: 0 },
    acceleration: data.acceleration || { x: 0, y: 0, z: 0 },
    mass: data.mass !== undefined ? data.mass : 1,
    useGravity: data.useGravity !== undefined ? data.useGravity : true,
    isKinematic: data.isKinematic || false,
    friction: data.friction !== undefined ? data.friction : 0.5,
    drag: data.drag || 0,
    speed: data.speed || 5
  };
}

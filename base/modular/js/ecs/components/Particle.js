export const Particle = 'Particle';

export function createParticle(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'smoke',
    lifetime: data.lifetime || 1,
    remainingTime: data.remainingTime !== undefined ? data.remainingTime : (data.lifetime || 1),
    size: data.size || 1,
    color: data.color || { r: 1, g: 1, b: 1 },
    velocity: data.velocity || { x: 0, y: 0, z: 0 }
  };
}

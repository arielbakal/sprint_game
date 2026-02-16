export const Animated = 'Animated';

export function createAnimated(data = {}) {
  return {
    entityId: data.entityId,
    currentAnimation: data.currentAnimation || 'idle',
    isPlaying: data.isPlaying !== undefined ? data.isPlaying : true,
    speed: data.speed || 1,
    loop: data.loop !== undefined ? data.loop : true
  };
}

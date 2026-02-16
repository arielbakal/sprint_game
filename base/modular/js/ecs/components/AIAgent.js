export const AIAgent = 'AIAgent';

export function createAIAgent(data = {}) {
  return {
    entityId: data.entityId,
    type: data.type || 'creature',
    state: data.state || 'idle',
    moveSpeed: data.moveSpeed || 2,
    boundCenter: data.boundCenter || { x: 0, y: 0, z: 0 },
    boundRadius: data.boundRadius || 10,
    targetEntity: data.targetEntity || null,
    detectionRange: data.detectionRange || 5
  };
}

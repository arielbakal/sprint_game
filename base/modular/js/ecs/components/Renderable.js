export const Renderable = 'Renderable';

export function createRenderable(data = {}) {
  return {
    entityId: data.entityId,
    mesh: data.mesh || null,
    castShadows: data.castShadows !== undefined ? data.castShadows : true,
    receiveShadows: data.receiveShadows !== undefined ? data.receiveShadows : true,
    visible: data.visible !== undefined ? data.visible : true,
    layer: data.layer || 0
  };
}

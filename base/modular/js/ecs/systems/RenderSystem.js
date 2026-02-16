export class RenderSystem {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
  }

  update(deltaTime) {
    const entities = this.world.query(['Transform', 'Renderable']);
    
    for (const entityId of entities) {
      const transform = this.world.getComponent(entityId, 'Transform');
      const renderable = this.world.getComponent(entityId, 'Renderable');
      
      if (renderable.mesh) {
        renderable.mesh.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z
        );
        renderable.mesh.rotation.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z
        );
        renderable.mesh.scale.set(
          transform.scale.x,
          transform.scale.y,
          transform.scale.z
        );
        renderable.mesh.visible = renderable.visible;
      }
    }
  }
}

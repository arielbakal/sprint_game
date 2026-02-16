export class AnimationSystem {
  constructor(world) {
    this.world = world;
  }

  update(deltaTime) {
    const entities = this.world.query(['Animated', 'Renderable']);

    for (const entityId of entities) {
      const animated = this.world.getComponent(entityId, 'Animated');
      const renderable = this.world.getComponent(entityId, 'Renderable');

      if (!animated.isPlaying || !renderable.mesh) continue;

      this.updateAnimation(animated, renderable.mesh, deltaTime);
    }
  }

  updateAnimation(animated, mesh, deltaTime) {
    if (!mesh.animations || mesh.animations.length === 0) return;

    const currentAnim = mesh.animations.find(anim => anim.name === animated.currentAnimation);
    
    if (currentAnim) {
      currentAnim.time += deltaTime * animated.speed;
      
      if (animated.loop && currentAnim.time >= currentAnim.duration) {
        currentAnim.time = 0;
      }
    }
  }

  playAnimation(entityId, animationName) {
    const animated = this.world.getComponent(entityId, 'Animated');
    
    if (!animated) return false;
    
    animated.currentAnimation = animationName;
    animated.isPlaying = true;
    
    return true;
  }

  stopAnimation(entityId) {
    const animated = this.world.getComponent(entityId, 'Animated');
    
    if (animated) {
      animated.isPlaying = false;
    }
  }
}

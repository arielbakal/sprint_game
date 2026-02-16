export class CameraSystem {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.setupMouseControl();
  }

  setupMouseControl() {
    let lastX = 0;
    let lastY = 0;
    
    window.addEventListener('mousemove', (e) => {
      if (e.buttons === 2) {
        this.mouseDeltaX = e.clientX - lastX;
        this.mouseDeltaY = e.clientY - lastY;
      }
      lastX = e.clientX;
      lastY = e.clientY;
    });
    
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(deltaTime) {
    const entities = this.world.query(['CameraTarget', 'Transform']);
    
    for (const entityId of entities) {
      const target = this.world.getComponent(entityId, 'CameraTarget');
      const transform = this.world.getComponent(entityId, 'Transform');
      
      if (this.mouseDeltaX !== 0 || this.mouseDeltaY !== 0) {
        target.angle.y += this.mouseDeltaX * 0.005;
        target.angle.x = Math.max(-0.5, Math.min(1.5, target.angle.x + this.mouseDeltaY * 0.005));
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
      }
      
      this.updateCamera(target, transform, deltaTime);
    }
  }

  updateCamera(target, transform, deltaTime) {
    const targetPos = transform.position;
    
    if (target.mode === 'third') {
      const offset = target.offset;
      const angle = target.angle;
      
      const distance = target.distance;
      const cameraX = targetPos.x + Math.sin(angle.y) * distance * Math.cos(angle.x);
      const cameraY = targetPos.y + offset.y + Math.sin(angle.x) * distance;
      const cameraZ = targetPos.z + Math.cos(angle.y) * distance * Math.cos(angle.x);
      
      const lerpFactor = (target.smoothSpeed || 5) * deltaTime;
      this.camera.position.x += (cameraX - this.camera.position.x) * lerpFactor;
      this.camera.position.y += (cameraY - this.camera.position.y) * lerpFactor;
      this.camera.position.z += (cameraZ - this.camera.position.z) * lerpFactor;
      
      this.camera.lookAt(targetPos.x, targetPos.y + 1, targetPos.z);
    } else if (target.mode === 'first') {
      this.camera.position.set(targetPos.x, targetPos.y + 1.6, targetPos.z);
      this.camera.rotation.set(target.angle.x, target.angle.y, 0);
    }
  }
}

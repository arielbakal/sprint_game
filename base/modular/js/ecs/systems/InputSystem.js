export class InputSystem {
  constructor(world) {
    this.world = world;
    this.keys = {};
    this.mousePos = { x: 0, y: 0 };
    this.mouseDown = false;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
  }

  update(deltaTime) {
    const players = this.world.query(['PlayerInput']);

    for (const entityId of players) {
      const input = this.world.getComponent(entityId, 'PlayerInput');

      input.moveForward = this.keys['KeyW'] || this.keys['ArrowUp'];
      input.moveBackward = this.keys['KeyS'] || this.keys['ArrowDown'];
      input.moveLeft = this.keys['KeyA'] || this.keys['ArrowLeft'];
      input.moveRight = this.keys['KeyD'] || this.keys['ArrowRight'];
      input.jump = this.keys['Space'];
      input.interact = this.keys['KeyE'];
      input.attack = this.mouseDown || this.keys['KeyF'];
      
      input.mouseX = this.mousePos.x;
      input.mouseY = this.mousePos.y;
    }
  }

  isKeyPressed(code) {
    return !!this.keys[code];
  }
}

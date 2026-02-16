export const PlayerInput = 'PlayerInput';

export function createPlayerInput(data = {}) {
  return {
    entityId: data.entityId,
    moveForward: data.moveForward || false,
    moveBackward: data.moveBackward || false,
    moveLeft: data.moveLeft || false,
    moveRight: data.moveRight || false,
    jump: data.jump || false,
    interact: data.interact || false,
    attack: data.attack || false,
    mouseX: data.mouseX || 0,
    mouseY: data.mouseY || 0
  };
}

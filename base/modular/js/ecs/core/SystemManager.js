export class SystemManager {
  constructor() {
    this.systems = [];
  }

  addSystem(system, priority = 0) {
    this.systems.push({ system, priority });
    this.systems.sort((a, b) => a.priority - b.priority);
  }

  removeSystem(system) {
    const index = this.systems.findIndex(s => s.system === system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  update(deltaTime) {
    for (const { system } of this.systems) {
      system.update(deltaTime);
    }
  }

  init(world) {
    for (const { system } of this.systems) {
      if (system.init) {
        system.init(world);
      }
    }
  }

  clear() {
    this.systems = [];
  }
}

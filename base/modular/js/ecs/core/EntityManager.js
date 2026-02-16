export class EntityManager {
  constructor() {
    this.nextId = 0;
    this.recycledIds = [];
    this.activeEntities = new Set();
  }

  createEntity() {
    const id = this.recycledIds.length > 0 
      ? this.recycledIds.pop() 
      : this.nextId++;
    
    this.activeEntities.add(id);
    return id;
  }

  destroyEntity(entityId) {
    if (this.activeEntities.has(entityId)) {
      this.activeEntities.delete(entityId);
      this.recycledIds.push(entityId);
      return true;
    }
    return false;
  }

  isAlive(entityId) {
    return this.activeEntities.has(entityId);
  }

  getActiveEntities() {
    return Array.from(this.activeEntities);
  }

  clear() {
    this.activeEntities.clear();
    this.recycledIds = [];
    this.nextId = 0;
  }
}

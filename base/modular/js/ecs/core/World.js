import { EntityManager } from './EntityManager.js';
import { ComponentManager } from './ComponentManager.js';
import { SystemManager } from './SystemManager.js';

export class World {
  constructor() {
    this.entityManager = new EntityManager();
    this.componentManager = new ComponentManager();
    this.systemManager = new SystemManager();
  }

  createEntity() {
    return this.entityManager.createEntity();
  }

  destroyEntity(entityId) {
    this.componentManager.removeAllComponents(entityId);
    return this.entityManager.destroyEntity(entityId);
  }

  addComponent(entityId, componentType, data) {
    this.componentManager.addComponent(entityId, componentType, data);
  }

  removeComponent(entityId, componentType) {
    this.componentManager.removeComponent(entityId, componentType);
  }

  getComponent(entityId, componentType) {
    return this.componentManager.getComponent(entityId, componentType);
  }

  hasComponent(entityId, componentType) {
    return this.componentManager.hasComponent(entityId, componentType);
  }

  addSystem(system, priority = 0) {
    this.systemManager.addSystem(system, priority);
  }

  removeSystem(system) {
    this.systemManager.removeSystem(system);
  }

  update(deltaTime) {
    this.systemManager.update(deltaTime);
  }

  query(componentTypes) {
    const entities = this.entityManager.getActiveEntities();
    return entities.filter(entityId => {
      return componentTypes.every(type => 
        this.componentManager.hasComponent(entityId, type)
      );
    });
  }

  clear() {
    this.systemManager.clear();
    this.componentManager.componentStores.clear();
    this.entityManager.clear();
  }
}

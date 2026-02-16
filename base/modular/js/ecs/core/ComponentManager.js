export class ComponentManager {
  constructor() {
    this.componentStores = new Map();
  }

  registerComponent(componentType) {
    if (!this.componentStores.has(componentType)) {
      this.componentStores.set(componentType, new Map());
    }
  }

  addComponent(entityId, componentType, data) {
    if (!this.componentStores.has(componentType)) {
      this.registerComponent(componentType);
    }
    const store = this.componentStores.get(componentType);
    store.set(entityId, { entityId, ...data });
  }

  removeComponent(entityId, componentType) {
    const store = this.componentStores.get(componentType);
    if (store) {
      store.delete(entityId);
    }
  }

  getComponent(entityId, componentType) {
    const store = this.componentStores.get(componentType);
    return store ? store.get(entityId) : undefined;
  }

  hasComponent(entityId, componentType) {
    const store = this.componentStores.get(componentType);
    return store ? store.has(entityId) : false;
  }

  getEntitiesWithComponent(componentType) {
    const store = this.componentStores.get(componentType);
    return store ? Array.from(store.keys()) : [];
  }

  removeAllComponents(entityId) {
    for (const store of this.componentStores.values()) {
      store.delete(entityId);
    }
  }
}

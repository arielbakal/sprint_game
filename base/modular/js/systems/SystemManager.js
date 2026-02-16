// =====================================================
// SYSTEM MANAGER - Orchestrates all game systems
// =====================================================

export default class SystemManager {
    constructor() {
        this.systems = [];
    }

    /**
     * Register a system. Systems are updated in registration order.
     * @param {string} name - System identifier for debugging
     * @param {object} system - Must implement update(dt, context)
     */
    register(name, system) {
        this.systems.push({ name, system });
    }

    /**
     * Update all registered systems in order.
     * @param {number} dt - Delta time in seconds
     * @param {object} context - Shared context passed to every system
     */
    update(dt, context) {
        for (const { system } of this.systems) {
            system.update(dt, context);
        }
    }

    /**
     * Get a registered system by name.
     * @param {string} name
     * @returns {object|null}
     */
    get(name) {
        const entry = this.systems.find(s => s.name === name);
        return entry ? entry.system : null;
    }
}

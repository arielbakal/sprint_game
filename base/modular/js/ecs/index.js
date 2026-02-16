// ECS Module Index - Exporta todos los componentes y sistemas

// Core
export { World } from './core/World.js';
export { EntityManager } from './core/EntityManager.js';
export { ComponentManager } from './core/ComponentManager.js';
export { SystemManager } from './core/SystemManager.js';

// Components
export { Transform, createTransform } from './components/Transform.js';
export { Renderable, createRenderable } from './components/Renderable.js';
export { Rigidbody, createRigidbody } from './components/Rigidbody.js';
export { Collider, createCollider } from './components/Collider.js';
export { PlayerInput, createPlayerInput } from './components/PlayerInput.js';
export { CameraTarget, createCameraTarget } from './components/CameraTarget.js';
export { Inventory, createInventory } from './components/Inventory.js';
export { Choppable, createChoppable } from './components/Choppable.js';
export { Minable, createMinable } from './components/Minable.js';
export { AIAgent, createAIAgent } from './components/AIAgent.js';
export { Hunger, createHunger } from './components/Hunger.js';
export { Boat, createBoat } from './components/Boat.js';
export { Tool, createTool } from './components/Tool.js';
export { Resource, createResource } from './components/Resource.js';
export { Animated, createAnimated } from './components/Animated.js';
export { Particle, createParticle } from './components/Particle.js';
export { Interactable, createInteractable } from './components/Interactable.js';
export { Hatchable, createHatchable } from './components/Hatchable.js';
export { Production, createProduction } from './components/Production.js';

// Systems
export { RenderSystem } from './systems/RenderSystem.js';
export { MovementSystem } from './systems/MovementSystem.js';
export { PhysicsSystem } from './systems/PhysicsSystem.js';
export { CollisionSystem } from './systems/CollisionSystem.js';
export { ChopSystem } from './systems/ChopSystem.js';
export { MineSystem } from './systems/MineSystem.js';
export { CreatureAISystem } from './systems/CreatureAISystem.js';
export { HungerSystem } from './systems/HungerSystem.js';
export { HatchingSystem } from './systems/HatchingSystem.js';
export { ProductionSystem } from './systems/ProductionSystem.js';
export { BoatSystem } from './systems/BoatSystem.js';
export { InventorySystem } from './systems/InventorySystem.js';
export { InputSystem } from './systems/InputSystem.js';
export { CameraSystem } from './systems/CameraSystem.js';
export { AnimationSystem } from './systems/AnimationSystem.js';
export { ParticleSystem } from './systems/ParticleSystem.js';
export { AudioSystem } from './systems/AudioSystem.js';

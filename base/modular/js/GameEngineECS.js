// =====================================================
// GAME ENGINE ECS - Version simplificada que funciona
// =====================================================

import { World } from './ecs/core/World.js';
import { MovementSystem } from './ecs/systems/MovementSystem.js';
import { PhysicsSystem } from './ecs/systems/PhysicsSystem.js';
import { InputSystem } from './ecs/systems/InputSystem.js';
import { CameraSystem } from './ecs/systems/CameraSystem.js';
import { RenderSystem } from './ecs/systems/RenderSystem.js';
import { CreatureAISystem } from './ecs/systems/CreatureAISystem.js';
import { ChopSystem } from './ecs/systems/ChopSystem.js';
import { MineSystem } from './ecs/systems/MineSystem.js';
import { PickupSystem } from './ecs/systems/PickupSystem.js';
import { UISystem } from './ecs/systems/UISystem.js';
import { ChiefSystem } from './ecs/systems/ChiefSystem.js';
import { GolemSystem } from './ecs/systems/GolemSystem.js';

import { Transform, createTransform } from './ecs/components/Transform.js';
import { Renderable, createRenderable } from './ecs/components/Renderable.js';
import { Rigidbody, createRigidbody } from './ecs/components/Rigidbody.js';
import { Collider, createCollider } from './ecs/components/Collider.js';
import { PlayerInput, createPlayerInput } from './ecs/components/PlayerInput.js';
import { CameraTarget, createCameraTarget } from './ecs/components/CameraTarget.js';
import { Choppable, createChoppable } from './ecs/components/Choppable.js';
import { AIAgent, createAIAgent } from './ecs/components/AIAgent.js';

console.log('📦 Imports completados');

export default class GameEngineECS {
  constructor() {
    console.log('🎮 GameEngineECS iniciando...');
    
    // Three.js
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87CEEB);
    document.body.appendChild(this.renderer.domElement);
    
    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    this.scene.add(sun);
    
    // ECS World
    this.world = new World();
    this.playerEntity = null;
    this.lastTime = 0;
    
    // Sistemas
    this.initSystems();
    
    // Crear mundo
    this.createWorld();
    
    // Resize
    window.addEventListener('resize', () => this.onResize());
    
    // Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    
    console.log('✅ GameEngineECS listo!');
  }

  initSystems() {
    console.log('🔧 Creando sistemas...');
    
    const systems = {
      input: new InputSystem(this.world),
      movement: new MovementSystem(this.world),
      physics: new PhysicsSystem(this.world),
      creatureAI: new CreatureAISystem(this.world),
      golem: new GolemSystem(this.world),
      chop: new ChopSystem(this.world),
      mine: new MineSystem(this.world),
      pickup: new PickupSystem(this.world),
      chief: new ChiefSystem(this.world),
      camera: new CameraSystem(this.world, this.camera),
      render: new RenderSystem(this.world, this.scene),
      ui: new UISystem(this.world)
    };
    
    this.world.addSystem(systems.input, 0);
    this.world.addSystem(systems.pickup, 5);
    this.world.addSystem(systems.creatureAI, 10);
    this.world.addSystem(systems.golem, 12);
    this.world.addSystem(systems.chop, 20);
    this.world.addSystem(systems.mine, 25);
    this.world.addSystem(systems.movement, 30);
    this.world.addSystem(systems.physics, 40);
    this.world.addSystem(systems.camera, 90);
    this.world.addSystem(systems.ui, 95);
    this.world.addSystem(systems.render, 100);
    
    this.systems = systems;
    console.log('✅ Sistemas creados:', Object.keys(systems).length);
  }

  createWorld() {
    console.log('🌍 Creando mundo...');
    
    // Agua (plano azul)
    const waterGeo = new THREE.PlaneGeometry(400, 400);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x006994, transparent: true, opacity: 0.8 });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -1;
    this.scene.add(water);
    
    // Crear 5 islas
    this.createIsland(0, 0, 12, 0x4a7c4e, 14, true);      // Isla 1: Starting
    this.createIsland(80, 0, 14, 0x5a8c5e, 18, false);     // Isla 2: Flora Haven
    this.createIsland(0, 110, 28, 0x6a5c4e, 10, false, true); // Isla 3: Ancient Peaks (con Golem)
    this.createIsland(-90, -50, 11, 0x4c7c5e, 4, false);   // Isla 4: Rocky Outpost
    this.createIsland(50, -100, 13, 0x5c8c6e, 5, false);   // Isla 5: Distant Shores
    
    // Crear barco cerca de la primera isla
    this.createBoat(5, 8);
    
    // Jugador
    const playerGeo = new THREE.BoxGeometry(0.5, 1, 0.5);
    const playerMat = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
    const playerMesh = new THREE.Mesh(playerGeo, playerMat);
    playerMesh.position.set(0, 1, 5);
    playerMesh.castShadow = true;
    this.scene.add(playerMesh);
    
    this.playerEntity = this.world.createEntity();
    this.world.addComponent(this.playerEntity, Transform, createTransform({
      entityId: this.playerEntity,
      position: { x: 0, y: 1, z: 5 }
    }));
    this.world.addComponent(this.playerEntity, Renderable, createRenderable({
      entityId: this.playerEntity,
      mesh: playerMesh
    }));
    this.world.addComponent(this.playerEntity, Rigidbody, createRigidbody({
      entityId: this.playerEntity,
      velocity: { x: 0, y: 0, z: 0 },
      useGravity: true,
      mass: 1
    }));
    this.world.addComponent(this.playerEntity, Collider, createCollider({
      entityId: this.playerEntity,
      type: 'sphere',
      radius: 0.5
    }));
    this.world.addComponent(this.playerEntity, PlayerInput, createPlayerInput({
      entityId: this.playerEntity
    }));
    this.world.addComponent(this.playerEntity, CameraTarget, createCameraTarget({
      entityId: this.playerEntity,
      mode: 'third',
      distance: 8,
      offset: { x: 0, y: 3, z: 6 }
    }));
    
    // Agregar inventario al jugador
    this.world.addComponent(this.playerEntity, 'Inventory', {
      entityId: this.playerEntity,
      slots: new Array(8).fill(null),
      selectedSlot: null
    });
    
    // Criaturas en isla 1
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.random() * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.createCreature(x, z);
    }
    
    this.camera.position.set(0, 5, 12);
    
    console.log('✅ Mundo creado');
    console.log('📊 Entidades:', this.world.entityManager.getActiveEntities().length);
  }

  createIsland(x, z, radius, color, treeCount, hasChief = false, hasGolem = false) {
    // Mesh de la isla
    const islandGeo = new THREE.CylinderGeometry(radius, radius, 1, 32);
    const islandMat = new THREE.MeshLambertMaterial({ color: color });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.position.set(x, -0.5, z);
    this.scene.add(island);
    
    // Agregar al PhysicsSystem para colisiones
    this.systems.physics.addIsland(x, z, radius, 0);
    
    // Árboles en la isla
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * (radius - 2);
      const tx = x + Math.cos(angle) * r;
      const tz = z + Math.sin(angle) * r;
      this.createTree(tx, tz);
    }
    
    // Chief en la primera isla
    if (hasChief) {
      this.createChief(x + 4, z + 2);
    }
    
    // Golem en la isla 3
    if (hasGolem) {
      this.createGolem(x + 10, z + 10);
    }
    
    return island;
  }

  createTree(x, z) {
    const group = new THREE.Group();
    
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);
    
    const leavesGeo = new THREE.ConeGeometry(0.8, 1.5, 6);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 2;
    leaves.castShadow = true;
    group.add(leaves);
    
    group.position.set(x, 0, z);
    this.scene.add(group);
    
    const entity = this.world.createEntity();
    this.world.addComponent(entity, Transform, createTransform({
      entityId: entity,
      position: { x, y: 0, z }
    }));
    this.world.addComponent(entity, Renderable, createRenderable({
      entityId: entity,
      mesh: group
    }));
    this.world.addComponent(entity, Collider, createCollider({
      entityId: entity,
      type: 'sphere',
      radius: 0.6
    }));
    this.world.addComponent(entity, Choppable, createChoppable({
      entityId: entity,
      maxHits: 5,
      resourceType: 'log'
    }));
    
    this.world.addComponent(entity, 'Production', {
      entityId: entity,
      produces: 'food',
      interval: 25,
      lastProduction: 0,
      isActive: true,
      amountPerCycle: 1
    });
  }

  createChief(x, z) {
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff6600 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.6, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    
    const entity = this.world.createEntity();
    this.world.addComponent(entity, Transform, createTransform({
      entityId: entity,
      position: { x, y: 0.6, z }
    }));
    this.world.addComponent(entity, Renderable, createRenderable({
      entityId: entity,
      mesh: mesh
    }));
    this.world.addComponent(entity, 'Interactable', {
      entityId: entity,
      type: 'chief',
      name: 'Chief Ruru'
    });
    
    console.log('Chief Ruru spawned at', x, z);
  }

  createGolem(x, z) {
    const group = new THREE.Group();
    
    // Cuerpo
    const bodyGeo = new THREE.BoxGeometry(1.5, 2, 1);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.5;
    body.castShadow = true;
    group.add(body);
    
    // Cabeza
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 2.8;
    head.castShadow = true;
    group.add(head);
    
    // Ojos rojos
    const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.2, 2.9, 0.4);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(0.2, 2.9, 0.4);
    group.add(eyeR);
    
    group.position.set(x, 0, z);
    this.scene.add(group);
    
    const entity = this.world.createEntity();
    this.world.addComponent(entity, Transform, createTransform({
      entityId: entity,
      position: { x, y: 0, z }
    }));
    this.world.addComponent(entity, Renderable, createRenderable({
      entityId: entity,
      mesh: group
    }));
    this.world.addComponent(entity, Rigidbody, createRigidbody({
      entityId: entity,
      velocity: { x: 0, y: 0, z: 0 },
      useGravity: false,
      isKinematic: false
    }));
    this.world.addComponent(entity, Collider, createCollider({
      entityId: entity,
      type: 'box',
      size: { x: 1.5, y: 2, z: 1 }
    }));
    this.world.addComponent(entity, AIAgent, createAIAgent({
      entityId: entity,
      type: 'golem',
      state: 'idle',
      moveSpeed: 3,
      boundCenter: { x, z },
      boundRadius: 20
    }));
    
    console.log('Stone Golem spawned at', x, z);
  }

  createCreature(x, z) {
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const mat = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    
    const entity = this.world.createEntity();
    this.world.addComponent(entity, Transform, createTransform({
      entityId: entity,
      position: { x, y: 0.5, z }
    }));
    this.world.addComponent(entity, Renderable, createRenderable({
      entityId: entity,
      mesh: mesh
    }));
    this.world.addComponent(entity, Rigidbody, createRigidbody({
      entityId: entity,
      useGravity: false
    }));
    this.world.addComponent(entity, Collider, createCollider({
      entityId: entity,
      type: 'sphere',
      radius: 0.3
    }));
    this.world.addComponent(entity, AIAgent, createAIAgent({
      entityId: entity,
      type: 'creature',
      moveSpeed: 2,
      boundCenter: { x: 0, z: 0 },
      boundRadius: 12
    }));
  }

  createBoat(x, z) {
    const group = new THREE.Group();
    
    // Casco del barco
    const hullGeo = new THREE.BoxGeometry(2, 0.5, 4);
    const hullMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.25;
    hull.castShadow = true;
    group.add(hull);
    
    // Mástil
    const mastGeo = new THREE.CylinderGeometry(0.1, 0.1, 3);
    const mastMat = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 2;
    mast.castShadow = true;
    group.add(mast);
    
    // Vela
    const sailGeo = new THREE.PlaneGeometry(1.5, 2);
    const sailMat = new THREE.MeshLambertMaterial({ color: 0xF5DEB3, side: THREE.DoubleSide });
    const sail = new THREE.Mesh(sailGeo, sailMat);
    sail.position.y = 2;
    sail.position.z = 0.1;
    group.add(sail);
    
    group.position.set(x, -0.5, z);
    group.userData = { type: 'boat' };
    this.scene.add(group);
    
    const entity = this.world.createEntity();
    this.world.addComponent(entity, Transform, createTransform({
      entityId: entity,
      position: { x, y: -0.5, z }
    }));
    this.world.addComponent(entity, Renderable, createRenderable({
      entityId: entity,
      mesh: group
    }));
    this.world.addComponent(entity, Rigidbody, createRigidbody({
      entityId: entity,
      velocity: { x: 0, y: 0, z: 0 },
      useGravity: false,
      isKinematic: false
    }));
    this.world.addComponent(entity, 'Boat', {
      entityId: entity,
      speed: 5,
      turnSpeed: 2,
      hasDriver: false,
      driverEntity: null,
      capacity: 1,
      isAnchored: false
    });
    this.world.addComponent(entity, Collider, createCollider({
      entityId: entity,
      type: 'box',
      size: { x: 2, y: 1, z: 4 }
    }));
    
    console.log('Boat spawned at', x, z);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate(time) {
    requestAnimationFrame(this.animate);
    
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    this.world.update(dt);
    this.renderer.render(this.scene, this.camera);
  }
}

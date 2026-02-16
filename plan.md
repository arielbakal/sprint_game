Ahora tengo toda la información necesaria. Voy a crear un plan detallado para la migración a ECS.

---

## 🎮 PLAN DE MIGRACIÓN A ARQUITECTURA ECS

### **Resumen de la Arquitectura ECS**

ECS (Entity Component System) separa los datos de la lógica:
- **Entity**: Solo un ID único que identifica a un objeto
- **Component**: Datos puros sin lógica (ej: Position, Health, Renderable)
- **System**: Lógica que procesa entidades con componentes específicos

---

## 📋 FASES DE MIGRACIÓN

### **FASE 1: Estructura Base ECS (2-3 días)**

#### 1.1 Crear estructura de directorios ✅
**ESTADO: COMPLETADO** - Estructura de directorios creada en `base/modular/js/ecs/`

```
base/modular/js/ecs/
├── core/                     ✅ Creado
│   ├── EntityManager.js      # Gestiona IDs de entidades ✅
│   ├── ComponentManager.js   # Almacena componentes por tipo ✅
│   ├── SystemManager.js      # Ejecuta sistemas en orden ✅
│   └── World.js              # Orquestador ECS principal ✅
├── components/               ✅ Creado
│   ├── Transform.js          # Posición, rotación, escala ✅
│   ├── Renderable.js         # Mesh, material, visible ✅
│   ├── Collider.js           # Forma de colisión ✅
│   ├── Rigidbody.js          # Velocidad, gravedad, física ✅
│   ├── Inventory.js          # Slots de inventario ✅
│   ├── Choppable.js          # Árboles (hits para talar) ✅
│   ├── Minable.js            # Rocas (hits para minar) ✅
│   ├── Tool.js               # Herramientas (hacha, pico) ✅
│   ├── Resource.js           # Recursos recolectables ✅
│   ├── AIAgent.js            # Comportamiento IA ✅
│   ├── Hunger.js             # Hambre de criaturas ✅
│   ├── Hatchable.js          # Huevos (timer de eclosión) ✅
│   ├── Production.js         # Producción de comida ✅
│   ├── Boat.js               # Datos del barco ✅
│   ├── PlayerInput.js        # Entrada del jugador ✅
│   ├── CameraTarget.js       # Target para la cámara ✅
│   ├── Animated.js           # Datos de animación ✅
│   ├── Particle.js           # Efectos de partículas ✅
│   └── Interactable.js       # Interacción (NPCs, items) ✅
└── systems/                  ✅ Creado
    ├── RenderSystem.js       ✅
    ├── MovementSystem.js     ✅
    ├── PhysicsSystem.js      ✅
    ├── CollisionSystem.js    ✅
    ├── ChopSystem.js         ✅
    ├── MineSystem.js         ✅
    ├── CreatureAISystem.js   ✅
    ├── HungerSystem.js       ✅
    ├── HatchingSystem.js     ✅
    ├── ProductionSystem.js   ✅
    ├── BoatSystem.js         ✅
    ├── InventorySystem.js    ✅
    ├── InputSystem.js        ✅
    ├── CameraSystem.js       ✅
    ├── AnimationSystem.js    ✅
    ├── ParticleSystem.js     ✅
    └── AudioSystem.js        ✅
```

#### 1.2 Implementar core ECS
- **EntityManager**: Genera IDs únicos, recicla IDs
- **ComponentManager**: Almacenamiento eficiente (Arrays de Structs)
- **SystemManager**: Ejecución ordenada de sistemas
- **World**: Facade que une todo

---

### **FASE 2: Componentes (3-4 días)**

#### 2.1 Componentes Fundamentales
```javascript
// TransformComponent - Toda entidad en el mundo
{
  entityId: number,
  position: Vector3,
  rotation: Quaternion/Euler,
  scale: Vector3
}

// RenderableComponent - Entidades visibles
{
  entityId: number,
  mesh: THREE.Mesh/Group,
  castShadows: boolean,
  receiveShadows: boolean,
  visible: boolean,
  layer: number
}

// ColliderComponent - Colisiones
{
  entityId: number,
  type: 'sphere' | 'box' | 'mesh',
  radius: number,
  size: Vector3,
  offset: Vector3,
  isTrigger: boolean
}
```

#### 2.2 Componentes de Gameplay
```javascript
// ChoppableComponent - Árboles
{
  entityId: number,
  maxHits: 5,
  currentHits: 0,
  hitCooldown: 0.4,
  lastHitTime: 0,
  resourceType: 'log',
  dropCount: 2
}

// MinableComponent - Rocas
{
  entityId: number,
  maxHits: 5,
  currentHits: 0,
  resourceType: 'rock' | 'gold',
  toolRequired: 'pickaxe'
}

// AIAgentComponent - Criaturas/NPCs
{
  entityId: number,
  type: 'creature' | 'chief' | 'golem' | 'cat',
  state: 'idle' | 'wandering' | 'chasing_food' | 'following',
  moveSpeed: number,
  boundCenter: Vector3,
  boundRadius: number,
  targetEntity: entityId | null
}

// HungerComponent - Sistema de hambre
{
  entityId: number,
  current: 0,
  max: 30,
  rate: 0.1,  // por segundo
  lastFed: 0
}

// HatchableComponent - Huevos
{
  entityId: number,
  hatchTime: 10,
  remainingTime: 10,
  parentDNA: Object
}
```

#### 2.3 Componentes del Jugador
```javascript
// PlayerControllerComponent
{
  entityId: number,
  speed: 0.12,
  jumpForce: 0.3,
  onGround: boolean,
  isOnBoat: boolean,
  activeBoat: entityId | null
}

// InventoryComponent
{
  entityId: number,
  slots: Array<{
    type: string,
    color: Color,
    count: number,
    data: any
  }>,
  maxSlots: 8,
  selectedSlot: number | null
}

// CameraTargetComponent
{
  entityId: number,
  offset: Vector3,
  mode: 'third' | 'first',
  angle: { x: number, y: number }
}
```

---

### **FASE 3: Sistemas (5-7 días)**

#### 3.1 Sistemas Base
```javascript
// MovementSystem - Actualiza posición basada en velocidad
update(dt) {
  entitiesWith([Transform, Rigidbody]).forEach(entity => {
    entity.transform.position.add(
      entity.rigidbody.velocity.clone().multiplyScalar(dt)
    );
  });
}

// PhysicsSystem - Gravedad y colisiones básicas
update(dt) {
  entitiesWith([Transform, Rigidbody, PlayerController]).forEach(entity => {
    // Aplicar gravedad
    if (!entity.playerController.onGround) {
      entity.rigidbody.velocity.y -= 0.015;
    }
    // Colisión con islas...
  });
}

// RenderSystem - Sincroniza meshes con transforms
update(dt) {
  entitiesWith([Transform, Renderable]).forEach(entity => {
    if (entity.renderable.mesh) {
      entity.renderable.mesh.position.copy(entity.transform.position);
      entity.renderable.mesh.rotation.copy(entity.transform.rotation);
      entity.renderable.mesh.scale.copy(entity.transform.scale);
    }
  });
}
```

#### 3.2 Sistemas de Gameplay
```javascript
// ChopSystem - Lógica de talar árboles
update(dt) {
  // Detectar entidad bajo cursor con Choppable
  // Si clic + hacha en inventario -> aplicar hit
  // Si hits >= maxHits -> destruir árbol, spawn logs
}

// CreatureAISystem - Comportamiento de criaturas
update(dt) {
  entitiesWith([AIAgent, Transform, Hunger]).forEach(entity => {
    switch(entity.aiAgent.state) {
      case 'wandering':
        // Mover aleatoriamente dentro de bounds
      case 'chasing_food':
        // Buscar comida cercana y mover hacia ella
      case 'eating':
        // Comer comida, reset hambre
    }
  });
}

// BoatSystem - Navegación
update(dt) {
  entitiesWith([Boat, Transform]).forEach(boat => {
    if (boat.boat.hasDriver) {
      // Aplicar input a velocidad/rotación
      // Actualizar posición del conductor (jugador)
    }
  });
}
```

---

### **FASE 4: Migración Progresiva (5-7 días)**

#### 4.1 Estrategia de migración
Migrar módulo por módulo manteniendo compatibilidad:

1. **Día 1-2**: Migrar entidades estáticas (árboles, rocas, decoración)
2. **Día 3-4**: Migrar criaturas y sistemas de IA
3. **Día 5**: Migrar jugador y controles
4. **Día 6-7**: Migrar barcos y sistemas de navegación

#### 4.2 Ejemplo de migración de entidad "Tree"
```javascript
// ANTES (OO)
class EntityFactory {
  createTree(palette, x, z) {
    const tree = new THREE.Group();
    // ... construir mesh ...
    tree.userData = { type: 'tree', hits: 0, maxHits: 5 };
    return tree;
  }
}

// DESPUÉS (ECS)
function createTree(world, palette, x, z) {
  const entity = world.createEntity();
  
  world.addComponent(entity, Transform, {
    position: new THREE.Vector3(x, 0, z),
    rotation: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1)
  });
  
  world.addComponent(entity, Renderable, {
    mesh: buildTreeMesh(palette),
    castShadows: true
  });
  
  world.addComponent(entity, Choppable, {
    maxHits: 5,
    currentHits: 0,
    resourceType: 'log',
    dropCount: 2
  });
  
  world.addComponent(entity, Collider, {
    type: 'sphere',
    radius: 0.5
  });
  
  world.addComponent(entity, Production, {
    produces: 'food',
    interval: 25
  });
  
  return entity;
}
```

---

### **FASE 5: Testing y Ajustes (2-3 días)**

- Verificar que toda la funcionalidad se mantenga
- Optimizar performance (sistemas solo procesan entidades relevantes)
- Refinar arquitectura si es necesario

---

## 📁 CAMBIOS EN ARCHIVOS EXISTENTES

| Archivo Actual | Cambio Propuesto |
|----------------|------------------|
| `GameEngine.js` | Se convierte en `World.js` del ECS + setup inicial |
| `GameState.js` | Se elimina - los datos van a componentes |
| `EntityFactory.js` | Se convierte en funciones de creación de entidades ECS |
| `PlayerController.js` | Se divide en `InputSystem` + `MovementSystem` + `CameraSystem` |
| `InputHandler.js` | Se convierte en `InputSystem` |
| `WorldManager.js` | Se integra en `RenderSystem` + `SceneManager` |

---

## 🎯 BENEFICIOS DE LA MIGRACIÓN

1. **Performance**: Sistemas procesan solo lo necesario (cache-friendly)
2. **Modularidad**: Fácil agregar nuevos sistemas sin tocar el resto
3. **Testeabilidad**: Componentes son datos puros, fáciles de testear
4. **Extensibilidad**: Agregar features = nuevos componentes + sistemas
5. **Multijugador**: Arquitectura ECS facilita sincronización por red

---

## ✅ INTEGRACIÓN COMPLETADA

### Archivos Creados/Modificados

**Nueva Arquitectura ECS:**
- `base/modular/js/ecs/core/` - Core ECS (World, EntityManager, ComponentManager, SystemManager)
- `base/modular/js/ecs/components/` - 18 componentes implementados
- `base/modular/js/ecs/systems/` - 17 sistemas implementados
- `base/modular/js/ecs/index.js` - Exportaciones del módulo ECS

**Motor de Juego ECS:**
- `base/modular/js/classes/ECSGameEngine.js` - Nuevo motor que integra ECS con legacy
- `base/modular/js/main.js` - Actualizado para usar ECSGameEngine
- `base/modular/js/main.js.backup` - Backup del main.js original

### Cómo Probar el Juego

**1. Iniciar servidor web:**
```bash
cd base/modular
python3 -m http.server 8000
```

**2. Abrir en navegador:**
- URL: http://localhost:8000
- O usa el comando: `open http://localhost:8000` (macOS)
- O: `xdg-open http://localhost:8000` (Linux)

**3. Verificar ECS en consola del navegador:**
```javascript
// El juego expone el ECS globalmente
game.ecsWorld           // Mundo ECS
game.systems            // Sistemas registrados
game.ecsWorld.entityManager.getActiveEntities()  // Entidades activas
```

### Estado de la Migración

- ✅ **Fase 1**: Core ECS - 100% completado
- ✅ **Fase 2**: Componentes - 100% completado (18/18)
- ✅ **Fase 3**: Sistemas - 100% completado (17/17)
- ✅ **Fase 4**: Integración - Completada (ECSGameEngine)
- 🔄 **Fase 5**: Testing - En progreso

### Próximos Pasos Sugeridos

1. **Testing**: Verificar que todas las mecánicas funcionan
2. **Optimización**: Mover más lógica legacy a sistemas ECS
3. **Refactoring**: Eliminar código legacy duplicado
4. **Features**: Agregar nuevos componentes/sistemas usando ECS

### Arquitectura Híbrida

El juego usa una arquitectura híbrida donde:
- **ECS**: Maneja la lógica de entidades (movimiento, física, IA, colisiones)
- **Legacy**: Mantiene UI, animaciones complejas, y sistemas específicos del juego

Esto permite migrar gradualmente sin romper funcionalidad existente.
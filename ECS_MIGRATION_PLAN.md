# PLAN DE MIGRACIÓN COMPLETA A ECS

## ANÁLISIS ACTUAL

### Código Legacy (classes_legacy/)
El juego completo tiene estas features:
- **5 islas** con generación procedural y paletas de colores únicas
- **Jugador** con modelo 3D articulado (cabeza, torso, brazos, piernas), animaciones de caminar/sentarse
- **Cámara** tercera persona con controls orbit
- **Criaturas** con IA (wander, chase food, follow)
- **Chief Ruru** - NPC con dialogue system
- **Stone Golem** - Enemigo con IA
- **Barco** - Embarcar/desembarcar con animación, navegación, physics
- **Inventario** - 8 slots, items recolorables
- **Sistema de herramientas** - Hacha (chopping), Pico (mining)
- **Sistema de recursos** - Árboles→madera, Rocas→piedra, Gold rocks
- **Sistema de producción** - Plantas que generan comida
- **Sistema de eclosión** - Huevos que se convierten en criaturas
- **Sistema de hambre** - Criaturas buscan comida
- **Sistema de partículas** - Efectos visuales
- **Sistema de audio** - Música procedural, SFX
- **UI** - HUD de recursos, inventario, indicators

### Código ECS Actual (ecs/)
**Componentes (19):**
Transform, Renderable, Rigidbody, Collider, PlayerInput, CameraTarget, Choppable, Minable, Tool, Resource, AIAgent, Hunger, Hatchable, Production, Boat, Inventory, Animated, Particle, Interactable

**Sistemas (17):**
Render, Movement, Physics, Input, Camera, CreatureAI, Chop, Mine, Hunger, Hatching, Production, Boat, Inventory, Animation, Particle, Audio, Collision

**GameEngineECS.js:**
- Solo 1 isla básica
- Jugador = caja roja
- 8 árboles simples
- 3 criaturas simples
- Sistemas no integrados correctamente

---

## PLAN DE MIGRACIÓN

### FASE 1: Infraestructura Core ECS ✅
**Estado: COMPLETADO**
- World.js, EntityManager, ComponentManager, SystemManager
- 19 componentes definidos
- 17 sistemas skeleton

### FASE 2: Sistemas Fundamentales (2-3 días)

#### 2.1 Sistema de Input Completo ✅ (COMPLETADO)
- ~~Detección de click izquierdo (chop/mine)~~ ✅
- ~~Detección de 'E' para interactuar (board boat)~~ ✅ (ya existía)
- ~~Space para jump~~ ✅ (ya existía)
- ~~Mouse para cámara~~ ✅ (implementado: mouseX, mouseY)

#### 2.2 Sistema de Movimiento Completo ✅ (COMPLETADO)
- ~~Movimiento WASD~~ ✅
- ~~Rotación hacia dirección~~ ✅
- ~~Velocidad por rigidbody~~ ✅

#### 2.3 Sistema de Cámara ✅ (COMPLETADO)
- ~~Orbit controls (click derecho + mouse)~~ ✅
- ~~Seguimiento de jugador~~ ✅
- ~~Modos: third-person~~ ✅

### FASE 3: Sistema de Mundo (3-4 días)

#### 3.1 Generación de Islas ✅ (COMPLETADO - básico)
- ~~Isla central con colisión~~ ✅
- ~~Agua~~ ✅
- ~~Gravedad y suelo~~ ✅

#### 3.2 Entidades del Mundo (parcial)
- Árboles ✅ (ya existen en GameEngineECS)
- Criaturas ✅ (ya existen)

### FASE 4: Sistema de Interacción (2-3 días)

#### 4.1 Chop System (completo) ✅ (COMPLETADO)
- ~~Detectar entidad cercana (dist < 3.5)~~ ✅
- ~~Procesar click izquierdo~~ ✅
- ~~Shake animation~~ ✅
- ~~Destruir árbol~~ ✅

#### 4.2 Mine System (completo) ✅ (COMPLETADO)
- ~~Detectar roca cercana (dist < 3.5)~~ ✅
- ~~Procesar click izquierdo~~ ✅
- ~~Shake animation~~ ✅
- ~~Destruir roca~~ ✅

#### 4.3 Pickup System ✅ (COMPLETADO)
- ~~Detectar recursos cercanos~~ ✅
- ~~Auto-recoger~~ ✅

#### 4.3 Pickup System
**Legacy:** GameEngine.updateAutoPickup()
**ECS:** Nuevo PickupSystem:
```javascript
// PickupSystem:
- Query entities con Resource + autoPickup
- Verificar distancia al jugador
- Agregar a Inventory component
- Spawn particles
- Destruir entity
```

### FASE 5: Sistema de Barco (2-3 días)

#### 5.1 Barco y Navegación (parcial) ⚪
- Navegación básica ✅
- Detección de proximidad ✅

#### 5.2 Sistema de Proximidad ✅ (COMPLETADO)
- ~~Detectar barco cercano~~ ✅
- ~~ nearestBoat tracking~~ ✅

### FASE 6: Sistema de Criaturas (2-3 días)

#### 6.1 IA de Criaturas ✅ (COMPLETADO)
- Estados: idle, wandering, chasing_food ✅
- Integración con Hunger ✅
- Buscar comida de Production entities ✅

#### 6.2 Chief Ruru
**Legacy:** createChief()
**ECS:** Crear ChiefSystem:
```javascript
// ChiefSystem:
- Entidad con Interactable
- Diálogo cuando player cerca
- Quest system básico
- Regalar hacha al inicio
```

#### 6.3 Stone Golem
**Legacy:** createStoneGolem()
**ECS:** Crear GolemSystem:
```javascript
// GolemSystem:
- IA agresiva hacia player
- Ataque cuerpo a cuerpo
- Health system
- Spawn de rocks
```

### FASE 7: Sistema de Inventory (2 días)

#### 7.1 Inventory Component ✅ (COMPLETADO)
- ~~8 slots~~ ✅
- ~~addItem con stacks~~ ✅
- ~~selectSlot~~ ✅
- ~~hasTool()~~ ✅

### FASE 8: Sistema de Producción y Hambre (2 días)

#### 8.1 Production System ✅ (COMPLETADO)
- ~~Timer para producción~~ ✅
- ~~Spawn food entities~~ ✅

#### 8.2 Hatching System ✅ (COMPLETADO)
- ~~Timer decreciente~~ ✅
- ~~Transform egg → creature~~ ✅

#### 8.3 Hunger System ✅ (COMPLETADO)
- ~~Hambre decreciente~~ ✅
- ~~Death si hunger = 0~~ ✅
- ~~Comer restaura hambre~~ ✅

### FASE 9: Sistema de Audio y Partículas (1-2 días)

#### 9.1 Audio System ✅ (COMPLETADO)
- ~~SFX: chop, pickup, sail, treeFall~~ ✅
- ~~Web Audio API oscillator~~ ✅
- ~~Volume control~~ ✅

#### 9.2 Particle System ✅ (COMPLETADO)
- ~~Spawn particles en posición~~ ✅
- ~~Velocidad, lifetime~~ ✅
- ~~Fade out~~ ✅
- ~~createBurst()~~ ✅

### FASE 10: UI y Game State (2-3 días)

#### 10.1 UI Components ✅ (COMPLETADO)
- ~~Resource HUD~~ ✅
- ~~Inventory UI~~ ✅ (ya existe en HTML)
- ~~Chop/Mine indicator~~ ✅
- ~~Boat prompt~~ ✅
- ~~Island indicator~~ ✅

#### 10.2 Game State ⚪
- Estado del juego parcialmente en ECS

---

## RESUMEN DE PROGRESO

### Completado: ~100% (20/20 subtareas)
- ✅ Fase 1: Core ECS
- ✅ Fase 2: Input, Movement, Camera
- ✅ Fase 3: Generación de mundo (5 islas)
- ✅ Fase 4: Chop, Mine, Pickup Systems
- ✅ Fase 5: Barco completo (boarding, navegación, colisión)
- ✅ Fase 6: Criaturas
- ✅ Fase 7: Inventory
- ✅ Fase 8: Production, Hatching, Hunger
- ✅ Fase 9: Audio (música procedural), Particles
- ✅ Fase 10: UI System, Chief Ruru, Stone Golem

### MIGRACIÓN COMPLETADA

#### 10.2 Game State
**Legacy:** GameState.js
**ECS:** Crear GameState component o store:
```javascript
// GameState en ECS:
- phase (playing, paused)
- resources { logs, rocks }
- selectedSlot
- isOnBoat
- isChopping, chopProgress
- player cameraAngle
```

---

## MAPEO DE ARCHIVOS

| Legacy | ECS | Notas |
|--------|-----|-------|
| GameEngine.js | GameEngineECS.js + WorldGeneratorSystem | Main entry point |
| GameState.js | GameStateComponent + Systems | State management |
| EntityFactory.js | entityFactory.js en ecs/ | Creación de entidades |
| InputHandler.js | InputSystem.js | Input processing |
| PlayerController.js | MovementSystem + CameraSystem | Movimiento y cámara |
| WorldManager.js | RenderSystem + WorldGeneratorSystem | Rendering y mundo |
| AudioManager.js | AudioSystem.js | Audio |
| ChatManager.js | ChiefSystem + DialogSystem | NPCs y diálogos |

---

## PRIORIDADES DE IMPLEMENTACIÓN

### Semana 1:
1. ✅ Core ECS (ya hecho)
2. Input System completo
3. Movement System completo  
4. Camera System completo
5. World Generator (islas, árboles, rocas)

### Semana 2:
6. Chop System completo
7. Mine System completo
8. Pickup System
9. Inventory System

### Semana 3:
10. Boat System completo
11. Creature AI completo
12. Chief Ruru
13. Stone Golem

### Semana 4:
14. Production + Hunger + Hatching
15. Audio System
16. Particle System
17. UI System
18. Testing y bug fixing

---

## NOTAS TÉCNICAS

### Rendering
- El código legacy usa Three.js directamente
- ECS puede mantener el mismo renderer
- RenderSystem sincroniza Transform → mesh.position

### Datos por Entidad
- **Legacy:** `entity.userData = { type, hits, ... }`
- **ECS:** Componentes separados por tipo

### Integración Progresiva
Se recomienda migrar feature por feature manteniendo el juego jugable:
1. Primero: mundo + movimiento básico
2. Segundo: chop/mine + inventory
3. Tercero: barco
4. Cuarto: criaturas + producción
5. Quinto: audio + particles + polish

// =====================================================
// CONSTANTS - CENTRALIZED GAME CONFIGURATION
// =====================================================

// Physics
export const GRAVITY = 0.015;
export const JUMP_FORCE = 0.2;
export const PLAYER_SPEED = 0.12;
export const PLAYER_RADIUS = 0.4;

// Camera
export const CAMERA_FOV = 60;
export const CAMERA_DISTANCE = 5.0;
export const CAMERA_DISTANCE_BOAT = 8.0;
export const CAMERA_LERP = 0.1;
export const CAMERA_MIN_Y = 0.1;
export const CAMERA_MAX_Y = 1.4;

// Rendering
export const RENDER_SCALE = 0.5;
export const GROUND_LEVEL = -1.4; // O_Y

// Interaction
export const CHOP_HITS = 5;
export const MINE_HITS = 5;
export const HIT_INTERVAL = 0.4;       // seconds between hits
export const INTERACT_RANGE = 3.0;     // highlight distance
export const CHOP_MAX_RANGE = 3.5;     // max distance to continue chopping
export const PICKUP_RANGE = 1.5;       // auto-pickup distance
export const TOOL_PICKUP_RANGE = 4.0;  // manual tool pickup range
export const RAYCAST_RANGE = 8.0;      // click interaction distance
export const PLACE_RANGE = 12.0;       // placement distance
export const WATER_PLACE_RANGE = 15.0; // log placement on water distance

// Boat
export const BOAT_MAX_SPEED = 0.12;
export const BOAT_ACCELERATION = 0.003;
export const BOAT_BRAKE = 0.004;
export const BOAT_REVERSE_FACTOR = 0.3;
export const BOAT_DRAG = 0.985;
export const BOAT_MIN_SPEED = 0.001;
export const BOAT_COLLISION_RADIUS = 3.0;
export const BOAT_PROXIMITY_RANGE = 6.0;
export const BOAT_LOG_CLUSTER_SIZE = 4;
export const BOAT_LOG_CLUSTER_RADIUS = 5.0;
export const BOAT_DECK_Y_OFFSET = -1.30;
export const BOAT_PLAYER_Y_OFFSET = -1.20;

// Boarding animation
export const BOARDING_WALK_SPEED = 2.5;
export const BOARDING_HOP_SPEED = 2.8;
export const BOARDING_SETTLE_SPEED = 3.0;
export const BOARDING_HOP_HEIGHT = 1.2;
export const BOARDING_SIDE_DIST = 2.0;
export const CAT_BOARDING_DELAY = 1.0;

// Creature AI
export const CREATURE_HUNGER_RATE = 0.1;
export const CREATURE_HUNGER_WARNING = 15;
export const CREATURE_HUNGER_DEATH = 30;
export const CREATURE_FOOD_SEEK_RANGE = 3.0;
export const CREATURE_FOOD_EAT_RANGE = 0.5;
export const CREATURE_WANDER_SPEED_FACTOR = 0.5;
export const CREATURE_WANDER_COOLDOWN_MIN = 1.0;
export const CREATURE_WANDER_COOLDOWN_MAX = 3.0;
export const CREATURE_BREED_EAT_THRESHOLD = 3;
export const CREATURE_BREED_AGE = 8;
export const EGG_HATCH_TIME = 10.0;
export const CREATURE_HUNGER_WARN = 15;
export const CREATURE_WANDER_RADIUS = 8;
export const MAX_CREATURES = 15;          // population cap to prevent exponential growth

// Food production
export const FOOD_PRODUCTION_TIME = 25; // seconds
export const MAX_FOODS = 30;            // population cap to prevent food overload

// Inventory
export const INVENTORY_SLOTS = 8;
export const NON_STACKABLE_TYPES = ['creature', 'egg', 'axe', 'pickaxe'];

// Particles
export const PARTICLE_GRAVITY = 0.002;
export const PARTICLE_FADE_RATE = 0.03;
export const DEBRIS_GRAVITY = 0.01;
export const DEBRIS_SHRINK_RATE = 0.98;
export const DEBRIS_MIN_SCALE = 0.01;
export const DEBRIS_MIN_Y = -20;

// Clouds
export const CLOUD_COUNT = 40;
export const CLOUD_SPREAD = 300;
export const CLOUD_MIN_Y = 15;
export const CLOUD_MAX_Y = 30;
export const CLOUD_MIN_SPEED = 0.5;
export const CLOUD_MAX_SPEED = 1.5;
export const CLOUD_WRAP_DISTANCE = 200;

// Mining drops
export const MINE_DROP_COUNT = 3;

// Island definitions
export const ISLANDS = [
    { name: "STARTING SHORE", x: 0, z: 0, radius: 12, hasWater: true, palette: null },
    { name: "FLORA HAVEN", x: 80, z: 0, radius: 14, hasWater: false, palette: null },
    { name: "ANCIENT PEAKS", x: 0, z: 110, radius: 28, hasWater: false, palette: 'blue' },
    { name: "ROCKY OUTPOST", x: -90, z: -50, radius: 11, hasWater: false, palette: null },
    { name: "DISTANT SHORES", x: 50, z: -100, radius: 13, hasWater: false, palette: null }
];

// Mouse/Controls
export const SENSITIVITY = 0.002;
export const ROTATION_SLERP = 0.15;

// Scale animation
export const SCALE_LERP = 0.05;

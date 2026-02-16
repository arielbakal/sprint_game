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
export const BOAT_MAX_SPEED = 0.12; // Legacy, kept for reference
export const BOAT_ACCELERATION = 0.003; // Legacy
export const BOAT_BRAKE = 0.004; // Legacy
export const BOAT_REVERSE_FACTOR = 0.3;
export const BOAT_DRAG = 0.985;
export const BOAT_MIN_SPEED = 0.001;
export const BOAT_COLLISION_RADIUS = 3.0;
export const BOAT_PROXIMITY_RANGE = 6.0;
export const BOAT_LOG_CLUSTER_SIZE = 4;
export const BOAT_LOG_CLUSTER_RADIUS = 5.0;
export const BOAT_DECK_Y_OFFSET = -1.30;
export const BOAT_PLAYER_Y_OFFSET = -1.20;

// Boat Base Stats (Dynamic System)
export const BOAT_BASE_HEALTH = 100;
export const BOAT_BASE_MAX_SPEED = 0.12;
export const BOAT_BASE_ACCELERATION = 0.003;
export const BOAT_BASE_TURN_SPEED = 0.02;
export const BOAT_BASE_DRAG = 0.985;
export const BOAT_BASE_BRAKE = 0.004;

export const BOAT_CLASSES = {
    STANDARD: {
        weight: 0.40,
        name: "Standard",
        color: 0x8B4513, // SaddleBrown
        healthMod: 1.0,
        speedMod: 1.0,
        accelMod: 1.0,
        turnMod: 1.0
    },
    SPEEDSTER: {
        weight: 0.15,
        name: "Speedster",
        color: 0xD32F2F, // Red
        healthMod: 0.7,
        speedMod: 2,
        accelMod: 2.4,
        turnMod: 0.8
    },
    TANK: {
        weight: 0.15,
        name: "Ironhull",
        color: 0x546E7A, // BlueGrey
        healthMod: 2.0,
        speedMod: 0.8,
        accelMod: 0.6,
        turnMod: 0.6
    },
    AGILE: {
        weight: 0.15,
        name: "Hydro",
        color: 0x039BE5, // LightBlue
        healthMod: 0.8,
        speedMod: 1.1,
        accelMod: 1.3,
        turnMod: 1.5
    },
    RUSTY: {
        weight: 0.15,
        name: "Old Rusty",
        color: 0x6D4C41, // Brown500 (Desaturated)
        healthMod: 0.6,
        speedMod: 0.8,
        accelMod: 0.7,
        turnMod: 0.9
    }
};

// Boat Durability
export const BOAT_COLLISION_DAMAGE_MIN = 5;
export const BOAT_COLLISION_DAMAGE_MAX = 25;
export const BOAT_WEAR_PER_SECOND = 0.2; // 1% every 5 seconds of full speed
export const BOAT_CRITICAL_THRESHOLD = 30; // 30% health = smoke
export const BOAT_BROKEN_SPEED_FACTOR = 0.2; // 20% max speed when broken

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

// Player combat
export const PLAYER_MAX_HP = 20;
export const PLAYER_BASE_ATTACK = 2;
export const ATTACK_COOLDOWN = 0.4;
export const ATTACK_RANGE = 3.5;
export const ATTACK_ARC = Math.PI * 0.8;

// Creature combat
export const CREATURE_HP = 6;
export const CREATURE_CONTACT_DAMAGE = 2;
export const CREATURE_CONTACT_COOLDOWN = 1.0;
export const CREATURE_AGGRO_DURATION = 5.0;

// Death / respawn
export const RESPAWN_INVINCIBILITY = 3.0;

// Stat boosts
export const STAT_BOOST_PICKUP_RANGE = 2.0;
export const STAT_BOOST_BOB_SPEED = 3.0;
export const STAT_BOOST_BOB_HEIGHT = 0.3;
export const STAT_BOOST_SPIN_SPEED = 2.0;

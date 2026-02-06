// =====================================================
// GAME STATE CLASS
// =====================================================

export default class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.phase = 'loading';
        this.palette = null;
        this.worldDNA = null;
        this.inventory = new Array(8).fill(null);
        this.selectedSlot = null;
        this.entities = [];
        this.foods = [];
        this.particles = [];
        this.debris = [];
        this.obstacles = [];

        this.musicStarted = false;

        // Player (third-person)
        this.player = {
            pos: new THREE.Vector3(0, 0, 0),
            vel: new THREE.Vector3(0, 0, 0),
            speed: 0.12,
            onGround: false,
            targetRotation: 0,
            cameraAngle: { x: 0, y: 0.3 }, // x = horizontal orbit, y = vertical orbit
            cameraMode: 'third', // 'third' or 'first'
        };
        this.inputs = { w: false, a: false, s: false, d: false, space: false };
        this.sensitivity = 0.002;

        // Multi-island data (populated by GameEngine)
        this.islands = [];

        // Resources
        this.resources = { logs: 0 };

        // Interaction
        this.interactionTarget = null;    // entity currently highlighted
        this.chopProgress = 0;            // hits on current tree (0-5)
        this.isChopping = false;          // holding click on tree
        this.chopTimer = 0;              // time since last chop hit
        this.lastInteractTime = 0;

        // Mouse
        this.mouseX = 0;
        this.mouseY = 0;

        // Boat navigation
        this.isOnBoat = false;
        this.activeBoat = null;
        this.boatSpeed = 0;
        this.boatMaxSpeed = 0.12;
        this.boatRotation = 0;
    }
}

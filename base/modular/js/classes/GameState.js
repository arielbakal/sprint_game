// =====================================================
// POCKET TERRARIUM - GAME STATE CLASS
// =====================================================

export default class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.gameMode = 'creator';
        this.sensitivity = 0.04;
        this.fov = 60;
        this.phase = 'essence';
        this.palette = null;
        this.worldDNA = null;
        this.inventory = new Array(8).fill(null);
        this.selectedSlot = null;
        this.entities = [];
        this.foods = [];
        this.particles = [];
        this.debris = [];
        this.ambientParticles = [];
        this.obstacles = [];
        this.interaction = { mode: 'idle', heldEntity: null, pressTime: 0, startPos: new THREE.Vector2(), isZooming: false };
        this.mouseX = 0;
        this.mouseY = 0;
        this.camAngle = 0;
        this.camRadius = 13;
        this.zoomStart = 0;
        this.hoveredSphere = null;
        this.selectedEssence = null;
        this.selectionProgress = 0;
        this.musicStarted = false;
        this.player = {
            pos: new THREE.Vector3(0, 0, 0),
            vel: new THREE.Vector3(0, 0, 0),
            speed: 0.08,
            yaw: 0, pitch: 0,
            targetYaw: 0, targetPitch: 0,
            canJump: false
        };
        this.inputs = { w: false, a: false, s: false, d: false, space: false };
        this.lastInteractTime = 0;
    }
}

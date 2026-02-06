// =====================================================
// POCKET TERRARIUM - WORLD MANAGER CLASS
// =====================================================

export default class WorldManager {
    constructor(renderScale) {
        this.renderScale = renderScale;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth * renderScale, window.innerHeight * renderScale, false);
        this.renderer.domElement.style.imageRendering = 'pixelated';
        document.body.appendChild(this.renderer.domElement);
        this.scene.background = new THREE.Color(0x050510);
        this.setupLighting();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);
    }

    add(obj) { this.scene.add(obj); }
    remove(obj) { this.scene.remove(obj); }
    render() { this.renderer.render(this.scene, this.camera); }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth * this.renderScale, window.innerHeight * this.renderScale, false);
    }

    getMat(color, flat = true) {
        return new THREE.MeshToonMaterial({ color: color, flatShading: flat });
    }
}

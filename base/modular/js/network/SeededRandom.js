// =====================================================
// SEEDED RANDOM - Deterministic PRNG (mulberry32)
// =====================================================
// Used to ensure all multiplayer clients generate
// the same world from the same seed.

export default class SeededRandom {
    /**
     * @param {number} seed - integer seed
     */
    constructor(seed) {
        this._seed = seed | 0;
    }

    /**
     * Returns a float in [0, 1) — drop-in replacement for Math.random()
     */
    next() {
        this._seed |= 0;
        this._seed = (this._seed + 0x6D2B79F5) | 0;
        let t = Math.imul(this._seed ^ (this._seed >>> 15), 1 | this._seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Temporarily replace Math.random with this seeded version.
     * Call restore() when done.
     * @returns {{ restore: Function }}
     */
    override() {
        const original = Math.random;
        const self = this;
        Math.random = () => self.next();
        return {
            restore() {
                Math.random = original;
            }
        };
    }
}

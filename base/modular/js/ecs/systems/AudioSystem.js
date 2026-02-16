export class AudioSystem {
  constructor(world) {
    this.world = world;
    this.sounds = new Map();
    this.enabled = true;
    this.volume = 0.5;
    this.musicPlaying = false;
    this.initDefaultSounds();
  }

  initDefaultSounds() {
    if (typeof window !== 'undefined') {
      this.sounds.set('chop', this.createOscillatorSound(200, 0.1));
      this.sounds.set('pickup', this.createOscillatorSound(600, 0.08));
      this.sounds.set('sail', this.createOscillatorSound(100, 0.3));
      this.sounds.set('treeFall', this.createOscillatorSound(80, 0.2));
    }
  }

  createOscillatorSound(freq, duration) {
    return {
      play: () => {
        if (!this.enabled || typeof window === 'undefined') return;
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + duration);
        } catch (e) {}
      }
    };
  }

  startMusic() {
    if (this.musicPlaying || typeof window === 'undefined') return;
    
    try {
      this.musicContext = new (window.AudioContext || window.webkitAudioContext)();
      this.playMusicLoop();
      this.musicPlaying = true;
    } catch (e) {
      console.log('Music not supported');
    }
  }

  playMusicLoop() {
    if (!this.musicPlaying || !this.musicContext) return;
    
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    const note = notes[Math.floor(Math.random() * notes.length)];
    
    const osc = this.musicContext.createOscillator();
    const gain = this.musicContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = note;
    
    osc.connect(gain);
    gain.connect(this.musicContext.destination);
    
    const now = this.musicContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.1, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 1);
    
    setTimeout(() => this.playMusicLoop(), 300 + Math.random() * 700);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicContext) {
      this.musicContext.close();
      this.musicContext = null;
    }
  }

  update(deltaTime) {
  }

  registerSound(name, audioElement) {
    this.sounds.set(name, audioElement);
  }

  playSound(name, volume = 1.0) {
    if (!this.enabled) return;

    const sound = this.sounds.get(name);
    if (sound && sound.play) {
      sound.volume = volume * this.volume;
      sound.play();
    }
  }

  playChop() { this.playSound('chop'); }
  playPickup() { this.playSound('pickup'); }
  playSail() { this.playSound('sail'); }
  playTreeFall() { this.playSound('treeFall'); }

  stopSound(name) {
    const sound = this.sounds.get(name);
    if (sound && sound.pause) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
}

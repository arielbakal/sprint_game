# Audio System

## AudioManager

**Location**: `base/modular/js/classes/AudioManager.js`

The `AudioManager` handles all audio in the game using the Web Audio API. It provides:
- **Sound effects** synthesized in real-time using oscillators
- **Background music** using the BeepBox generative music library

---

## Architecture

### AudioContext

```javascript
constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.synth = null;         // BeepBox synth instance
    this.isMuted = false;
    this.MASTER_GAIN_CAP = 0.2;  // Max volume cap
}
```

### Resume Policy

Web Audio requires user interaction to start. The `resume()` method handles this:

```javascript
resume() { 
    if (this.ctx.state === 'suspended') this.ctx.resume(); 
}
```

Called at the start of every sound method.

---

## Sound Effect Synthesis

### chirp() - Base Sound Generator

All sound effects use the `chirp()` method, which creates an oscillator with a frequency sweep:

```javascript
chirp(f1, f2, dur, vol = 0.1) {
    this.resume();
    
    // Create oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Frequency sweep (f1 → f2 over duration)
    osc.frequency.setValueAtTime(f1, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(f2, this.ctx.currentTime + dur);
    
    // Volume envelope
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + dur * 0.1);  // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur); // Decay
    
    osc.start();
    osc.stop(now + dur);
}
```

### Sound Library

| Method | Description | Frequency Sweep | Duration | Volume |
|--------|-------------|-----------------|----------|--------|
| `select()` | UI selection | 600 → 900 Hz | 0.15s | 0.05 |
| `pickup()` | Item pickup | 300 → 500 Hz | 0.2s | 0.1 |
| `place()` | Item placement | 500 → 300 Hz | 0.2s | 0.1 |
| `pop()` | Error/denied | 800 → 1000 Hz | 0.1s | 0.05 |
| `chop()` | Tree/rock hit | 400 → 200 Hz | 0.08s | 0.12 |
| `treeFall()` | Tree falling | 300 → 80 Hz | 0.4s | 0.15 |
| `sail()` | Boat depart | 200→350Hz, 350→500Hz | 0.3s + 0.2s | 0.08 |
| `boatBuild()` | Boat assembled | 300→600→800→1000Hz | 0.3s | 0.1 |
| `eat()` | Creature eating | 400→500Hz × 2 | 0.08s × 2 | 0.05 |
| `hungry()` | Creature hungry | 500→400, 420→350 | 0.4s | 0.08 |
| `sing()` | NPC interaction | 600→800→1000→700 | 0.2s | 0.05 |
| `layEgg()` | Egg laid | 400 → 200 Hz | 0.15s | 0.1 |
| `die()` | Creature death | 300 → 100 Hz | 0.6s | 0.1 |

### Multi-Note Sounds

Some sounds use multiple oscillators with delays:

```javascript
sail() {
    this.chirp(200, 350, 0.3, 0.08);
    setTimeout(() => this.chirp(350, 500, 0.2, 0.06), 200);
}

eat() {
    this.chirp(400, 500, 0.08, 0.05);
    setTimeout(() => this.chirp(400, 500, 0.08, 0.05), 120);
}

boatBuild() {
    this.chirp(300, 600, 0.3, 0.1);
    setTimeout(() => this.chirp(600, 800, 0.15, 0.08), 200);
    setTimeout(() => this.chirp(800, 1000, 0.1, 0.06), 400);
}
```

---

## Special Sounds

### pet() - LFO Modulated

Creates a wobbling sound using a low-frequency oscillator:

```javascript
pet() {
    this.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    
    // LFO modulates frequency
    lfo.frequency.value = 25;  // 25 Hz wobble
    lfoGain.gain.value = 30;   // ±30 Hz deviation
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    osc.type = 'triangle';
    osc.frequency.value = 200;
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.start(); lfo.start();
    osc.stop(now + 0.5);
    lfo.stop(now + 0.5);
}
```

### explode() - Noise + Filter

Creates an explosion sound using filtered noise:

```javascript
explode() {
    this.resume();
    
    // Create noise buffer
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    
    // Lowpass filter with frequency sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
    noise.stop(now + 0.5);
}
```

---

## Background Music - BeepBox

### Initialization

```javascript
startMusic(worldDNA, volSlider, volIcon, settingsBtn, settingsPopup, sfx) {
    // Calculate initial volume
    const targetVol = (parseFloat(volSlider.value) / 100) * this.MASTER_GAIN_CAP;
    
    if (!this.synth) {
        // Check if BeepBox is loaded
        if (typeof beepbox === 'undefined') return;
        
        const { Synth } = beepbox;
        
        // Create synth with song hash
        this.synth = new Synth(this.songHash);
        
        // Volume slider listener
        volSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (this.synth) {
                this.synth.volume = (val / 100) * this.MASTER_GAIN_CAP;
            }
            volIcon.innerText = val <= 0 ? "🔇" : "🔊";
            this.isMuted = val <= 0;
        });
        
        // Mute toggle
        volIcon.addEventListener('click', () => {
            if (this.isMuted) {
                volSlider.value = this.previousSliderVal || 50;
                this.synth.volume = (parseFloat(volSlider.value) / 100) * this.MASTER_GAIN_CAP;
                volIcon.innerText = "🔊";
                this.isMuted = false;
            } else {
                this.previousSliderVal = parseFloat(volSlider.value) || 50;
                volSlider.value = 0;
                this.synth.volume = 0;
                volIcon.innerText = "🔇";
                this.isMuted = true;
            }
        });
        
        // Settings popup toggle
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsPopup.classList.toggle('open');
            sfx.select();
        });
        
        // Close popup on outside click
        window.addEventListener('click', (e) => {
            if (settingsPopup.classList.contains('open') && 
                !settingsPopup.contains(e.target) && 
                e.target !== settingsBtn) {
                settingsPopup.classList.remove('open');
            }
        });
        
        this.synth.volume = targetVol;
        this.synth.play();
    } else {
        // Resume if suspended
        if (this.synth.audioContext && 
            this.synth.audioContext.state === 'suspended') {
            this.synth.audioContext.resume();
        }
        this.synth.volume = targetVol;
        this.synth.play();
    }
    
    // Randomize instrument for this world
    this.randomize(worldDNA);
}
```

### Song Hash

The `songHash` is a BeepBox song encoded as a string:
```javascript
this.songHash = "#9n31s0k0l00e0ct2ma7g0fj07r1i0o432T7v1u07f30p12k12b2q0z10v631d07HW0oc054R081000h0IbE1b9T0v2u00f11a8q1w10u84cd09w4h8E1bdT1v3u01f20e0269q00d0aAbF7B5Q0205P5aa0E177T3v2u03f10beq30a21d04SJzqiiih9999iijsE186b0ic1848ic0014j000h8g014h0g4100004h4x410g400p21-IR_0qGSrzYsddvYPnWqtLmrb_j4ttAv7snTdQ_MwqjHZdJ2OY2CzMh70At97khQAth7ipuwhQAt97khRDdPLWOewOMkTB_EL0jzQOBBcwkTBdhjkblheDFaqiCwQg0";
```

### Randomization

Each world gets a slightly different music style:

```javascript
randomize(dna) {
    if (!this.synth || !this.synth.song) return;
    
    const channel = this.synth.song.channels[1];
    const instrument = channel.instruments[0];
    
    instrument.type = 0;                    // Always chip
    instrument.chipWave = Math.floor(Math.random() * 9);   // 0-8: different waveforms
    instrument.unison = Math.floor(Math.random() * 4);     // 0-3: unison voices
    instrument.transition = Math.floor(Math.random() * 4); // 0-3: transition types
    
    // Add punch variation
    if (instrument.envelopes.length > 0) {
        instrument.envelopes[0].punch = Math.floor(Math.random() * 4) * 20;
    }
    
    instrument.volume = 0;
    this.synth.setSong(this.synth.song);
}
```

---

## Volume Control

### Constants

```javascript
MASTER_GAIN_CAP = 0.2;  // Max 20% volume to prevent clipping
```

### Fade Out

```javascript
fadeOut() { 
    if (this.synth) this.synth.volume = 0; 
}
```

Called during world reset to fade music out.

---

## Integration Points

### GameEngine Start

```javascript
// In initGame()
if (!this.state.musicStarted) {
    this.audio.startMusic(
        this.state.worldDNA,
        this.ui.volSlider,
        this.ui.volIcon,
        this.ui.settingsBtn,
        this.ui.settingsPopup,
        this.audio
    );
    this.state.musicStarted = true;
}
```

### Reset World

```javascript
// In resetWorld()
this.audio.fadeOut();
```

---

## Extending Audio

### Adding New Sound

To add a new sound effect, add a method to `AudioManager`:

```javascript
newSound() {
    this.chirp(frequencyStart, frequencyEnd, duration, volume);
}
```

### Adding New Instrument

To use a different waveform or effect, modify the `chirp()` method or create a new base method:

```javascript
newEffect() {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';  // Different waveform
    
    // ... rest of synthesis
}
```

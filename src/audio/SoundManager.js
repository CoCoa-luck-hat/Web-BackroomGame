/**
 * Procedural 3D Web Audio Synthesizer for The Backrooms Experience
 * 100% self-contained — generates all sounds (fluorescent hum, footsteps, 
 * monster shrieks, heartbeat, tape hiss, and no-clip warp) without external audio assets.
 */

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Master gains
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;

    // Continuous audio nodes
    this.neonOsc1 = null;
    this.neonOsc2 = null;
    this.neonGain = null;
    this.tapeNoiseNode = null;
    this.tapeGain = null;

    // Heartbeat state
    this.heartbeatTimer = null;
    this.heartbeatBpm = 65;
    this.isHeartbeatActive = false;

    // Monster 3D audio
    this.monsterPanner = null;
    this.monsterGain = null;
    this.monsterScreechGain = null;
    this.monsterNextRoarTime = 0;

    // Static tape noise (increases with threat)
    this.staticGlitchGain = null;

    // Dead-Air Hum & Tape Hiss for Death Screen
    this.deadAirGain = null;
    this.deadAirOsc1 = null;
    this.deadAirOsc2 = null;
  }

  /**
   * Initialize AudioContext upon user gesture (Play Tape button)
   */
  async init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Ambient bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Setup continuous background sounds
      this.setupFluorescentHum();
      this.setupTapeHiss();
      this.setupMonsterAudio();

      this.isInitialized = true;
      this.startHeartbeat();
    } catch (err) {
      console.warn('AudioContext initialization prevented:', err);
    }
  }

  /**
   * Continuous 60Hz Fluorescent Lamp Buzz with realistic harmonics & flickering
   */
  setupFluorescentHum() {
    if (!this.ctx) return;

    // Fundamental 60Hz
    this.neonOsc1 = this.ctx.createOscillator();
    this.neonOsc1.type = 'sawtooth';
    this.neonOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);

    // 120Hz & 180Hz harmonic
    this.neonOsc2 = this.ctx.createOscillator();
    this.neonOsc2.type = 'sine';
    this.neonOsc2.frequency.setValueAtTime(120, this.ctx.currentTime);

    // Bandpass filter centered around 120-240Hz
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.neonGain = this.ctx.createGain();
    this.neonGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.neonOsc1.connect(filter);
    this.neonOsc2.connect(filter);
    filter.connect(this.neonGain);
    this.neonGain.connect(this.ambientGain);

    this.neonOsc1.start();
    this.neonOsc2.start();

    // Random voltage fluctuation (neon light buzz variation)
    setInterval(() => {
      if (this.neonGain && this.ctx && !this.isMuted) {
        const microJitter = 0.06 + Math.random() * 0.05;
        this.neonGain.gain.setTargetAtTime(microJitter, this.ctx.currentTime, 0.1);
      }
    }, 400);
  }

  /**
   * 90s VHS Tape Motor and Analog Hiss
   */
  setupTapeHiss() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Highpass to keep it as airy tape hiss
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);

    this.tapeGain = this.ctx.createGain();
    this.tapeGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    // Static glitch gain for proximity to monster/no-clip
    this.staticGlitchGain = this.ctx.createGain();
    this.staticGlitchGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    whiteNoise.connect(hpFilter);
    hpFilter.connect(this.tapeGain);
    this.tapeGain.connect(this.ambientGain);

    // Glitch static goes directly to master with distortion
    hpFilter.connect(this.staticGlitchGain);
    this.staticGlitchGain.connect(this.masterGain);

    whiteNoise.start();
  }

  /**
   * Positional 3D Audio for The Bacteria Entity
   */
  setupMonsterAudio() {
    if (!this.ctx) return;

    this.monsterPanner = this.ctx.createPanner();
    this.monsterPanner.panningModel = 'HRTF';
    this.monsterPanner.distanceModel = 'exponential';
    this.monsterPanner.refDistance = 2;
    this.monsterPanner.maxDistance = 35;
    this.monsterPanner.rolloffFactor = 1.2;

    this.monsterGain = this.ctx.createGain();
    this.monsterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

    this.monsterPanner.connect(this.monsterGain);
    this.monsterGain.connect(this.sfxGain);
  }

  /**
   * Update listener position for 3D spatial audio
   */
  updateListener(camera) {
    if (!this.ctx || !this.ctx.listener) return;

    const p = camera.position;
    const l = this.ctx.listener;

    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, this.ctx.currentTime, 0.05);
      l.positionY.setTargetAtTime(p.y, this.ctx.currentTime, 0.05);
      l.positionZ.setTargetAtTime(p.z, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Update Bacteria 3D Sound Position & Proximity Static
   */
  updateMonsterPosition(x, y, z, distanceToPlayer, isChasing) {
    if (!this.ctx || !this.monsterPanner) return;

    if (this.monsterPanner.positionX) {
      this.monsterPanner.positionX.setTargetAtTime(x, this.ctx.currentTime, 0.05);
      this.monsterPanner.positionY.setTargetAtTime(y, this.ctx.currentTime, 0.05);
      this.monsterPanner.positionZ.setTargetAtTime(z, this.ctx.currentTime, 0.05);
    }

    // Static glitch sound scales with monster closeness
    if (this.staticGlitchGain) {
      if (distanceToPlayer < 20) {
        const proximityIntensity = Math.max(0, (20 - distanceToPlayer) / 20);
        const staticVol = Math.pow(proximityIntensity, 1.5) * (isChasing ? 0.35 : 0.15);
        this.staticGlitchGain.gain.setTargetAtTime(staticVol, this.ctx.currentTime, 0.05);
      } else {
        this.staticGlitchGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }

    // Heartbeat BPM scales with threat
    if (isChasing) {
      this.heartbeatBpm = 135;
    } else if (distanceToPlayer < 12) {
      this.heartbeatBpm = 95;
    } else {
      this.heartbeatBpm = 65;
    }

    // Periodic eerie shriek
    const now = performance.now();
    if (now > this.monsterNextRoarTime && distanceToPlayer < 25) {
      this.playMonsterShriek(isChasing);
      this.monsterNextRoarTime = now + (isChasing ? 3500 + Math.random() * 2000 : 7000 + Math.random() * 6000);
    }
  }

  /**
   * Synthesize creepy metallic / cable shriek for The Bacteria
   */
  playMonsterShriek(isAggressive = false) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const shriekGain = this.ctx.createGain();

    osc.type = isAggressive ? 'sawtooth' : 'triangle';
    const baseFreq = isAggressive ? 450 + Math.random() * 200 : 250 + Math.random() * 100;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, this.ctx.currentTime + 1.2);

    // Frequency modulation for warped distorted scream
    modOsc.type = 'sawtooth';
    modOsc.frequency.setValueAtTime(isAggressive ? 48 : 24, this.ctx.currentTime);
    modGain.gain.setValueAtTime(160, this.ctx.currentTime);
    modOsc.connect(osc.frequency);

    shriekGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    shriekGain.gain.exponentialRampToValueAtTime(isAggressive ? 0.45 : 0.25, this.ctx.currentTime + 0.15);
    shriekGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);

    osc.connect(shriekGain);
    shriekGain.connect(this.monsterPanner);

    modOsc.start();
    osc.start();
    modOsc.stop(this.ctx.currentTime + 1.5);
    osc.stop(this.ctx.currentTime + 1.5);
  }

  /**
   * Terrifying Jumpscare & Death Scream Synthesizer
   * Inhuman piercing screech + overloaded microphone static + heavy sub-bass impact
   */
  playDeathScream() {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    // 1. Inhuman Discordant Screech (Dual Detuned Sawtooth with FM)
    const voice1 = this.ctx.createOscillator();
    const voice2 = this.ctx.createOscillator();
    const fmMod = this.ctx.createOscillator();
    const fmGain = this.ctx.createGain();
    const screamGain = this.ctx.createGain();

    voice1.type = 'sawtooth';
    voice1.frequency.setValueAtTime(820, now);
    voice1.frequency.exponentialRampToValueAtTime(320, now + 1.6);

    voice2.type = 'sawtooth';
    voice2.frequency.setValueAtTime(875, now);
    voice2.frequency.exponentialRampToValueAtTime(305, now + 1.6);

    // Violent FM Modulation (Guttural shrieking roar)
    fmMod.type = 'sawtooth';
    fmMod.frequency.setValueAtTime(65, now);
    fmMod.frequency.linearRampToValueAtTime(30, now + 1.6);
    fmGain.gain.setValueAtTime(280, now);
    fmGain.gain.exponentialRampToValueAtTime(10, now + 1.6);

    fmMod.connect(fmGain);
    fmGain.connect(voice1.frequency);
    fmGain.connect(voice2.frequency);

    screamGain.gain.setValueAtTime(0.01, now);
    screamGain.gain.linearRampToValueAtTime(0.75, now + 0.04);
    screamGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);

    voice1.connect(screamGain);
    voice2.connect(screamGain);
    screamGain.connect(this.masterGain);

    fmMod.start(now);
    voice1.start(now);
    voice2.start(now);
    fmMod.stop(now + 1.8);
    voice1.stop(now + 1.8);
    voice2.stop(now + 1.8);

    // 2. Heavy Sub-bass Jump Impact (Heart shock)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

    subGain.gain.setValueAtTime(0.85, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + 0.95);

    // 3. Audio Overload / Harsh Static Screamer Burst
    const bufferSize = this.ctx.sampleRate * 1.5;
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.Q.setValueAtTime(2.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSrc.start(now);
    noiseSrc.stop(now + 1.5);
  }

  /**
   * Retro VCR Tactile Button Click Synthesizer
   * Mechanical spring latch + low deck clunk
   */
  playVcrButtonClick() {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    // 1. High plastic mechanical click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    const clickFilter = this.ctx.createBiquadFilter();

    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(1900, now);
    clickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(2200, now);
    clickFilter.Q.setValueAtTime(3.0, now);

    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickOsc.start(now);
    clickOsc.stop(now + 0.035);

    // 2. Low mechanical chassis thud
    const thudOsc = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();

    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(110, now);
    thudOsc.frequency.exponentialRampToValueAtTime(45, now + 0.05);

    thudGain.gain.setValueAtTime(0.4, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    thudOsc.connect(thudGain);
    thudGain.connect(this.masterGain);

    thudOsc.start(now);
    thudOsc.stop(now + 0.065);
  }

  /**
   * Footstep synthesizer (Carpet vs Pool water)
   */
  playFootstep(surface = 'carpet', isSprinting = false) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (surface === 'carpet') {
      // Dull muffled thud on damp carpet
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65 + Math.random() * 15, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.1);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      const vol = isSprinting ? 0.28 : 0.16;
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    } else {
      // Poolrooms: Wet splash & slap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280 + Math.random() * 60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.24, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.24);
    }
  }

  /**
   * Flashlight click toggle sound
   */
  playFlashlightClick(stateOn) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(stateOn ? 1200 : 900, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  /**
   * No-Clip reality warp sound (Screen tear & whoosh)
   */
  playNoClipWarp() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    osc.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 1.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2800, this.ctx.currentTime + 0.4);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.8);

    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 2.1);
  }

  /**
   * Tape Rewind Sound (Fast high-pitched screech and motor whir)
   */
  playTapeRewind() {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(3200, this.ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 2.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 2.6);
  }

  /**
   * Dynamic Sub-bass Heartbeat Loop
   */
  startHeartbeat() {
    if (this.isHeartbeatActive) return;
    this.isHeartbeatActive = true;

    const triggerHeartbeat = () => {
      if (!this.ctx || this.isMuted || !this.isHeartbeatActive) {
        this.heartbeatTimer = setTimeout(triggerHeartbeat, 1000);
        return;
      }

      // Lub
      this.pulseHeartbeat(55, 0.18, 0.12);
      // Dub
      setTimeout(() => {
        this.pulseHeartbeat(45, 0.14, 0.14);
      }, 160);

      const intervalMs = (60 / this.heartbeatBpm) * 1000;
      this.heartbeatTimer = setTimeout(triggerHeartbeat, intervalMs);
    };

    triggerHeartbeat();
  }

  pulseHeartbeat(freq, gainVal, duration) {
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  /**
   * Switch environment sound profile (Level 0 vs Poolrooms)
   */
  setEnvironment(levelName) {
    if (!this.ctx) return;

    if (levelName === 'poolrooms') {
      // Quieter neon hum, add soft serene water ambient tone
      if (this.neonGain) {
        this.neonGain.gain.setTargetAtTime(0.015, this.ctx.currentTime, 1.0);
      }
      this.heartbeatBpm = 58;
    } else {
      // Level 0: full neon hum
      if (this.neonGain) {
        this.neonGain.gain.setTargetAtTime(0.08, this.ctx.currentTime, 0.5);
      }
    }
  }

  /**
   * Fade or set fluorescent lamp hum volume
   */
  setFluorescentHumVolume(vol, rampTime = 0.5) {
    if (!this.ctx || !this.neonGain) return;
    this.neonGain.gain.setTargetAtTime(vol, this.ctx.currentTime, rampTime);
  }

  /**
   * Real-World Hard Tile / Concrete Footstep
   */
  playTileFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Crisp high impact click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1600, now);
    clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    clickOsc.connect(clickGain);
    clickGain.connect(this.sfxGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.06);

    // Tile resonance tap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.07);
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noiseSource.start(now);
  }

  /**
   * No-Clip Dimensional Reality Tear & Glitch Arc
   */
  playNoClipTear() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Violent Electric Arc Crackle (FM Sawtooth)
    const arcOsc = this.ctx.createOscillator();
    const arcMod = this.ctx.createOscillator();
    const arcModGain = this.ctx.createGain();
    const arcGain = this.ctx.createGain();

    arcOsc.type = 'sawtooth';
    arcOsc.frequency.setValueAtTime(950, now);
    arcOsc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    arcMod.type = 'square';
    arcMod.frequency.setValueAtTime(110, now);
    arcModGain.gain.setValueAtTime(450, now);
    arcMod.connect(arcModGain);
    arcModGain.connect(arcOsc.frequency);

    arcGain.gain.setValueAtTime(0.01, now);
    arcGain.gain.linearRampToValueAtTime(0.55, now + 0.04);
    arcGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    arcOsc.connect(arcGain);
    arcGain.connect(this.sfxGain);

    arcMod.start(now);
    arcOsc.start(now);
    arcMod.stop(now + 0.65);
    arcOsc.stop(now + 0.65);

    // 2. Heavy Sub-Bass Dimensional Drop
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 1.1);

    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.25);
  }

  /**
   * Freefall Rushing Wind
   */
  playFreeFallWind(duration = 1.3) {
    if (!this.ctx || this.isMuted) return null;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + duration * 0.8);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.65, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    source.start(now);
    return source;
  }

  /**
   * Brutal Carpet Impact & Camcorder Microphone Crunch
   */
  playCarpetCrash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // 1. Massive Sub-bass Floor Thud
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(95, now);
    thud.frequency.exponentialRampToValueAtTime(22, now + 0.55);

    thudGain.gain.setValueAtTime(0.9, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    thud.connect(thudGain);
    thudGain.connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.65);

    // 2. Moist Carpet Dead Weight Muffle
    const carpetBufSize = Math.floor(this.ctx.sampleRate * 0.35);
    const carpetBuf = this.ctx.createBuffer(1, carpetBufSize, this.ctx.sampleRate);
    const carpetOut = carpetBuf.getChannelData(0);
    for (let i = 0; i < carpetBufSize; i++) {
      carpetOut[i] = (Math.random() * 2 - 1) * Math.exp(-i / (carpetBufSize * 0.2));
    }
    const carpetSource = this.ctx.createBufferSource();
    carpetSource.buffer = carpetBuf;

    const carpetFilter = this.ctx.createBiquadFilter();
    carpetFilter.type = 'lowpass';
    carpetFilter.frequency.setValueAtTime(320, now);

    const carpetGain = this.ctx.createGain();
    carpetGain.gain.setValueAtTime(0.8, now);
    carpetGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    carpetSource.connect(carpetFilter);
    carpetFilter.connect(carpetGain);
    carpetGain.connect(this.sfxGain);
    carpetSource.start(now);

    // 3. Camcorder Plastic Clatter & Mic Clipping Spike
    const micBufSize = Math.floor(this.ctx.sampleRate * 0.08);
    const micBuf = this.ctx.createBuffer(1, micBufSize, this.ctx.sampleRate);
    const micOut = micBuf.getChannelData(0);
    for (let i = 0; i < micBufSize; i++) {
      // Hard clipped harsh transient
      const raw = Math.random() * 2 - 1;
      micOut[i] = Math.max(-0.9, Math.min(0.9, raw * 2.5));
    }
    const micSource = this.ctx.createBufferSource();
    micSource.buffer = micBuf;

    const micGain = this.ctx.createGain();
    micGain.gain.setValueAtTime(0.55, now);
    micGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    micSource.connect(micGain);
    micGain.connect(this.masterGain);
    micSource.start(now);
  }

  /**
   * Pained Breath / Groan after impact
   */
  playPlayerPainedGasp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const breathBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = breathBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const envelope = Math.sin((i / bufferSize) * Math.PI);
      output[i] = (Math.random() * 2 - 1) * envelope;
    }
    const breathSource = this.ctx.createBufferSource();
    breathSource.buffer = breathBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(520, now);
    filter.Q.setValueAtTime(2.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    breathSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    breathSource.start(now);
  }

  /**
   * Distinct Mechanical Flashlight Click ("CLACK")
   */
  playFlashlightClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Transient 1: Contact slide
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(2400, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.02);

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.025);

    // Transient 2: Heavy mechanical latch (30ms later)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1400, now + 0.025);
    osc2.frequency.exponentialRampToValueAtTime(320, now + 0.055);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.45, now + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.025);
    osc2.stop(now + 0.065);
  }

  /**
   * Start Dead-Air Hum & Tape Hiss for Fullscreen Death Screen
   */
  startDeadAirHum() {
    if (!this.ctx || this.isMuted) return;
    this.stopDeadAirHum();

    const now = this.ctx.currentTime;
    this.deadAirGain = this.ctx.createGain();
    this.deadAirGain.gain.setValueAtTime(0.01, now);
    this.deadAirGain.gain.linearRampToValueAtTime(0.45, now + 0.8);
    this.deadAirGain.connect(this.masterGain);

    // 1. Dual detuned hollow low-drone (44Hz & 52Hz)
    this.deadAirOsc1 = this.ctx.createOscillator();
    this.deadAirOsc1.type = 'sawtooth';
    this.deadAirOsc1.frequency.setValueAtTime(44, now);

    this.deadAirOsc2 = this.ctx.createOscillator();
    this.deadAirOsc2.type = 'sine';
    this.deadAirOsc2.frequency.setValueAtTime(52, now);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(120, now);
    lowpass.Q.setValueAtTime(2.0, now);

    this.deadAirOsc1.connect(lowpass);
    this.deadAirOsc2.connect(lowpass);
    lowpass.connect(this.deadAirGain);

    this.deadAirOsc1.start(now);
    this.deadAirOsc2.start(now);
  }

  /**
   * Stop Dead-Air Hum cleanly
   */
  stopDeadAirHum() {
    if (!this.ctx || !this.deadAirGain) return;
    const now = this.ctx.currentTime;
    try {
      this.deadAirGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      const osc1 = this.deadAirOsc1;
      const osc2 = this.deadAirOsc2;
      setTimeout(() => {
        try {
          if (osc1) osc1.stop();
          if (osc2) osc2.stop();
        } catch (e) {}
      }, 350);
    } catch (e) {}
    this.deadAirGain = null;
    this.deadAirOsc1 = null;
    this.deadAirOsc2 = null;
  }

  /**
   * Toggle Mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

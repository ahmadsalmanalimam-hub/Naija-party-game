'use client';

// Lightweight Web Audio API sound synthesizer (0 external audio files = fast load & low RAM on Android 2GB)
class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private volume = 0.7;
  private musicInterval: number | null = null;
  private beatStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  public configure(opts: { sfxEnabled?: boolean; musicEnabled?: boolean; volume?: number }) {
    if (opts.sfxEnabled !== undefined) this.sfxEnabled = opts.sfxEnabled;
    if (opts.volume !== undefined) this.volume = Math.max(0, Math.min(1, opts.volume));
    if (opts.musicEnabled !== undefined) {
      this.musicEnabled = opts.musicEnabled;
      if (this.musicEnabled) {
        this.startMusicLoop();
      } else {
        this.stopMusicLoop();
      }
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainMultiplier = 0.25,
    slideTo?: number
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }

    const peak = Math.max(0.001, this.volume * gainMultiplier);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    this.playTone(540, 0.055, 'sine', 0.16, 680);
  }

  public playHop() {
    this.playTone(320, 0.09, 'triangle', 0.22, 620);
  }

  public playScore() {
    this.playTone(523.25, 0.09, 'triangle', 0.25);
    setTimeout(() => this.playTone(659.25, 0.12, 'triangle', 0.25), 65);
  }

  public playHit() {
    this.playTone(150, 0.12, 'sawtooth', 0.26, 65);
  }

  public playEliminate() {
    this.playTone(320, 0.16, 'sawtooth', 0.25, 110);
    setTimeout(() => this.playTone(160, 0.22, 'sawtooth', 0.22, 75), 110);
  }

  public playCountdownTick() {
    this.playTone(660, 0.08, 'sine', 0.22);
  }

  public playCountdownGo() {
    this.playTone(880, 0.18, 'triangle', 0.3, 1046);
  }

  public playWarning() {
    this.playTone(780, 0.09, 'square', 0.16);
  }

  public playDice() {
    this.playTone(280, 0.04, 'triangle', 0.15, 420);
    setTimeout(() => this.playTone(360, 0.04, 'triangle', 0.15, 510), 50);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.18, 'triangle', 0.26), idx * 95);
    });
  }

  public vibrate(ms: number | number[] = 18) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore on unsupported browsers
      }
    }
  }

  public startMusicLoop() {
    if (!this.musicEnabled || typeof window === 'undefined') return;
    if (this.musicInterval !== null) return;

    // Gentle Afrobeats-inspired marimba groove at ~112 BPM (eighth steps)
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const pattern = [0, -1, 2, 4, -1, 3, 2, 1, 0, -1, 4, 5, 3, -1, 2, -1];

    this.musicInterval = window.setInterval(() => {
      if (!this.musicEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;
      const idx = pattern[this.beatStep % pattern.length];
      this.beatStep += 1;
      if (idx >= 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(scale[idx], ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(0.001, this.volume * 0.055), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.17);
      }
    }, 240);
  }

  public stopMusicLoop() {
    if (this.musicInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();

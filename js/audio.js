'use strict';

/* Tiny Web Audio helper — every sound is synthesised, no assets. */
class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('reefRescue.muted') === '1'; } catch (e) { /* ignore */ }
  }

  /* Must be called from a user gesture before sounds can play. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  }

  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem('reefRescue.muted', this.muted ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  tone(freq, dur, type, vol, slideTo, delay) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) { /* never let audio break the game */ }
  }

  collect(combo) {
    const base = 480 + Math.min(combo || 1, 12) * 45;
    this.tone(base, 0.09, 'triangle', 0.16);
    this.tone(base * 1.5, 0.07, 'sine', 0.08, null, 0.03);
  }
  hurt() { this.tone(170, 0.24, 'sawtooth', 0.18, 65); }
  levelUp() {
    this.tone(523, 0.12, 'triangle', 0.16);
    this.tone(659, 0.12, 'triangle', 0.16, null, 0.11);
    this.tone(784, 0.20, 'triangle', 0.16, null, 0.22);
  }
  oxyWarn() { this.tone(880, 0.07, 'square', 0.10); }
  gameOver() {
    this.tone(440, 0.25, 'triangle', 0.16);
    this.tone(330, 0.25, 'triangle', 0.16, null, 0.22);
    this.tone(247, 0.40, 'triangle', 0.16, null, 0.44);
  }
  win() {
    this.tone(523, 0.14, 'triangle', 0.16);
    this.tone(659, 0.14, 'triangle', 0.16, null, 0.13);
    this.tone(784, 0.14, 'triangle', 0.16, null, 0.26);
    this.tone(1046, 0.30, 'triangle', 0.16, null, 0.39);
  }
  click() { this.tone(600, 0.05, 'sine', 0.08); }
}

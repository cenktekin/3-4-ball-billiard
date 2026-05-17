const Audio = (() => {
  'use strict';

  let ctx = null;
  let enabled = true;

  function init() {}

  function getCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) { enabled = false; return null; }
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(v) { enabled = v; }
  function isEnabled() { return enabled; }

  function playTone(freq, duration, type, volume, ramp) {
    const c = getCtx();
    if (!c || !enabled) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    const t = c.currentTime;
    osc.frequency.setValueAtTime(freq, t);
    if (ramp) osc.frequency.linearRampToValueAtTime(ramp, t + duration);
    gain.gain.setValueAtTime(volume || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  function playNoise(duration, volume, highpass) {
    const c = getCtx();
    if (!c || !enabled) return;
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const gain = c.createGain();
    const t = c.currentTime;
    gain.gain.setValueAtTime(volume || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    let node = gain;
    if (highpass) {
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = highpass;
      node.connect(hp);
      hp.connect(c.destination);
    } else {
      node.connect(c.destination);
    }
    src.connect(gain);
    src.start(t);
    src.stop(t + duration + 0.01);
  }

  function playBallHit(velocity) {
    const power = Math.min(1, (velocity || 1) / 15);
    const freq = 200 + power * 250;
    const vol = 0.08 + power * 0.15;
    playTone(freq, 0.04 + power * 0.04, 'sine', vol, freq * 0.3);
    playNoise(0.03, vol * 0.3, 2000);
  }

  function playCushionHit() {
    playTone(120, 0.08, 'triangle', 0.12, 60);
    playTone(80, 0.12, 'sine', 0.06);
  }

  function playShot(power) {
    const p = Math.min(1, power / Physics.MAX_POWER);
    const vol = 0.1 + p * 0.2;
    playNoise(0.04, vol * 0.6, 3000);
    playTone(400 + p * 200, 0.03, 'sine', vol * 0.4, 200);
    playTone(150, 0.06, 'triangle', vol * 0.3, 80);
  }

  function playScore(points) {
    const base = 400;
    const t = getCtx();
    if (!t || !enabled) return;
    const osc = t.createOscillator();
    const gain = t.createGain();
    osc.type = 'sine';
    const now = t.currentTime;
    const duration = 0.15 + Math.min(points || 1, 20) * 0.005;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base + 300, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(base + 100, now + duration);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(t.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
    setTimeout(() => playTone(base + 600, 0.08, 'sine', 0.08), 80);
  }

  function playMiss() {
    playTone(250, 0.2, 'sawtooth', 0.06, 100);
    playTone(180, 0.25, 'triangle', 0.04, 90);
  }

  function playChalk() {
    playNoise(0.15, 0.04, 4000);
  }

  function playWin() {
    const c = getCtx();
    if (!c || !enabled) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const delay = i * 0.12;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      const t = c.currentTime + delay;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  function playCushionCount(n) {
    const freq = 500 + n * 100;
    playTone(freq, 0.06, 'sine', 0.1);
  }

  function playTurnSwitch() {
    playTone(350, 0.08, 'sine', 0.06, 400);
  }

  function ensureInit() {
    if (!ctx) getCtx();
  }

  return {
    init, ensureInit, setEnabled, isEnabled,
    playBallHit, playCushionHit, playShot,
    playScore, playMiss, playChalk, playWin,
    playCushionCount, playTurnSwitch
  };
})();

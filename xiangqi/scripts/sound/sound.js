// Cờ Tướng Vương — sound effects
// Sinh tones bằng Web Audio API thay vì load mp3 (giảm bandwidth, tránh CORS).

let audioCtx = null;
let enabled = true;

function ctx() {
  if (!audioCtx && typeof AudioContext !== 'undefined') {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function setEnabled(v) {
  enabled = !!v;
}

/** Tone đơn giản. type: 'sine'|'square'|'triangle'|'sawtooth' */
function tone(freq, durationMs, type = 'sine', gain = 0.15) {
  if (!enabled) return;
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  osc.connect(g); g.connect(c.destination);

  const now = c.currentTime;
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

/** Tiếng "chạm gỗ" — burst noise + low oscillator. */
function clickSound(freq = 220) {
  if (!enabled) return;
  const c = ctx();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + 0.08);
  g.gain.value = 0;
  osc.connect(g); g.connect(c.destination);
  g.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.start();
  osc.stop(c.currentTime + 0.15);
}

export const SoundFX = {
  move()      { clickSound(280); },
  capture()   { clickSound(180); setTimeout(() => clickSound(120), 40); },
  check()     { tone(880, 180, 'square', 0.18); setTimeout(() => tone(660, 220, 'square', 0.18), 180); },
  win()       { tone(523, 120); setTimeout(() => tone(659, 120), 120); setTimeout(() => tone(784, 200), 240); setTimeout(() => tone(1047, 280), 440); },
  lose()      { tone(440, 200, 'triangle', 0.14); setTimeout(() => tone(330, 220, 'triangle', 0.14), 200); setTimeout(() => tone(220, 320, 'triangle', 0.14), 420); },
  draw()      { tone(392, 200); setTimeout(() => tone(392, 280), 220); },
  flip()      { tone(660, 60, 'sine', 0.1); setTimeout(() => tone(880, 80, 'sine', 0.1), 50); },
  illegal()   { tone(220, 180, 'sawtooth', 0.08); },
  click()     { tone(1200, 30, 'sine', 0.05); },
};

export function isEnabled() { return enabled; }

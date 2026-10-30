// Synthetic piano for tests: inharmonic partials, per-partial decay, hammer noise,
// damper on release. Seeded, so every run is repeatable.
export const SR = 44100;
let seed = 7;
export const setSeed = (s) => (seed = s);
export const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
export const gauss = () => { let s = 0; for (let i = 0; i < 6; i++) s += rand(); return (s - 3) / 1.2; };

// Crude piano: inharmonic partials, per-partial decay, hammer noise, damper on release.
export function synth(notes, durSec, { cents = 0, noise = 0.002, pedal = false, offsetSec = 0.5 } = {}) {
  const out = new Float32Array(Math.ceil((durSec + offsetSec + 2) * SR));
  for (const n of notes) {
    const f0 = 440 * 2 ** ((n.midi - 69 + (cents + gauss() * 3) / 100) / 12);
    const start = Math.round((n.on + offsetSec) * SR);
    const end = pedal ? out.length : Math.round((n.off + offsetSec) * SR);
    const B = 3e-4, vel = n.vel ?? 0.7;
    for (let h = 1; h <= 12; h++) {
      const f = h * f0 * Math.sqrt(1 + B * h * h);
      if (f > SR / 2.2) break;
      const amp = vel * (1 / h) * (h % 2 ? 1 : 0.75) * (0.6 + 0.4 * rand());
      const decay = 0.6 + 0.5 * h, ph = rand() * 6.28;
      for (let i = start; i < out.length; i++) {
        const t = (i - start) / SR;
        let env = Math.exp(-decay * t) * Math.min(1, t / 0.003);
        if (i > end) env *= Math.exp(-((i - end) / SR) / 0.06);
        if (t > 0.01 && env < 1e-4) break;
        out[i] += 0.15 * amp * env * Math.sin(6.2832 * f * t + ph);
      }
    }
    for (let i = start; i < start + 0.01 * SR && i < out.length; i++) out[i] += 0.05 * vel * gauss() * Math.exp(-(i - start) / (0.003 * SR));
  }
  for (let i = 0; i < out.length; i++) out[i] += noise * gauss();
  return out;
}


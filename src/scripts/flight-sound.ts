// Optional flight audio, synthesized with Web Audio (no files): a piston engine whose pitch follows
// the speed, a chime on arriving at a beacon, a radio blip for transmissions and a whoosh on take-off.
// Starts muted; the AudioContext is only created on the visitor's first "Sonido" click.

export interface FlightSound {
  setEnabled: (on: boolean) => void;
  setSpeed: (speed: number) => void;
  chime: () => void;
  blip: () => void;
  whoosh: () => void;
}

export function createSound(): FlightSound {
  let ctx: AudioContext | null = null;
  let master: GainNode, engineGain: GainNode, filter: BiquadFilterNode, chop: GainNode;
  let oscA: OscillatorNode, oscB: OscillatorNode, lfo: OscillatorNode;
  let enabled = false;
  let lastSpeed = -1;

  const init = () => {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Engine: two detuned saws → lowpass → "chop" gain modulated by an LFO (piston beat)
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.8;
    chop = ctx.createGain();
    chop.gain.value = 0.7;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.05;
    filter.connect(chop).connect(engineGain).connect(master);
    oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 62;
    oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.value = 62.8;
    oscA.connect(filter);
    oscB.connect(filter);
    lfo = ctx.createOscillator();
    lfo.frequency.value = 18;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.3;
    lfo.connect(lfoDepth).connect(chop.gain);
    [oscA, oscB, lfo].forEach((o) => o.start());
  };

  const tone = (freq: number, start: number, dur: number, type: OscillatorType, gain: number) => {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur + 0.05);
  };

  return {
    setEnabled: (on) => {
      enabled = on;
      if (on && !ctx) init();
      if (!ctx) return;
      if (on) void ctx.resume();
      master.gain.setTargetAtTime(on ? 0.7 : 0, ctx.currentTime, 0.2);
    },
    setSpeed: (speed) => {
      if (!ctx || !enabled || Math.abs(speed - lastSpeed) < 0.03) return;
      lastSpeed = speed;
      const now = ctx.currentTime;
      oscA.frequency.setTargetAtTime(58 + speed * 50, now, 0.25);
      oscB.frequency.setTargetAtTime(58.8 + speed * 50, now, 0.25);
      lfo.frequency.setTargetAtTime(16 + speed * 22, now, 0.25);
      filter.frequency.setTargetAtTime(380 + speed * 1300, now, 0.25);
      engineGain.gain.setTargetAtTime(0.04 + speed * 0.05, now, 0.25);
    },
    chime: () => {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      tone(880, now, 0.6, 'sine', 0.12);
      tone(1318.5, now + 0.09, 0.8, 'sine', 0.1);
    },
    blip: () => {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      tone(1450, now, 0.05, 'square', 0.03);
      tone(1450, now + 0.08, 0.05, 'square', 0.03);
    },
    whoosh: () => {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * 0.8);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, now);
      bp.frequency.exponentialRampToValueAtTime(2200, now + 0.6);
      const g = ctx.createGain();
      g.gain.value = 0.12;
      src.connect(bp).connect(g).connect(master);
      src.start(now);
    },
  };
}

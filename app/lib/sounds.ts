// Tiny synth helpers — no audio assets, generated on the fly via Web Audio.
// All sounds are short, quiet, and resemble a UI tick.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Cls =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Cls) return null;
    ctx = new Cls();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Blip = {
  freq: number;
  toFreq?: number; // optional pitch slide
  type?: OscillatorType;
  duration?: number; // seconds
  peak?: number; // gain
  delay?: number; // seconds from now
};

function blip({
  freq,
  toFreq,
  type = "sine",
  duration = 0.1,
  peak = 0.12,
  delay = 0,
}: Blip) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (toFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(toFreq, t + duration);
  }
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// Crisp pick tick — used for matchup card clicks.
export function playPick() {
  blip({ freq: 880, toFreq: 520, type: "sine", duration: 0.09, peak: 0.14 });
}

// Soft click — used for back / shuffle / landing buttons.
export function playSoft() {
  blip({ freq: 520, type: "triangle", duration: 0.07, peak: 0.08 });
}

// Two-note rise — used when the champion is decided.
export function playWin() {
  blip({ freq: 659.25, type: "sine", duration: 0.22, peak: 0.18, delay: 0 });
  blip({ freq: 987.77, type: "sine", duration: 0.32, peak: 0.18, delay: 0.13 });
}

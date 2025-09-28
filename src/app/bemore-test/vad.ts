// Pure utilities for VAD fusion and signal helpers
// No DOM access; deterministic. Safe for unit-style inline tests in comments.
// JSON Schemas (for backend parity)
// FrameSchema: {"$id":"Frame","type":"object","properties":{"t":{"type":"number"},"faceArousal":{"type":"number"},"audioArousal":{"type":"number"},"textValence":{"type":"number"},"textDominance":{"type":"number"},"smileIndex":{"type":"number"}},"required":["t"]}
// VADSchema: {"$id":"VAD","type":"object","properties":{"v":{"type":"number"},"a":{"type":"number"},"d":{"type":"number"}},"required":["v","a","d"]}

export type VAD = { v: number; a: number; d: number };
export type Frame = {
  t: number; // ms epoch
  faceArousal?: number; // [0,1]
  audioArousal?: number; // [0,1]
  textValence?: number; // [-1,1]
  textDominance?: number; // [-1,1]
  smileIndex?: number; // [0,1]
};

export function clamp(x: number, min = 0, max = 1): number {
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
}

export function ema(prev: number | undefined, value: number, alpha: number): number {
  const p = prev ?? value;
  return alpha * value + (1 - alpha) * p;
}

export class RingBuffer {
  private values: number[];
  private times: number[];
  private head = 0;
  private filled = false;
  constructor(private capacity: number) {
    this.values = new Array(capacity).fill(0);
    this.times = new Array(capacity).fill(0);
  }
  push(t: number, v: number) {
    this.values[this.head] = v;
    this.times[this.head] = t;
    this.head = (this.head + 1) % this.capacity;
    if (this.head === 0) this.filled = true;
  }
  toArray(): { t: number; v: number }[] {
    const len = this.filled ? this.capacity : this.head;
    const out: { t: number; v: number }[] = [];
    for (let i = 0; i < len; i++) {
      const idx = this.filled ? (this.head + i) % this.capacity : i;
      out.push({ t: this.times[idx], v: this.values[idx] });
    }
    return out;
  }
  avgInWindow(nowMs: number, windowMs: number): number {
    const arr = this.toArray();
    const start = nowMs - windowMs;
    let sum = 0;
    let count = 0;
    for (const p of arr) {
      if (p.t >= start) {
        sum += p.v;
        count++;
      }
    }
    return count === 0 ? 0 : sum / count;
  }
}

export type FusionWeights = {
  valenceRule: number; // weight for text valence in V
  valenceSmile: number; // weight for smile mapped in V
  arousalAudio: number; // weight for audioAr in A
  arousalFace: number; // weight for faceAr in A
  dominanceText: number; // weight for text dominance in D
};

export const defaultWeights: FusionWeights = {
  valenceRule: 0.6,
  valenceSmile: 0.4,
  arousalAudio: 0.6,
  arousalFace: 0.4,
  dominanceText: 1.0,
};

export function fuseVAD(frame: Frame, w: FusionWeights = defaultWeights): VAD {
  const smileMapped = clamp((frame.smileIndex ?? 0) * 1.0, 0, 1); // identity mapping for mock
  const V = clamp((w.valenceRule * ((frame.textValence ?? 0) * 0.5 + 0.5) + w.valenceSmile * smileMapped) / (w.valenceRule + w.valenceSmile));
  const A = clamp((w.arousalAudio * (frame.audioArousal ?? 0) + w.arousalFace * (frame.faceArousal ?? 0)) / (w.arousalAudio + w.arousalFace));
  const D = clamp(((frame.textDominance ?? 0) * 0.5 + 0.5) * w.dominanceText);
  return { v: V, a: A, d: D };
}

export function mapBoolTo01(b: boolean): number { return b ? 1 : 0; }

export function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((s, x) => s + (x - mean) * (x - mean), 0) / values.length;
}

// Inline examples (pseudo-tests)
// const rb = new RingBuffer(5); rb.push(1000, 1); rb.push(1200, 0); rb.avgInWindow(1500, 600) // ~0
// fuseVAD({t:0, textValence:1, smileIndex:0}, defaultWeights) // V ~ 0.8

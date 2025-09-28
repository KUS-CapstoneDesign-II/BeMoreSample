// Mock, non-clinical CBT feedback rules based on VAD buckets
// No external deps. Deterministic rotation within bucket.
// JSON Schemas
// TipSchema: {"$id":"Tip","type":"object","properties":{"bucket":{"type":"string"},"insight":{"type":"string"},"action":{"type":"string"}},"required":["bucket","insight","action"]}

import type { VAD } from "./vad";

export type CbtTip = { bucket: string; insight: string; action: string };

export type Bucket =
  | "lowV_highA"
  | "lowV_lowA"
  | "highV_highD"
  | "neutral";

export function bucketVAD(v: number, a: number, d: number): Bucket {
  if (v < 0.4 && a > 0.6) return "lowV_highA";
  if (v < 0.4 && a <= 0.6) return "lowV_lowA";
  if (v > 0.6 && d > 0.6) return "highV_highD";
  return "neutral";
}

const TIPS: Record<Bucket, CbtTip[]> = {
  lowV_highA: [
    { bucket: "lowV_highA", insight: "Noticing high activation with low mood.", action: "Try 4-7-8 breathing for 60s." },
    { bucket: "lowV_highA", insight: "Thoughts may be racing.", action: "Write one worry, challenge it once." },
    { bucket: "lowV_highA", insight: "Body signals of stress present.", action: "Scan body from head to toe, relax shoulders." },
  ],
  lowV_lowA: [
    { bucket: "lowV_lowA", insight: "Low energy and low mood detected.", action: "Identify one 5-min pleasant activity today." },
    { bucket: "lowV_lowA", insight: "Motivation seems low.", action: "Set a tiny task: 2-min tidy up." },
    { bucket: "lowV_lowA", insight: "Slowed pace may appear.", action: "Step outside for fresh air for 3 mins." },
  ],
  highV_highD: [
    { bucket: "highV_highD", insight: "Confidence toward goals detected.", action: "Break one goal into 3 sub-steps now." },
    { bucket: "highV_highD", insight: "Sense of agency present.", action: "Define a next action and a when." },
    { bucket: "highV_highD", insight: "Momentum available.", action: "Send a message to request support on your goal." },
  ],
  neutral: [
    { bucket: "neutral", insight: "Balanced state.", action: "Reflect: what's one helpful thought just now?" },
    { bucket: "neutral", insight: "Stable moment.", action: "Note one strength you used today." },
    { bucket: "neutral", insight: "Even keel.", action: "Plan a small reward after this session." },
  ],
};

const bucketIndex: Record<Bucket, number> = { lowV_highA: 0, lowV_lowA: 0, highV_highD: 0, neutral: 0 };

export function getTipsForBucket(bucket: Bucket): CbtTip[] {
  return TIPS[bucket];
}

export function nextTip(bucket: Bucket): CbtTip {
  const list = TIPS[bucket];
  const idx = bucketIndex[bucket] % list.length;
  bucketIndex[bucket] = (bucketIndex[bucket] + 1) % list.length;
  return list[idx];
}

export function tipForVAD(vad: VAD): CbtTip {
  const b = bucketVAD(vad.v, vad.a, vad.d);
  return nextTip(b);
}

// Examples
// bucketVAD(0.2, 0.8, 0.3) // "lowV_highA"
// nextTip("neutral") // deterministic rotation

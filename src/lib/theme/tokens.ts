export const color = {
  brand: {
    calm: "var(--brand-calm)",
    warm: "var(--brand-warm)",
  },
  chart: {
    valence: "var(--vad-v)",
    arousal: "var(--vad-a)",
    dominance: "var(--vad-d)",
  },
} as const;

export const radius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
} as const;

export const motion = {
  duration: {
    instant: 80,
    fast: 150,
    moderate: 240,
    slow: 360,
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "cubic-bezier(0.2, 0, 0, 1)",
  },
} as const;

export type Tokens = {
  color: typeof color;
  radius: typeof radius;
  motion: typeof motion;
};

export const tokens: Tokens = { color, radius, motion };



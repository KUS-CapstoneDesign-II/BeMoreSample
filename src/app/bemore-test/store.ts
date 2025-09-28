// LocalStorage CRUD for sessions, notes, onboarding state
// No server calls. Keys are namespaced.
// JSON Schemas (for backend mirror)
// SessionSchema: {"$id":"Session","type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"number"},"turns":{"type":"array"},"vadTimeline":{"type":"array"},"tipsUsed":{"type":"array"},"bookmarks":{"type":"array"}},"required":["id","createdAt"]}

export type StoredTurn = {
  id: string;
  speaker: "User" | "Coach";
  text: string;
  t: number; // ms epoch
  vad?: { v: number; a: number; d: number };
  tipAttachedId?: string;
};

export type StoredSession = {
  id: string;
  createdAt: number;
  turns: StoredTurn[];
  vadTimeline: { t: number; v: number; a: number; d: number }[];
  tipsUsed: { id: string; bucket: string; insight: string; action: string; t: number }[];
  bookmarks: { t: number; v: number; a: number; d: number; note?: string }[];
  notes?: string;
};

const SESSIONS_KEY = "bemore.sessions.v1";
const ONBOARD_KEY = "bemore.onboarding.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function listSessions(): StoredSession[] {
  return readJson<StoredSession[]>(SESSIONS_KEY, []);
}

export function getSession(id: string): StoredSession | undefined {
  return listSessions().find(s => s.id === id);
}

export function upsertSession(sess: StoredSession): void {
  const list = listSessions();
  const idx = list.findIndex(s => s.id === sess.id);
  if (idx >= 0) list[idx] = sess; else list.unshift(sess);
  writeJson(SESSIONS_KEY, list);
}

export function deleteSession(id: string): void {
  const list = listSessions().filter(s => s.id !== id);
  writeJson(SESSIONS_KEY, list);
}

export type OnboardingState = { step: number; consent: boolean };

export function getOnboarding(): OnboardingState {
  return readJson<OnboardingState>(ONBOARD_KEY, { step: 1, consent: false });
}

export function setOnboarding(state: OnboardingState): void {
  writeJson(ONBOARD_KEY, state);
}

export function summarizeSession(sess: StoredSession): { avgV: number; avgA: number; avgD: number } {
  const arr = sess.vadTimeline;
  if (!arr.length) return { avgV: 0, avgA: 0, avgD: 0 };
  const s = arr.reduce((acc, x) => ({ v: acc.v + x.v, a: acc.a + x.a, d: acc.d + x.d }), { v: 0, a: 0, d: 0 });
  return { avgV: s.v / arr.length, avgA: s.a / arr.length, avgD: s.d / arr.length };
}

// TODO: swap print with server PDF microservice

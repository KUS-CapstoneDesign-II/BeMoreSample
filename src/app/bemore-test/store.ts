// LocalStorage CRUD for sessions, notes, onboarding state
// No server calls. Keys are namespaced.
// JSON Schemas (for backend mirror)
// SessionSchema: {"$id":"Session","type":"object","properties":{"id":{"type":"string"},"createdAt":{"type":"number"},"turns":{"type":"array"},"vadTimeline":{"type":"array"},"tipsUsed":{"type":"array"},"bookmarks":{"type":"array"},"notes":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"favorite":{"type":"boolean"}},"required":["id","createdAt"]}

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
  tags?: string[];
  favorite?: boolean;
};

const SESSIONS_KEY = "bemore.sessions.v1";
const ONBOARD_KEY = "bemore.onboarding.v1";
const REMINDER_KEY = "bemore.reminder.v1";
const COMMUNITY_KEY = "bemore.community.v1";
const PROGRAMS_KEY = "bemore.programs.v1";

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

// Convenience helpers for partial updates (client-only)
export function updateSession(id: string, update: Partial<StoredSession>): StoredSession | undefined {
  const list = listSessions();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return undefined;
  const merged: StoredSession = { ...list[idx], ...update } as StoredSession;
  list[idx] = merged;
  writeJson(SESSIONS_KEY, list);
  return merged;
}

export function toggleFavorite(id: string): boolean {
  const list = listSessions();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return false;
  const next = !list[idx].favorite;
  list[idx].favorite = next;
  writeJson(SESSIONS_KEY, list);
  return next;
}

export function setSessionTags(id: string, tags: string[]): void {
  const list = listSessions();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return;
  list[idx].tags = tags;
  writeJson(SESSIONS_KEY, list);
}

export function setSessionNotes(id: string, notes: string): void {
  const list = listSessions();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) return;
  list[idx].notes = notes;
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

// Reminder (mock)
export type ReminderPrefs = { enabled: boolean; time: string; note?: string };

export function getReminder(): ReminderPrefs {
  return readJson<ReminderPrefs>(REMINDER_KEY, { enabled: false, time: "20:00", note: "오늘도 잠깐 마음을 돌아봐요" });
}

export function setReminder(prefs: ReminderPrefs): void {
  writeJson(REMINDER_KEY, prefs);
}

// Habit/streak utilities (client-only)
function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  return d.getTime();
}

export function getDailyStreak(): { streak: number; todayHasSession: boolean } {
  const sessions = listSessions().sort((a,b)=>b.createdAt-a.createdAt);
  if (sessions.length === 0) return { streak: 0, todayHasSession: false };
  const days = new Set(sessions.map(s => startOfLocalDay(s.createdAt)));
  let streak = 0;
  const today0 = startOfLocalDay(Date.now());
  let cursor = today0;
  const todayHasSession = days.has(today0);
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 24*3600*1000;
  }
  return { streak, todayHasSession };
}

export function getWeeklyProgress(): { completed: number; target: number; ratio: number } {
  const sessions = listSessions();
  const now = Date.now();
  const weekAgo = now - 7*24*3600*1000;
  const completed = sessions.filter(s => s.createdAt >= weekAgo).length;
  const target = 5; // soft weekly target
  const ratio = Math.max(0, Math.min(1, completed / target));
  return { completed, target, ratio };
}

// Community (mock, local-only)
export type CommunityPost = {
  id: string;
  createdAt: number;
  topic: string;
  text: string;
  tags?: string[];
  likes?: number;
};

export function listCommunityPosts(topic?: string): CommunityPost[] {
  const all = readJson<CommunityPost[]>(COMMUNITY_KEY, []);
  const filtered = topic ? all.filter(p => p.topic === topic) : all;
  return [...filtered].sort((a,b)=> b.createdAt - a.createdAt);
}

export function addCommunityPost(input: { topic: string; text: string; tags?: string[] }): CommunityPost | undefined {
  if (typeof window === "undefined") return undefined;
  const list = readJson<CommunityPost[]>(COMMUNITY_KEY, []);
  const post: CommunityPost = {
    id: Math.random().toString(36).slice(2,10),
    createdAt: Date.now(),
    topic: input.topic,
    text: input.text,
    tags: input.tags ?? [],
    likes: 0,
  };
  list.unshift(post);
  writeJson(COMMUNITY_KEY, list);
  return post;
}

export function likeCommunityPost(id: string): void {
  const list = readJson<CommunityPost[]>(COMMUNITY_KEY, []);
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return;
  list[idx].likes = (list[idx].likes ?? 0) + 1;
  writeJson(COMMUNITY_KEY, list);
}

// Programs (mock progress)
export type ProgramProgress = {
  id: string; // course id
  title?: string;
  day: number; // 0..totalDays
  totalDays: number; // default 7
  startedAt: number;
  updatedAt: number;
};

export function listProgramProgress(): ProgramProgress[] {
  return readJson<ProgramProgress[]>(PROGRAMS_KEY, []);
}

export function getProgramProgress(id: string): ProgramProgress | undefined {
  return listProgramProgress().find(p => p.id === id);
}

export function upsertProgramProgress(p: ProgramProgress): void {
  const list = listProgramProgress();
  const idx = list.findIndex(x => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.unshift(p);
  writeJson(PROGRAMS_KEY, list);
}

export function bumpProgramDay(id: string, title: string, totalDays = 7): ProgramProgress {
  const existing = getProgramProgress(id);
  const next: ProgramProgress = existing ? {
    ...existing,
    day: Math.min(existing.day + 1, existing.totalDays),
    updatedAt: Date.now(),
  } : {
    id,
    title,
    day: 1,
    totalDays,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  upsertProgramProgress(next);
  return next;
}

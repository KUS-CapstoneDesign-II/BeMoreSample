"use client";
import { useCallback, useMemo, useRef, useState } from "react";

export type Speaker = "User" | "Coach";
export type Turn = { id: string; speaker: Speaker; text: string; t: number; vad?: { v: number; a: number; d: number } };

const POS = new Set(["good","great","love","happy","calm","glad","okay","progress","win","proud","thanks","grateful"]);
const NEG = new Set(["bad","sad","angry","anxious","stress","worry","tired","stuck","fail","sorry","fear"]);
const MODAL = new Set(["should","must","have to","need to","can't","won't","might","could"]);
const FIRST = new Set(["i","i'm","i’ve","i'd","me","my","mine"]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function analyzeTextTurn(text: string): { ruleValence: number; dominance: number; tokens: string[] } {
  const tokens = tokenize(text);
  let pos = 0, neg = 0, modal = 0, first = 0;
  for (const tok of tokens) {
    if (POS.has(tok)) pos++;
    if (NEG.has(tok)) neg++;
    if (MODAL.has(tok)) modal++;
    if (FIRST.has(tok)) first++;
  }
  const total = Math.max(1, tokens.length);
  const ruleValence = Math.max(-1, Math.min(1, (pos - neg) / Math.ceil(Math.sqrt(total))));
  const firstRatio = first / total;
  const modalRatio = modal / total;
  const dominance = Math.max(-1, Math.min(1, firstRatio - modalRatio));
  return { ruleValence, dominance, tokens };
}

function id(): string { return Math.random().toString(36).slice(2, 10); }

export function useTranscript(initialTurns: Turn[] = []) {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const latestUserTextRef = useRef<string>("");

  const addTurn = useCallback((speaker: Speaker, text: string, t?: number) => {
    const when = t ?? Date.now();
    const { ruleValence, dominance } = analyzeTextTurn(text);
    const newTurn: Turn = { id: id(), speaker, text, t: when, vad: { v: (ruleValence+1)/2, a: 0.5, d: (dominance+1)/2 } };
    setTurns(prev => {
      const next = [...prev, newTurn];
      return next;
    });
    if (speaker === "User") latestUserTextRef.current = text;
  }, []);

  const addUserTurn = useCallback((text: string) => addTurn("User", text), [addTurn]);
  const addCoachTurn = useCallback((text: string) => addTurn("Coach", text), [addTurn]);

  const latestUserTurnAt = useCallback((t: number): Turn | undefined => {
    const userTurns = turns.filter(x => x.speaker === "User" && x.t <= t);
    return userTurns[userTurns.length - 1];
  }, [turns]);

  const tokensFreq = useMemo(() => {
    const freq = new Map<string, number>();
    for (const tr of turns) {
      if (tr.speaker !== "User") continue;
      for (const tok of tokenize(tr.text)) {
        freq.set(tok, (freq.get(tok) ?? 0) + 1);
      }
    }
    return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,50);
  }, [turns]);

  return {
    turns,
    addUserTurn,
    addCoachTurn,
    latestUserTurnAt,
    tokensFreq,
  } as const;
}

// TODO: replace text rules with server NLP (BERT/LLM) via /api/analyzeText

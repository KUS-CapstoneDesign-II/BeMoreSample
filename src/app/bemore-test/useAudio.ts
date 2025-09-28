"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RingBuffer, clamp, ema, variance } from "./vad";

type Permission = "pending" | "granted" | "denied";

export type AudioState = {
  permission: Permission;
  noiseMode: boolean;
  rms: number; // [0,1]
  pitchHz: number; // 0 if unknown
  arousal: number; // [0,1]
  rmsSeries: { t: number; v: number }[];
  pitchSeries: { t: number; v: number }[];
  start: () => Promise<void>;
  stop: () => void;
};

export function useAudio(windowMs = 10000): AudioState {
  const [permission, setPermission] = useState<Permission>("pending");
  const [noiseMode, setNoiseMode] = useState(false);
  const [rms, setRms] = useState(0);
  const [pitchHz, setPitchHz] = useState(0);
  const [arousal, setArousal] = useState(0);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Float32Array | null>(null);
  const rmsRB = useRef(new RingBuffer(500));
  const pitchRB = useRef(new RingBuffer(500));
  const arousalEmaRef = useRef<number | undefined>(undefined);

  const sample = useCallback((now: number) => {
    if (!analyserRef.current || !dataRef.current) return;
    analyserRef.current.getFloatTimeDomainData(dataRef.current);
    const buf = dataRef.current;
    // RMS
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const rmsVal = Math.sqrt(s / buf.length);
    const rmsNorm = clamp(rmsVal / 0.2, 0, 1); // normalize
    // Autocorrelation for coarse pitch
    let bestLag = 0;
    let bestCorr = 0;
    const minLag = 44100 / 800; // 800 Hz
    const maxLag = 44100 / 60;  // 60 Hz
    for (let lag = Math.floor(minLag); lag <= Math.floor(maxLag); lag += 2) {
      let corr = 0;
      for (let i = 0; i + lag < buf.length; i++) corr += buf[i] * buf[i + lag];
      if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
    }
    const sr = ctxRef.current?.sampleRate ?? 44100;
    const pitch = bestLag > 0 ? sr / bestLag : 0;

    // Arousal proxy: mix of RMS and pitch variability
    const pitchWindow = pitchRB.current.toArray().slice(-25).map(p=>p.v);
    const pitchVar = clamp(variance(pitchWindow) / 2000, 0, 1); // coarse scaling
    const ar = clamp(0.7 * rmsNorm + 0.3 * pitchVar, 0, 1);
    const arSm = ema(arousalEmaRef.current, ar, 0.2);
    arousalEmaRef.current = arSm;

    setRms(rmsNorm);
    setPitchHz(pitch);
    setArousal(arSm);
    rmsRB.current.push(now, rmsNorm);
    pitchRB.current.push(now, pitch);
  }, []);

  const loop = useCallback(() => {
    const now = Date.now();
    if (noiseMode || !analyserRef.current) {
      // Noise fallback: slow oscillations
      const t = now / 1000;
      const fakeRms = clamp(0.4 + 0.2 * Math.sin(t * 1.7), 0, 1);
      const fakePitch = 180 + 40 * Math.sin(t * 0.9);
      const fakeAr = clamp(0.6 * fakeRms + 0.4 * (Math.abs(Math.cos(t * 0.7))), 0, 1);
      setRms(fakeRms); setPitchHz(fakePitch); setArousal(fakeAr);
      rmsRB.current.push(now, fakeRms);
      pitchRB.current.push(now, fakePitch);
    } else {
      sample(now);
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [noiseMode, sample]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(analyser);
      ctxRef.current = ctx; analyserRef.current = analyser; sourceRef.current = src;
      dataRef.current = new Float32Array(analyser.fftSize);
      setPermission("granted"); setNoiseMode(false);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setPermission("denied"); setNoiseMode(true);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
    }
  }, [loop]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    try { ctxRef.current?.close(); } catch {}
    ctxRef.current = null; analyserRef.current = null; sourceRef.current = null; dataRef.current = null;
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const now = Date.now();
  const rmsSeries = useMemo(() => rmsRB.current.toArray().filter(p=>p.t>=now-windowMs), [rms, windowMs]);
  const pitchSeries = useMemo(() => pitchRB.current.toArray().filter(p=>p.t>=now-windowMs), [pitchHz, windowMs]);

  return { permission, noiseMode, rms, pitchHz, arousal, rmsSeries, pitchSeries, start, stop } as const;
}

// TODO: replace audio proxy with server STT + paralinguistics (Whisper) via /api/analyzeAudio

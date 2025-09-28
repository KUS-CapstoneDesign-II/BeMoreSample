"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { clamp, ema } from "./vad";

type Permission = "pending" | "granted" | "denied";

export type FaceProxies = {
  smileIndex: number; // [0,1]
  mouthOpen: number;  // [0,1]
  browDistance: number; // [0,1]
  eyeAspect: number;  // [0,1]
  faceArousal: number; // [0,1]
};

export function useFace() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [permission, setPermission] = useState<Permission>("pending");
  const [noiseMode, setNoiseMode] = useState(false);
  const [fps, setFps] = useState(0);
  const proxiesRef = useRef<FaceProxies>({ smileIndex: 0, mouthOpen: 0, browDistance: 0.5, eyeAspect: 0.5, faceArousal: 0 });
  const [proxies, setProxies] = useState<FaceProxies>(proxiesRef.current);
  const lastTickRef = useRef<number>(0);
  const arousalEmaRef = useRef<number | undefined>(undefined);
  const runningRef = useRef(false);
  const faceLandmarkerRef = useRef<any>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermission("granted");
      setNoiseMode(false);
      // Load MediaPipe tasks-vision via runtime import to avoid build-time module resolution
      try {
        const dynImport = (0, eval)("import");
        const vision: any = await dynImport("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs");
        const fileset = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        faceLandmarkerRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
      } catch {
        setNoiseMode(true);
      }
      runningRef.current = true;
      requestAnimationFrame(loop);
    } catch (e) {
      setPermission("denied"); setNoiseMode(true);
      runningRef.current = true;
      requestAnimationFrame(loop);
    }
  }, []);

  const stop = useCallback(() => {
    runningRef.current = false;
    try {
      const v = videoRef.current; const s = v?.srcObject as MediaStream | null;
      s?.getTracks().forEach(t=>t.stop());
      if (v) v.srcObject = null;
    } catch {}
  }, []);

  const getBlend = (name: string, arr: any[]): number => {
    const f = arr?.find((c: any) => c.categoryName === name);
    return f ? clamp(f.score, 0, 1) : 0;
  };

  const loop = useCallback(() => {
    if (!runningRef.current) return;
    const now = performance.now();
    const dt = now - (lastTickRef.current || now);
    if (dt > 0) setFps(Math.round(1000 / dt));
    lastTickRef.current = now;

    if (noiseMode || !faceLandmarkerRef.current || !videoRef.current) {
      const t = now / 1000;
      const smile = clamp(0.5 + 0.3 * Math.sin(t * 0.8));
      const mouth = clamp(0.4 + 0.3 * Math.max(0, Math.sin(t * 1.2)));
      const brow = clamp(0.5 + 0.2 * Math.sin(t * 0.6 + 1));
      const eye = clamp(0.5 + 0.2 * Math.cos(t * 1.1));
      const ar = clamp(0.5 * mouth + 0.3 * smile + 0.2 * (1 - eye));
      const arSm = ema(arousalEmaRef.current, ar, 0.2); arousalEmaRef.current = arSm;
      proxiesRef.current = { smileIndex: smile, mouthOpen: mouth, browDistance: brow, eyeAspect: eye, faceArousal: arSm };
      setProxies(proxiesRef.current);
      requestAnimationFrame(loop);
      return;
    }

    try {
      const video = videoRef.current as HTMLVideoElement;
      const results = faceLandmarkerRef.current.detectForVideo(video, now);
      const blends = results?.faceBlendshapes?.[0]?.categories ?? [];
      // Heuristic mapping
      const smile = clamp((getBlend("mouthSmileLeft", blends) + getBlend("mouthSmileRight", blends)) / 2);
      const mouth = Math.max(getBlend("mouthOpen", blends), getBlend("jawOpen", blends));
      const brow = clamp(0.5 + 0.5 * (getBlend("browInnerUp", blends) - (getBlend("browDownLeft", blends) + getBlend("browDownRight", blends)) / 2));
      const eye = clamp(1 - (getBlend("eyeBlinkLeft", blends) + getBlend("eyeBlinkRight", blends)) / 2);
      const ar = clamp(0.4 * mouth + 0.4 * smile + 0.2 * (1 - eye));
      const arSm = ema(arousalEmaRef.current, ar, 0.2); arousalEmaRef.current = arSm;
      proxiesRef.current = { smileIndex: smile, mouthOpen: mouth, browDistance: brow, eyeAspect: eye, faceArousal: arSm };
      setProxies(proxiesRef.current);
    } catch {
      // if detect fails intermittently, keep last proxies
    }

    setTimeout(() => requestAnimationFrame(loop), 1000 / 15); // ~15 FPS
  }, [noiseMode]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, permission, noiseMode, proxies, fps, start, stop } as const;
}

// TODO: replace face proxies with trained regressor via /api/analyzeFace

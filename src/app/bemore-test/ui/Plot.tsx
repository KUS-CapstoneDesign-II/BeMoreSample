"use client";
import { useEffect, useRef } from "react";

type TV = { t: number; v: number };

export function LinePlot({ data, color = "#22c55e", bg = "#0b0b0b", height = 80, label, yHint, cursorT, ariaLabel = "line plot", showGrid = true }: { data: TV[]; color?: string; bg?: string; height?: number; label?: string; yHint?: string; cursorT?: number; ariaLabel?: string; showGrid?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cvs.clientWidth, h = height;
    cvs.width = Math.floor(w * dpr); cvs.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
    if (showGrid) {
      ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach(p => { ctx.beginPath(); ctx.moveTo(0, h*p); ctx.lineTo(w, h*p); ctx.stroke(); });
    }
    if (data.length < 2) return;
    const t0 = data[0].t; const t1 = data[data.length-1].t; const dt = Math.max(1, t1 - t0);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    data.forEach((p,i)=>{
      const x = ((p.t - t0)/dt) * (w-2) + 1;
      const y = (1 - p.v) * (h-2) + 1;
      if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    if (cursorT && cursorT >= t0 && cursorT <= t1) {
      const x = ((cursorT - t0)/dt) * (w-2) + 1;
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); ctx.setLineDash([]);
    }
    if (label || yHint) {
      ctx.fillStyle = "#cbd5e1"; ctx.font = "11px system-ui";
      if (label) ctx.fillText(label, 6, 14);
      if (yHint) ctx.fillText(yHint, w-6-ctx.measureText(yHint).width, 14);
    }
  }, [data, color, bg, height, label, yHint, cursorT, showGrid]);
  return <canvas ref={canvasRef} style={{ width: "100%", height }} role="img" aria-label={ariaLabel} />;
}

export function Scatter({ points, color = "#60a5fa", bg = "#0b0b0b", size = 3, height = 120, label, ariaLabel = "scatter plot" }: { points: { x: number; y: number }[]; color?: string; bg?: string; size?: number; height?: number; label?: string; ariaLabel?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cvs = ref.current; if (!cvs) return; const ctx = cvs.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1; const w = cvs.clientWidth; const h = height;
    cvs.width = Math.floor(w * dpr); cvs.height = Math.floor(h * dpr); ctx.scale(dpr,dpr);
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 1;
    [0.25,0.5,0.75].forEach(p=>{ ctx.beginPath(); ctx.moveTo(0,h*p); ctx.lineTo(w,h*p); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w*p,0); ctx.lineTo(w*p,h); ctx.stroke(); });
    ctx.fillStyle = color;
    for (const p of points) {
      const x = 1 + p.x * (w-2);
      const y = 1 + (1 - p.y) * (h-2);
      ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
    }
    // axes
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.strokeRect(0.5,0.5,w-1,h-1);
    if (label) { ctx.fillStyle = "#cbd5e1"; ctx.font = "11px system-ui"; ctx.fillText(label, 6, 14); }
  }, [points, color, bg, size, height, label]);
  return <canvas ref={ref} style={{ width: "100%", height }} role="img" aria-label={ariaLabel} />;
}

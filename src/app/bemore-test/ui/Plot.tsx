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
    ctx.strokeStyle = "#222"; ctx.lineWidth = 1; ctx.strokeRect(0.5,0.5,w-1,h-1);
    if (label) { ctx.fillStyle = "#cbd5e1"; ctx.font = "11px system-ui"; ctx.fillText(label, 6, 14); }
  }, [points, color, bg, size, height, label]);
  return <canvas ref={ref} style={{ width: "100%", height }} role="img" aria-label={ariaLabel} />;
}

// Interactive isometric-like 3D with adjustable rotation angles (deg)
export function Scatter3D({ points, bg = "#0b0b0b", height = 200, ariaLabel = "3d scatter", rotZDeg = 45, rotXDeg = 35.264, interactive = true, initialRotZDeg = rotZDeg, initialRotXDeg = rotXDeg, onAnglesChange, connect = false, lineColor = "#94a3b8", lineWidth = 1.5, quality = "fast", maxPoints = 800 }: { points: { x:number; y:number; z:number }[]; bg?: string; height?: number; ariaLabel?: string; rotZDeg?: number; rotXDeg?: number; interactive?: boolean; initialRotZDeg?: number; initialRotXDeg?: number; onAnglesChange?: (zDeg:number,xDeg:number)=>void; connect?: boolean; lineColor?: string; lineWidth?: number; quality?: "fast" | "high"; maxPoints?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const zRef = useRef<number>(initialRotZDeg);
  const xRef = useRef<number>(initialRotXDeg);
  const zoomRef = useRef<number>(1);
  const draggingRef = useRef(false);
  const lastRef = useRef<{x:number;y:number}>({x:0,y:0});
  const rafRef = useRef<number | null>(null);

  const draw = () => {
    const cvs = ref.current; if (!cvs) return; const ctx = cvs.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1; const w = cvs.clientWidth; const h = height;
    const scale = Math.min(w,h)*0.6*zoomRef.current;
    cvs.width = Math.floor(w * dpr); cvs.height = Math.floor(h * dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

    // rotation angles
    const rz = zRef.current * Math.PI/180; const rx = xRef.current * Math.PI/180;
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz);
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const cx = w/2, cy = h/2;
    function project(x:number,y:number,z:number){
      const X0 = x-0.5, Y0 = y-0.5, Z0 = z-0.5;
      const xr = X0*cosZ - Y0*sinZ;
      const yr = X0*sinZ + Y0*cosZ;
      const zr = Z0;
      const yr2 = yr*cosX - zr*sinX;
      const zr2 = yr*sinX + zr*cosX;
      const Xs = cx + xr*scale;
      const Ys = cy - yr2*scale;
      return { x: Xs, y: Ys, depth: zr2 };
    }

    // cube edges
    const verts: [number,number,number][] = [
      [0,0,0],[1,0,0],[1,1,0],[0,1,0],
      [0,0,1],[1,0,1],[1,1,1],[0,1,1]
    ];
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 1;
    const edges: [number, number][] = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for (const [a,b] of edges) { const va = project(...verts[a]); const vb = project(...verts[b]); ctx.beginPath(); ctx.moveTo(va.x,va.y); ctx.lineTo(vb.x,vb.y); ctx.stroke(); }

    // axes
    const o = project(0,0,0); const vx = project(1,0,0); const vy = project(0,1,0); const vz = project(0,0,1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(vx.x,vx.y); ctx.stroke();
    ctx.strokeStyle = "#22c55e"; ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(vy.x,vy.y); ctx.stroke();
    ctx.strokeStyle = "#3b82f6"; ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(vz.x,vz.y); ctx.stroke();
    if (quality === "high") {
      ctx.fillStyle = "#cbd5e1"; ctx.font = "11px system-ui";
      ctx.fillText("V", vx.x+4, vx.y); ctx.fillText("A", vy.x+4, vy.y); ctx.fillText("D", vz.x+4, vz.y);
    }

    // optional polyline connecting points in provided order
    if (connect && points.length > 1) {
      ctx.strokeStyle = lineColor; ctx.lineWidth = lineWidth; ctx.beginPath();
      const step = Math.max(1, Math.ceil(points.length / maxPoints));
      for (let i = 0; i < points.length; i += step) {
        const p = points[i];
        const pr = project(p.x, p.y, p.z);
        if (i === 0) ctx.moveTo(pr.x, pr.y); else ctx.lineTo(pr.x, pr.y);
      }
      ctx.stroke();
    }

    // points (decimated, no sorting in fast mode)
    const stepPts = Math.max(1, Math.ceil(points.length / maxPoints));
    if (quality === "high") {
      const sortedPts = [...points].sort((a,b)=> a.z-b.z);
      for (let i = 0; i < sortedPts.length; i += stepPts) {
        const p = sortedPts[i];
        const pr = project(p.x,p.y,p.z);
        const r = 2 + p.z*3; const col = `rgba(255,255,255,${0.6 + 0.4*p.z})`;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(pr.x, pr.y, r, 0, Math.PI*2); ctx.fill();
      }
    } else {
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < points.length; i += stepPts) {
        const p = points[i]; const pr = project(p.x,p.y,p.z);
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 2, 0, Math.PI*2); ctx.fill();
      }
    }

    if (quality === "high") {
      ctx.fillStyle = "#cbd5e1"; ctx.font = "11px system-ui"; ctx.fillText("V-A-D 3D — drag to rotate", 6, 14);
    }
  };

  useEffect(()=>{ draw(); }, [points, bg, height]);
  useEffect(()=>{ zRef.current = rotZDeg; xRef.current = rotXDeg; draw(); }, [rotZDeg, rotXDeg]);

  useEffect(()=>{
    const cvs = ref.current; if (!cvs || !interactive) return;
    const onPointerDown = (e: PointerEvent) => { draggingRef.current = true; lastRef.current = { x: e.clientX, y: e.clientY }; (e.target as Element).setPointerCapture(e.pointerId); };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastRef.current.x; const dy = e.clientY - lastRef.current.y;
      lastRef.current = { x: e.clientX, y: e.clientY };
      zRef.current += dx * 0.3;
      xRef.current = Math.max(-85, Math.min(85, xRef.current + dy * 0.3));
      if (onAnglesChange) onAnglesChange(zRef.current, xRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    const onPointerUp = (e: PointerEvent) => { draggingRef.current = false; try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {} };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const d = Math.sign(e.deltaY); const next = Math.max(0.8, Math.min(2.0, zoomRef.current * (d>0? 0.95:1.05))); if (next!==zoomRef.current){ zoomRef.current = next; draw(); } };
    const onKey = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 1 : 3;
      if (e.key === "ArrowLeft") { zRef.current -= step; draw(); }
      if (e.key === "ArrowRight") { zRef.current += step; draw(); }
      if (e.key === "ArrowUp") { xRef.current = Math.max(-85, xRef.current - step); draw(); }
      if (e.key === "ArrowDown") { xRef.current = Math.min(85, xRef.current + step); draw(); }
    };
    cvs.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    cvs.addEventListener("wheel", onWheel, { passive: false });
    cvs.addEventListener("keydown", onKey);
    cvs.tabIndex = 0; // focusable for keyboard
    return () => {
      cvs.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      cvs.removeEventListener("wheel", onWheel as any);
      cvs.removeEventListener("keydown", onKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [interactive]);

  return <canvas ref={ref} style={{ width: "100%", height }} role="img" aria-label={ariaLabel} />;
}

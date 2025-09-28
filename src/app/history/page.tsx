"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { listSessions, summarizeSession, upsertSession } from "@/app/bemore-test/store";
import { LinePlot, Scatter3D } from "@/app/bemore-test/ui/Plot";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState(() => [] as ReturnType<typeof listSessions>);
  const [view, setView] = useState<"iso"|"front"|"top"|"side">("iso");
  useEffect(() => {
    setMounted(true);
    setSessions(listSessions());
  }, []);

  function seedDemo(count = 8) {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const createdAt = now - (count - i) * 24*3600*1000 + Math.floor(Math.random()*3600*1000);
      const id = Math.random().toString(36).slice(2,10);
      const baseV = clamp01(0.4 + (i - count/2)/(count*2) + (Math.random()-0.5)*0.1);
      const baseA = clamp01(0.5 + (Math.random()-0.5)*0.2);
      const baseD = clamp01(0.5 + (Math.random()-0.5)*0.2);
      const vadTimeline = Array.from({length: 20}, (_,k)=>{
        const t = createdAt + k*30000;
        const v = clamp01(baseV + (Math.random()-0.5)*0.1);
        const a = clamp01(baseA + (Math.random()-0.5)*0.1);
        const d = clamp01(baseD + (Math.random()-0.5)*0.1);
        return { t, v, a, d };
      });
      upsertSession({
        id,
        createdAt,
        turns: [],
        vadTimeline,
        tipsUsed: [],
        bookmarks: [],
        notes: "demo",
      } as any);
    }
    setSessions(listSessions());
  }

  // Build time series (ascending by createdAt) — hooks must be unconditional
  const sorted = useMemo(() => [...sessions].sort((a,b)=>a.createdAt-b.createdAt), [sessions]);
  const vSeries = useMemo(() => sorted.map(s => ({ t: s.createdAt, v: summarizeSession(s).avgV })), [sorted]);
  const aSeries = useMemo(() => sorted.map(s => ({ t: s.createdAt, v: summarizeSession(s).avgA })), [sorted]);
  const dSeries = useMemo(() => sorted.map(s => ({ t: s.createdAt, v: summarizeSession(s).avgD })), [sorted]);
  const points3D = useMemo(() => sorted.map(s => {
    const avg = summarizeSession(s);
    const clamp01 = (x:number)=> Math.max(0, Math.min(1, x));
    return { x: clamp01(avg.avgV), y: clamp01(avg.avgA), z: clamp01(avg.avgD) };
  }), [sorted]);

  const latestAvg = useMemo(() => {
    const last = sorted[sorted.length-1];
    return last ? summarizeSession(last) : { avgV: 0, avgA: 0, avgD: 0 };
  }, [sorted]);
  const prevAvg = useMemo(() => {
    const prev = sorted[sorted.length-2];
    return prev ? summarizeSession(prev) : { avgV: 0, avgA: 0, avgD: 0 };
  }, [sorted]);
  const dv = (latestAvg.avgV - prevAvg.avgV) || 0;
  const da = (latestAvg.avgA - prevAvg.avgA) || 0;
  const dd = (latestAvg.avgD - prevAvg.avgD) || 0;

  const count = sessions.length;
  const rangeText = count
    ? `${new Date(sorted[0].createdAt).toLocaleDateString()} – ${new Date(sorted[sorted.length-1].createdAt).toLocaleDateString()}`
    : "";

  const angles = useMemo(()=>{
    switch(view){
      case "front": return { z: 0, x: 0 };
      case "top": return { z: 45, x: 75 };
      case "side": return { z: 90, x: 35.264 };
      default: return { z: 45, x: 35.264 };
    }
  }, [view]);

  if (!mounted) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <h1 className="text-lg font-semibold">종합 분석</h1>
        <Card className="p-6 text-sm text-muted-foreground">불러오는 중…</Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-8xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">종합 분석</h1>
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted-foreground">3D 뷰</label>
          <select className="text-xs rounded border bg-background px-2 py-1" value={view} onChange={e=>setView(e.target.value as any)}>
            <option value="iso">아이소</option>
            <option value="front">정면</option>
            <option value="top">탑</option>
            <option value="side">사이드</option>
          </select>
          <button className="text-xs underline" onClick={()=>seedDemo(8)}>데모 데이터 생성</button>
        </div>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm">요약</div>
          <div className="text-xs text-muted-foreground">기간 {rangeText} · 세션 {count}회</div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="badge">기분 {latestAvg.avgV.toFixed(2)} ({deltaStr(dv)})</span>
          <span className="badge">에너지 {latestAvg.avgA.toFixed(2)} ({deltaStr(da)})</span>
          <span className="badge">주도성 {latestAvg.avgD.toFixed(2)} ({deltaStr(dd)})</span>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm">추세</div>
        {vSeries.length === 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            아직 데이터가 없어요. <button className="underline" onClick={()=>seedDemo(8)}>데모 데이터 생성</button>
          </div>
        )}
        {vSeries.length > 0 && (
          <div className="space-y-2">
            <div>
              <div className="text-xs mb-1">기분(Valence)</div>
              <LinePlot data={vSeries} color="#10b981" height={180} label="V" yHint="0–1" ariaLabel="Valence trend" />
            </div>
            <div>
              <div className="text-xs mb-1">에너지(Arousal)</div>
              <LinePlot data={aSeries} color="#3b82f6" height={180} label="A" yHint="0–1" ariaLabel="Arousal trend" />
            </div>
            <div>
              <div className="text-xs mb-1">주도성(Dominance)</div>
              <LinePlot data={dSeries} color="#f59e0b" height={180} label="D" yHint="0–1" ariaLabel="Dominance trend" />
            </div>
          </div>
        )}
      </Card>

      {points3D.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="text-sm">3D 감정 좌표 (V-A-D)</div>
          <Scatter3D points={points3D} height={800} ariaLabel="V-A-D 3D view" rotZDeg={angles.z} rotXDeg={angles.x} />
        </Card>
      )}

      <div className="space-y-2">
        {sorted.map((s)=>{
          const avg = summarizeSession(s);
          return (
            <Card key={s.id} className="p-3 flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div>{new Date(s.createdAt).toLocaleString()}</div>
                <div className="flex gap-2 text-xs">
                  <span className="badge">V {avg.avgV.toFixed(2)}</span>
                  <span className="badge">A {avg.avgA.toFixed(2)}</span>
                  <span className="badge">D {avg.avgD.toFixed(2)}</span>
                </div>
              </div>
              <a className="underline text-xs" href={`/report/${s.id}`}>자세히</a>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function deltaStr(x: number): string {
  if (!isFinite(x) || x === 0) return "±0.00";
  const sign = x > 0 ? "+" : "";
  return `${sign}${x.toFixed(2)}`;
}

function clamp01(x:number){ return Math.max(0, Math.min(1, x)); }

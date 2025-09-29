"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReminder, getDailyStreak, getWeeklyProgress, listSessions, setReminder, summarizeSession, upsertSession } from "@/app/bemore-test/store";
import { LinePlot, Scatter3D } from "@/app/bemore-test/ui/Plot";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState(() => [] as ReturnType<typeof listSessions>);
  const [view, setView] = useState<"iso"|"front"|"top"|"side">("iso");
  const [range, setRange] = useState<"7"|"30"|"all">("30");
  const [reminder, setReminderState] = useState(()=> getReminder());
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
      // Random demo tags and favorites
      const demoTagsAll = ["아침","업무","운동","감사","산책","휴식"];
      const tagCount = Math.floor(Math.random()*3);
      const tags = Array.from({length: tagCount}, ()=> demoTagsAll[Math.floor(Math.random()*demoTagsAll.length)])
        .filter((v,idx,arr)=>arr.indexOf(v)===idx);
      const favorite = Math.random() < 0.3 || i === count-1;
      upsertSession({
        id,
        createdAt,
        turns: [],
        vadTimeline,
        tipsUsed: [],
        bookmarks: [],
        notes: "demo",
        tags,
        favorite,
      } as any);
    }
    setSessions(listSessions());
  }

  // Build time series (ascending by createdAt) — hooks must be unconditional
  const filtered = useMemo(()=>{
    if (range === "all") return sessions;
    const days = range === "7" ? 7 : 30;
    const cutoff = Date.now() - days*24*3600*1000;
    return sessions.filter(s => s.createdAt >= cutoff);
  }, [sessions, range]);
  const sorted = useMemo(() => [...filtered].sort((a,b)=>a.createdAt-b.createdAt), [filtered]);
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

  const count = sorted.length;
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
          <a href="/bemore-test" className="text-xs rounded bg-primary text-primary-foreground px-3 py-2">오늘도 기록하기</a>
          <label className="text-xs text-muted-foreground">범위</label>
          <select className="text-xs rounded border bg-background px-2 py-1" value={range} onChange={e=>setRange(e.target.value as any)}>
            <option value="7">7일</option>
            <option value="30">30일</option>
            <option value="all">전체</option>
          </select>
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

      <Card className="p-4 grid gap-3 md:grid-cols-3 items-center">
        <div className="space-y-1">
          <div className="text-sm">요약</div>
          <div className="text-xs text-muted-foreground">기간 {rangeText} · 세션 {count}회</div>
          <div className="flex gap-2 text-xs pt-1">
            <span className="badge">기분 {latestAvg.avgV.toFixed(2)} ({deltaStr(dv)})</span>
            <span className="badge">에너지 {latestAvg.avgA.toFixed(2)} ({deltaStr(da)})</span>
            <span className="badge">주도성 {latestAvg.avgD.toFixed(2)} ({deltaStr(dd)})</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm">연속 기록</div>
          {(()=>{ const s = getDailyStreak(); return (
            <div className="text-xs text-muted-foreground">{s.todayHasSession ? "오늘도 기록 완료" : "오늘 아직 미기록"} · 스트릭 {s.streak}일</div>
          );})()}
        </div>
        <div className="space-y-1">
          <div className="text-sm">주간 목표</div>
          {(()=>{ const w = getWeeklyProgress(); return (
            <div className="flex items-center gap-2">
              <div className="grow h-2 rounded bg-muted overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${Math.round(w.ratio*100)}%` }} />
              </div>
              <div className="text-xs text-muted-foreground w-20 text-right">{w.completed}/{w.target}</div>
            </div>
          );})()}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm">추세</div>
        {vSeries.length === 0 && (
          <div className="text-xs text-muted-foreground space-y-2">
            <div>아직 데이터가 없어요. 먼저 간단히 한 번 기록해 볼까요?</div>
            <div className="flex items-center gap-3">
              <a href="/bemore-test" className="rounded bg-primary text-primary-foreground px-3 py-1">오늘 기록하기</a>
              <button className="underline" onClick={()=>seedDemo(8)}>데모 데이터 생성</button>
            </div>
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
        <div className="pt-3 grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">리마인더 시간</div>
            <input
              type="time"
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              value={reminder.time}
              onChange={(e)=>setReminderState({ ...reminder, time: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">리마인더 메모</div>
            <input
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              placeholder="예: 저녁 식사 후 5분 기록"
              value={reminder.note ?? ""}
              onChange={(e)=>setReminderState({ ...reminder, note: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={reminder.enabled} onChange={(e)=>setReminderState({ ...reminder, enabled: e.target.checked })} />
              <span>리마인더 사용</span>
            </label>
            <Button size="sm" onClick={()=>{ setReminder(reminder); }}>리마인더 저장</Button>
          </div>
        </div>
      </Card>

      {points3D.length > 0 && (
        <Card className="p-4 space-y-2">
          <div className="text-sm">3D 감정 좌표 (V-A-D)</div>
          <Scatter3D points={points3D} height={800} ariaLabel="V-A-D 3D view" rotZDeg={angles.z} rotXDeg={angles.x} connect lineColor="#64748b" lineWidth={1.2} quality="fast" maxPoints={600} />
        </Card>
      )}

      <div className="space-y-2">
        {displayList(sorted).map((s)=>{
          const avg = summarizeSession(s);
          return (
            <Card key={s.id} className="p-3 flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div>{new Date(s.createdAt).toLocaleString()}</div>
                <div className="flex gap-2 text-xs">
                  <span className="badge">V {avg.avgV.toFixed(2)}</span>
                  <span className="badge">A {avg.avgA.toFixed(2)}</span>
                  <span className="badge">D {avg.avgD.toFixed(2)}</span>
                  {s.favorite && <span className="badge">★ 즐겨찾기</span>}
                </div>
                {s.tags && s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {s.tags.map((t,i)=>(
                      <span key={i} className="badge text-[10px]">#{t}</span>
                    ))}
                  </div>
                )}
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

function displayList(sorted: ReturnType<typeof listSessions>) {
  const arr = [...sorted].sort((a,b)=> b.createdAt - a.createdAt);
  const favs = arr.filter(s => !!s.favorite);
  const others = arr.filter(s => !s.favorite);
  return [...favs, ...others];
}

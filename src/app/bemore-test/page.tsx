"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranscript } from "./useTranscript";
import { useAudio } from "./useAudio";
import { useFace } from "./useFace";
import { LinePlot, Scatter } from "./ui/Plot";
import { VAD, RingBuffer, fuseVAD, defaultWeights } from "./vad";
import { bucketVAD, nextTip, getTipsForBucket, type Bucket } from "./cbt";
import { getOnboarding, setOnboarding, listSessions, upsertSession, summarizeSession, type StoredSession } from "./store";

function fmt2(n: number) { return (Math.round(n*100)/100).toFixed(2); }
function id() { return Math.random().toString(36).slice(2, 10); }

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [consent, setConsent] = useState(false);
  const { videoRef, permission: camPerm, noiseMode: faceNoise, proxies, fps, start: startFace, stop: stopFace } = useFace();
  const { permission: micPerm, noiseMode: audioNoise, rms, pitchHz, arousal, rmsSeries, pitchSeries, start: startAudio, stop: stopAudio } = useAudio(10000);
  const { turns, addUserTurn, addCoachTurn, latestUserTurnAt, tokensFreq } = useTranscript([]);

  // Fusion timeline state
  const [weights] = useState(defaultWeights);
  const vadRB = useRef(new RingBuffer(120*2)); // up to 120s at 2Hz
  const [vadNow, setVadNow] = useState<VAD>({ v: 0, a: 0, d: 0 });
  const [, setTick] = useState(0);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [currentTip, setCurrentTip] = useState<{ bucket: string; insight: string; action: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<{ t:number; v:number; a:number; d:number }[]>([]);
  const [note, setNote] = useState("");
  const [showDev, setShowDev] = useState(false);
  const [friendlyMode, setFriendlyMode] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Mount + onboarding load/persist
  useEffect(() => { setMounted(true); const ob = getOnboarding(); setStep(ob.step); setConsent(ob.consent); }, []);
  useEffect(() => { if (mounted) setOnboarding({ step, consent }); }, [mounted, step, consent]);

  // Start/stop streams per onboarding step
  useEffect(() => {
    if (step >= 2) { startFace(); startAudio(); }
    return () => { stopFace(); stopAudio(); };
  }, [step, startFace, startAudio, stopFace, stopAudio]);

  // 500ms fusion loop
  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now();
      const userTurn = latestUserTurnAt(t);
      const textVal = userTurn?.vad?.v !== undefined ? (userTurn.vad!.v * 2 - 1) : 0; // map back to [-1,1]
      const textDom = userTurn?.vad?.d !== undefined ? (userTurn.vad!.d * 2 - 1) : 0;
      const frame = {
        t,
        faceArousal: proxies.faceArousal,
        audioArousal: arousal,
        textValence: textVal,
        textDominance: textDom,
        smileIndex: proxies.smileIndex,
      };
      const fused = fuseVAD(frame, weights);
      setVadNow(fused);
      vadRB.current.push(t, fused.v); // store V only for cursor in this RB; we derive arrays below
      setTick(x=>x+1);
    }, 500);
    return () => clearInterval(timer);
  }, [arousal, proxies, weights, latestUserTurnAt]);

  const [cursorT, setCursorT] = useState<number | undefined>(undefined);
  useEffect(() => { setCursorT(Date.now()); const i = setInterval(()=>setCursorT(Date.now()), 500); return ()=>clearInterval(i); }, []);
  const windowMs = 60000;
  const vadSeries = useMemo(() => {
    const nowMs = Date.now();
    const arr = vadRB.current.toArray().filter(p=>p.t>=nowMs-windowMs);
    // reconstruct A/D with current value (for display only); real timeline summarized on save
    return arr.map(p => ({ t: p.t, v: (p.v as number) }));
  }, [vadNow]);

  // Stable tip per bucket (rotate only on user action or bucket change)
  const currentBucket = useMemo<Bucket>(() => {
    const nowMs = Date.now();
    const recent = vadRB.current.toArray().filter(p=>p.t >= (nowMs - 5000));
    const vAvg = recent.length ? recent.reduce((s,p)=>s+p.v,0)/recent.length : vadNow.v;
    const aAvg = arousal;
    const dAvg = (latestUserTurnAt(nowMs)?.vad?.d) ?? vadNow.d;
    return bucketVAD(vAvg, aAvg, dAvg) as Bucket;
  }, [arousal, vadNow, latestUserTurnAt]);

  useEffect(() => {
    if (!currentTip || currentTip.bucket !== currentBucket) {
      const first = getTipsForBucket(currentBucket)[0];
      setCurrentTip(first);
    }
  }, [currentBucket]);

  // Session actions
  const markMoment = useCallback(() => {
    const t = Date.now(); setBookmarks(prev => [...prev, { t, v: vadNow.v, a: arousal, d: vadNow.d }]);
  }, [vadNow, arousal]);

  const saveSession = useCallback(() => {
    const sess: StoredSession = {
      id: id(), createdAt: Date.now(),
      turns: turns.map(t=>({ id: t.id, speaker: t.speaker, text: t.text, t: t.t, vad: t.vad })),
      vadTimeline: vadRB.current.toArray().map(p=>({ t: p.t, v: p.v, a: arousal, d: (latestUserTurnAt(p.t)?.vad?.d) ?? vadNow.d })),
      tipsUsed: currentTip ? [{ id: id(), bucket: currentTip.bucket, insight: currentTip.insight, action: currentTip.action, t: Date.now() }] : [],
      bookmarks: bookmarks,
      notes: note,
    };
    upsertSession(sess);
    alert("Session saved.");
  }, [turns, arousal, vadNow, currentTip, bookmarks, note, latestUserTurnAt]);

  const [sessions, setSessions] = useState<StoredSession[]>([]);
  useEffect(()=> { setSessions(listSessions()); }, [mounted]);

  // Derived flags
  const permissionsReady = camPerm !== "pending" && micPerm !== "pending";
  const anyNoise = faceNoise || audioNoise;

  function describeState(v:number,a:number,d:number): { title:string; note:string } {
    const title = v>0.66? "긍정적": v<0.33? "무거움": a>0.66? "활기": a<0.33? "차분": "보통";
    const note = d>0.66? "주도성이 느껴져요": d<0.33? "부담이 느껴질 수 있어요": "균형 잡힌 느낌이에요";
    return { title, note };
  }

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">BeMore — 따뜻한 감정 상담 (Mock)</h1>
        <p className="text-sm text-muted-foreground">말과 표정/목소리를 가볍게 살펴, 지금의 감정 좌표(V/A/D)를 이해해요.</p>
        <div className="pt-2">
          <Button size="sm" variant="outline" onClick={()=>{
            const sid = id();
            const sess = {
              id: sid,
              createdAt: Date.now(),
              turns: turns.map(t=>({ id: t.id, speaker: t.speaker, text: t.text, t: t.t, vad: t.vad })),
              vadTimeline: vadRB.current.toArray().map(p=>({ t: p.t, v: p.v, a: arousal, d: (latestUserTurnAt(p.t)?.vad?.d) ?? vadNow.d })),
              tipsUsed: currentTip ? [{ id: id(), bucket: currentTip.bucket, insight: currentTip.insight, action: currentTip.action, t: Date.now() }] : [],
              bookmarks: bookmarks,
              notes: note,
            } as any;
            upsertSession(sess);
            window.location.assign(`/report/loading?sid=${sid}`);
          }}>상담 종료</Button>
        </div>
      </header>

      {/* 노이즈 모드 상단 알림 비표시 */}

      {step < 4 ? (
        <motion.div initial={mounted? {opacity:0, y:6}: false} animate={mounted? {opacity:1, y:0}: undefined} transition={{duration:0.25}}>
          <Card className="p-4 space-y-4 bg-gradient-to-b from-primary/5 to-background">
          <h2 className="font-medium">Onboarding</h2>
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm">Step 1: Camera/Microphone permissions</p>
              <div className="flex gap-2">
                <Button onClick={startFace} variant="secondary">Enable Camera</Button>
                <Button onClick={startAudio} variant="secondary">Enable Microphone</Button>
              </div>
              <div className="text-xs text-muted-foreground">Camera: {camPerm} · Mic: {micPerm}</div>
              {permissionsReady && <Button onClick={()=>setStep(2)}>Continue</Button>}
              {anyNoise && (
                <Alert>
                  <AlertTitle>Noise mode</AlertTitle>
                  <AlertDescription>Permissions denied or features unavailable. Mock signals will be used.</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm">Step 2: Fusion pipeline</p>
              <div className="rounded-md border p-3 bg-background">
                <svg width="100%" height="90" viewBox="0 0 600 90">
                  <rect x="5" y="15" width="140" height="60" rx="6" fill="#0f172a"/><text x="75" y="50" textAnchor="middle" fill="#e5e7eb" fontSize="12">Verbal (Text)</text>
                  <rect x="155" y="15" width="140" height="60" rx="6" fill="#0f172a"/><text x="225" y="50" textAnchor="middle" fill="#e5e7eb" fontSize="12">Nonverbal (Audio+Face)</text>
                  <rect x="305" y="15" width="100" height="60" rx="6" fill="#0f172a"/><text x="355" y="50" textAnchor="middle" fill="#e5e7eb" fontSize="12">VAD</text>
                  <rect x="415" y="15" width="180" height="60" rx="6" fill="#0f172a"/><text x="505" y="50" textAnchor="middle" fill="#e5e7eb" fontSize="12">CBT Feedback</text>
                  <path d="M145 45 L155 45" stroke="#64748b"/><path d="M295 45 L305 45" stroke="#64748b"/><path d="M405 45 L415 45" stroke="#64748b"/>
                </svg>
              </div>
              <Button onClick={()=>setStep(3)}>Continue</Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm">Step 3: Consent</p>
              <div className="flex items-center gap-2 text-sm"><Switch checked={consent} onCheckedChange={setConsent}/> <span>I consent to use this mock locally.</span></div>
              <Button onClick={()=>setStep(4)} disabled={!consent}>Enter Session</Button>
            </div>
          )}
                        </Card>
        </motion.div>
      ) : null}

      {step >= 4 && (
        <div className="grid grid-cols-1 gap-3 justify-items-center">
          {/* Left: Video */}
          <motion.div initial={mounted? {opacity:0, y:6}: false} animate={mounted? {opacity:1, y:0}: undefined} transition={{duration:0.25, delay:0.05}}>
            <Card className="p-2 space-y-2 bg-gradient-to-b from-primary/5 to-background max-w-4xl w-full mx-auto">
            <div className="text-sm font-medium">Video Area</div>
            <div>
              <div className="relative aspect-video bg-black rounded overflow-hidden">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline aria-label="내 비디오 미리보기" />
                <div className="absolute top-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">FPS {fps}</div>
                {/* 상단 우측 '자세히' 라운드 버튼 */}
                <div className="absolute top-2 right-2 z-10">
                  <Button size="sm" onClick={()=>setDetailsOpen(true)} className="h-7 rounded-full bg-black/50 text-white hover:bg-black/60 backdrop-blur px-3 py-1">자세히</Button>
                </div>
                {/* Friendly tip bubble just under details button */}
                {currentTip && (
                  <div className="absolute top-12 right-2 max-w-[60%] z-10">
                    <BubbleOverlay text={`${currentTip.insight} — ${currentTip.action}`} />
                  </div>
                )}
                {/* Exit & privacy */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                  <Button size="sm" variant="secondary" className="h-7 rounded-full px-3 py-1" onClick={()=>window.location.assign('/home')}>나가기</Button>
                  <span className="text-[10px] text-white/80 bg-black/40 rounded px-2 py-0.5">로컬에서만 작동 · 외부 전송 없음</span>
                </div>
                {/* Mood chips (bottom-left) */}
                <div className="absolute bottom-2 left-2 z-10">
                  <MoodChips v={vadNow.v} a={arousal} d={vadNow.d} />
                </div>
                {/* Action bar removed by request */}
              </div>
            </div>
          </Card>
          </motion.div>

          {/* Center column hidden to emphasize video-call UX */}
          {false && (
            <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{duration:0.25, delay:0.08}}>
              <Card className="p-2 space-y-2 bg-gradient-to-b from-secondary/10 to-background" />
            </motion.div>
          )}
          <DetailsSheet open={detailsOpen} onClose={()=>setDetailsOpen(false)}>
            <div className="space-y-2">
              <div className="text-sm font-medium">분석 보기</div>
              <LinePlot data={rmsSeries} color="#22c55e" height={64} label="RMS" yHint="0–1" cursorT={cursorT} ariaLabel="최근 10초 RMS" />
              <LinePlot data={pitchSeries.map(p=>({t:p.t,v:Math.min(1,p.v/400)}))} color="#3b82f6" height={64} label="Pitch" yHint="~60–400Hz" cursorT={cursorT} ariaLabel="피치 트렌드(정규화)" />
              <LinePlot data={vadSeries} color="#f59e0b" height={48} label="Valence timeline" yHint="0–1" cursorT={cursorT} ariaLabel="Valence 타임라인" />
              <div className="grid grid-cols-2 gap-2">
                <Scatter points={[{x: vadNow.v, y: arousal}]} height={100} label="Valence vs Arousal" ariaLabel="Valence vs Arousal" />
                <Scatter points={[{x: arousal, y: vadNow.d}]} height={100} label="Arousal vs Dominance" ariaLabel="Arousal vs Dominance" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-xs">융합 가중치</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>텍스트 기분 {weights.valenceRule}</div>
                  <div>미소 지표 {weights.valenceSmile}</div>
                  <div>오디오 에너지 {weights.arousalAudio}</div>
                  <div>표정 에너지 {weights.arousalFace}</div>
                  <div>텍스트 주도성 {weights.dominanceText}</div>
                </div>
              </div>
              <div className="flex justify-end pt-2"><Button size="sm" variant="secondary" onClick={()=>setDetailsOpen(false)}>닫기</Button></div>
            </div>
          </DetailsSheet>

          {/* Right: Chat removed by request */}
        </div>
      )}

      {/* CBT card removed – handled by TipCard above */}

      {/* Session tools, Dashboard, Expert mode removed by request */}

      {/* Footer checklist */}
      {step >= 4 && (
        <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} transition={{duration:0.25, delay:0.23}}>
          <Card className="p-3 text-xs grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            "권한 및 온보딩 상태 유지",
            "영상 오버레이에 표정 지표 표시",
            "오디오 RMS/Pitch 그래프",
            "턴 단위 텍스트 분석 동작",
            "타임라인 커서 가시화",
            "V/A/D 융합 및 타임라인 업데이트",
            "현재 상태에 맞는 제안 표시",
            "북마크/저장(localStorage) 동작",
            "보고서 인쇄 대화상자",
            "대시보드 집계 표시",
          ].map((t,i)=> (
            <div key={i} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"/><span>{t}</span></div>
          ))}
        </Card>
        </motion.div>
      )}
    </div>
  );
}

function DashboardGrid({ sessions, days }: { sessions: StoredSession[]; days: number }) {
  const cutoff = Date.now() - days*24*3600*1000;
  const within = sessions.filter(s => s.createdAt >= cutoff);
  const byDay = new Map<string, { v:number; a:number; d:number; n:number }>();
  for (const s of within) {
    const key = new Date(new Date(s.createdAt).toDateString()).toISOString();
    const sum = s.vadTimeline.reduce((acc,x)=>({ v: acc.v + x.v, a: acc.a + x.a, d: acc.d + x.d }), { v:0,a:0,d:0 });
    const n = Math.max(1, s.vadTimeline.length);
    const avgV = sum.v / n; const avgA = sum.a / n; const avgD = sum.d / n;
    const prev = byDay.get(key) || { v: 0, a: 0, d: 0, n: 0 };
    byDay.set(key, { v: prev.v + avgV, a: prev.a + avgA, d: prev.d + avgD, n: prev.n + 1 });
  }
  const daysArr = [...byDay.entries()].sort((a,b)=>a[0]<b[0]? -1:1).map(([k,v])=>({ day:k, v:v.v/v.n, a:v.a/v.n, d:v.d/v.n }));
  return (
    <div className="grid grid-cols-7 gap-1">
      {daysArr.map((d,i)=> (
        <div key={i} className="h-6 rounded" title={`V ${fmt2(d.v)} A ${fmt2(d.a)} D ${fmt2(d.d)}`} style={{ background: `linear-gradient(90deg, rgba(34,197,94,${d.v}), rgba(59,130,246,${d.a}))` }} />
      ))}
      {daysArr.length===0 && <div className="text-xs text-muted-foreground">No sessions.</div>}
    </div>
  );
}

// Lightweight, friendly summary card
function MoodCard({ title, note, v, a, d, spark, cursorT }: { title: string; note: string; v: number; a: number; d: number; spark: { t:number; v:number }[]; cursorT?: number }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">지금의 상태</div>
        <div className="text-xs text-muted-foreground">최근 ~10초</div>
      </div>
      <div className="text-base font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{note}</div>
      <div className="grid grid-cols-3 gap-2 text-xs mt-1">
        <span className="badge" title="기분(Valence)">V {fmt2(v)}</span>
        <span className="badge" title="에너지(Arousal)">A {fmt2(a)}</span>
        <span className="badge" title="주도성(Dominance)">D {fmt2(d)}</span>
      </div>
      <div className="mt-2">
        <LinePlot data={spark} color="#10b981" height={40} yHint="" cursorT={cursorT} ariaLabel="요약 스파크라인" showGrid={false} />
      </div>
    </Card>
  );
}

// Warm suggestion card
function TipCard({ insight, action, onRegenerate, onAttach, disabledAttach }: { insight: string; action: string; onRegenerate: ()=>void; onAttach: ()=>void; disabledAttach?: boolean }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="text-sm font-medium">따뜻한 제안</div>
      <div className="text-sm">{insight} <span className="opacity-70">— {action}</span></div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onRegenerate}>다른 제안 보기</Button>
        <Button size="sm" variant="secondary" disabled={!!disabledAttach} onClick={onAttach}>턴에 연결</Button>
      </div>
    </Card>
  );
}

// Simple bottom sheet for details
function DetailsSheet({ open, onClose, children }: { open: boolean; onClose: ()=>void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-4 sm:top-4 sm:w-[520px] sm:bottom-auto bg-background border rounded-t-xl sm:rounded-xl shadow-lg p-4 max-h-[80vh] overflow-auto">
        {children}
      </div>
    </div>
  );
}

// Coach pill
function CoachCapsule({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-black/50 text-white text-[11px] backdrop-blur">
      <span className="inline-block w-4 h-4 rounded-full bg-white/80" />
      <span>{name}</span>
    </div>
  );
}

// Speech bubble
function BubbleOverlay({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="rounded-lg bg-white/90 dark:bg-slate-800/90 text-foreground text-xs shadow px-2 py-1.5">
        {text}
      </div>
    </motion.div>
  );
}

// Mood chips (V/A/D)
function MoodChips({ v, a, d }: { v: number; a: number; d: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="badge">기분 {fmt2(v)}</span>
      <span className="badge">에너지 {fmt2(a)}</span>
      <span className="badge">주도성 {fmt2(d)}</span>
    </div>
  );
}

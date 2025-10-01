"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getSession, summarizeSession, setSessionNotes, setSessionTags, toggleFavorite } from "@/app/bemore-test/store";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sess, setSess] = useState<ReturnType<typeof getSession> | null>(null);

  useEffect(() => {
    setMounted(true);
    setSess(getSession(sessionId) ?? null);
  }, [sessionId]);

  // Declare all hooks unconditionally to preserve order
  const avg = useMemo(() => {
    if (!sess) return { avgV: 0, avgA: 0, avgD: 0 };
    return summarizeSession(sess);
  }, [sess]);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [fav, setFav] = useState(false);
  const moments = useMemo(() => (sess?.bookmarks ?? []).slice(0,3), [sess]);
  const tip = useMemo(() => sess?.tipsUsed?.[0], [sess]);

  useEffect(() => {
    if (!sess) return;
    setTags((sess.tags ?? []).join(", "));
    setNotes(sess.notes ?? "");
    setFav(!!sess.favorite);
  }, [sess]);

  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 w-full max-w-md text-center text-sm text-muted-foreground">불러오는 중…</Card>
      </div>
    );
  }

  if (!sess) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 w-full max-w-md text-center space-y-3">
          <div className="text-sm">리포트를 찾을 수 없어요.</div>
          <Button onClick={()=>router.replace("/home")}>홈으로</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">오늘의 리포트</h1>
        <p className="text-sm text-muted-foreground">{mounted ? new Date(sess.createdAt).toLocaleString() : ""}</p>
        <p className="text-xs text-muted-foreground">이 리포트는 이 브라우저에만 저장되며 외부로 전송되지 않습니다.</p>
      </header>
      <Card className="p-4 space-y-2 bg-gradient-to-b from-primary/5 to-background" aria-labelledby="report-summary-heading">
        <div id="report-summary-heading" className="text-sm">요약</div>
        <p className="text-xs text-muted-foreground">오늘 마음, 차분한 편이에요</p>
        <dl className="flex gap-2 text-xs">
          <div>
            <dt className="sr-only">기분(Valence)</dt>
            <dd className="badge" aria-label={`기분 ${avg.avgV.toFixed(2)}`}>기분 {avg.avgV.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="sr-only">에너지(Arousal)</dt>
            <dd className="badge" aria-label={`에너지 ${avg.avgA.toFixed(2)}`}>에너지 {avg.avgA.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="sr-only">주도성(Dominance)</dt>
            <dd className="badge" aria-label={`주도성 ${avg.avgD.toFixed(2)}`}>주도성 {avg.avgD.toFixed(2)}</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-4 space-y-2 bg-gradient-to-b from-secondary/10 to-background">
        <div className="text-sm">하이라이트</div>
        {moments.length === 0 && <div className="text-xs text-muted-foreground">표시할 순간이 없어요.</div>}
        {moments.map((m,i)=> (
          <div key={i} className="text-xs flex items-center gap-2">
            <span className="w-16 text-muted-foreground">{mounted ? new Date(m.t).toLocaleTimeString() : ""}</span>
            <span className="badge">V {m.v.toFixed(2)}</span>
            <span className="badge">A {m.a.toFixed(2)}</span>
            <span className="badge">D {m.d.toFixed(2)}</span>
          </div>
        ))}
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm">따뜻한 제안</div>
        {!tip && <div className="text-xs text-muted-foreground">사용된 제안이 없어요.</div>}
        {tip && <div className="text-sm">{tip.insight} <span className="opacity-70">— {tip.action}</span></div>}
      </Card>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm">개인 메모 · 태그</div>
          <label className="flex items-center gap-2 text-xs">
            <span>즐겨찾기</span>
            <Switch checked={fav} onCheckedChange={(v)=>{ setFav(v); toggleFavorite(sess.id); }} aria-label="즐겨찾기" />
          </label>
        </div>
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">태그 (쉼표로 구분)</label>
            <input
              className="w-full rounded border bg-background px-3 py-2 text-sm"
              placeholder="예: 아침, 출근, 감사"
              value={tags}
              onChange={(e)=>setTags(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={()=>{
                const arr = tags.split(",").map(t=>t.trim()).filter(Boolean);
                setSessionTags(sess.id, arr);
              }}>태그 저장</Button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">추가 메모</label>
            <textarea
              className="w-full min-h-[96px] rounded border bg-background px-3 py-2 text-sm"
              placeholder="오늘을 한 문장으로 기록해 보세요."
              value={notes}
              onChange={(e)=>setNotes(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={()=>{ setSessionNotes(sess.id, notes); }}>메모 저장</Button>
            </div>
          </div>
        </div>
      </Card>
      <div className="flex justify-between">
        <Button variant="secondary" onClick={()=>router.replace("/home")}>홈으로</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={()=>window.print()}>PDF로 저장</Button>
          <Button onClick={()=>router.replace("/history")}>모든 분석 결과 보기</Button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listSessions, getSession, summarizeSession } from "@/app/bemore-test/store";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sess = getSession(sessionId);
  if (!sess) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 w-full max-w-md text-center space-y-3">
          <div className="text-sm">리포트를 찾을 수 없어요.</div>
          <Button onClick={()=>router.replace("/onboarding")}>홈으로</Button>
        </Card>
      </div>
    );
  }
  const avg = summarizeSession(sess);
  const moments = sess.bookmarks.slice(0,3);
  const tip = sess.tipsUsed[0];
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">오늘의 리포트</h1>
        <p className="text-sm text-muted-foreground">{new Date(sess.createdAt).toLocaleString()}</p>
      </header>
      <Card className="p-4 space-y-2">
        <div className="text-sm">요약</div>
        <div className="text-xs text-muted-foreground">오늘 마음, 차분한 편이에요</div>
        <div className="flex gap-2 text-xs">
          <span className="badge">기분 {avg.avgV.toFixed(2)}</span>
          <span className="badge">에너지 {avg.avgA.toFixed(2)}</span>
          <span className="badge">주도성 {avg.avgD.toFixed(2)}</span>
        </div>
      </Card>
      <Card className="p-4 space-y-2">
        <div className="text-sm">하이라이트</div>
        {moments.length === 0 && <div className="text-xs text-muted-foreground">표시할 순간이 없어요.</div>}
        {moments.map((m,i)=> (
          <div key={i} className="text-xs flex items-center gap-2">
            <span className="w-16 text-muted-foreground">{new Date(m.t).toLocaleTimeString()}</span>
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
      <div className="flex justify-between">
        <Button variant="secondary" onClick={()=>router.replace("/onboarding")}>홈으로</Button>
        <Button onClick={()=>router.replace("/history")}>모든 분석 결과 보기</Button>
      </div>
    </div>
  );
}

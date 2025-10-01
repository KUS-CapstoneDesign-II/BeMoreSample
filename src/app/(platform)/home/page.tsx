"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getDailyStreak, getWeeklyProgress, listSessions, summarizeSession, getProgramProgress } from "@/app/bemore-test/store";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState([] as ReturnType<typeof listSessions>);
  const [streak, setStreak] = useState({ streak: 0, todayHasSession: false });
  const [weekly, setWeekly] = useState({ completed: 0, target: 5, ratio: 0 });
  const [prog, setProg] = useState<{ day: number; total: number } | null>(null);
  const [greet, setGreet] = useState("안녕하세요");

  useEffect(() => {
    setMounted(true);
    setSessions(listSessions().slice(0,3));
    setStreak(getDailyStreak());
    setWeekly(getWeeklyProgress());
    const p = getProgramProgress("mindfulness-7");
    setProg({ day: p?.day ?? 0, total: p?.totalDays ?? 7 });
    const h = new Date().getHours();
    setGreet(h < 12 ? "좋은 아침이에요" : h < 18 ? "좋은 오후예요" : "좋은 저녁이에요");
  }, []);

  if (!mounted) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">BeMore</h1>
          <p className="text-sm text-muted-foreground">오늘도 잠깐 마음을 돌아볼까요?</p>
        </header>
        <Card className="p-4 text-sm text-muted-foreground">불러오는 중…</Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="space-y-3">
        <div className="rounded-2xl p-6 bg-gradient-to-b from-primary/10 to-background">
          <div className="text-sm text-muted-foreground">{greet}</div>
          <h1 className="text-xl font-semibold mt-1">오늘도 가볍게 마음을 살펴볼까요?</h1>
          <p className="text-sm text-muted-foreground mt-1">3분이면 충분해요. 당신의 데이터는 이 브라우저에만 머물러요.</p>
          <div className="mt-3 flex gap-2">
            <Button asChild>
              <Link href="/bemore-test" aria-label="오늘 기록 시작">바로 기록하기</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/history">최근 흐름 보기</Link>
            </Button>
          </div>
        </div>
      </header>
      <Card className="p-6 flex items-center justify-between bg-gradient-to-b from-primary/5 to-background">
        <div className="space-y-1 text-sm">
          <div>연속 {streak.streak}일 기록 {streak.todayHasSession ? "· 오늘 완료" : "· 오늘 미기록"}</div>
          <div className="flex items-center gap-2">
            <div className="grow h-2 rounded bg-muted overflow-hidden">
              <div className="h-2 bg-primary" style={{ width: `${Math.round(weekly.ratio*100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-20 text-right">{weekly.completed}/{weekly.target}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/bemore-test" aria-label="오늘 기록 시작">오늘 기록하기</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/programs">가이드</Link>
          </Button>
        </div>
      </Card>
      {prog && (
        <Card className="p-6 flex items-center justify-between bg-gradient-to-b from-secondary/10 to-background">
          <div className="space-y-1 text-sm">
            <div>추천 프로그램: 마음챙김 7일</div>
            <div className="flex items-center gap-2">
              <div className="w-40 h-2 rounded bg-muted overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${Math.round((prog.day/prog.total)*100)}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{prog.day}/{prog.total}</span>
            </div>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href="/programs">{prog.day>0?"계속하기":"시작하기"}</Link>
          </Button>
        </Card>
      )}
      <Card className="p-6 space-y-3">
        <div className="text-sm">최근 리포트</div>
        {sessions.length === 0 && (
          <div className="text-xs text-muted-foreground">
            아직 리포트가 없어요. 부담 없이 오늘의 마음을 한 번 기록해 볼까요?
            <span className="ml-2 inline-block">
              <Button asChild size="sm" variant="secondary"><Link href="/bemore-test">지금 기록하기</Link></Button>
            </span>
          </div>
        )}
        {sessions.map((s)=>{
          const avg = summarizeSession(s);
          return (
            <Link key={s.id} href={`/report/${s.id}`} className="block text-xs py-2 border-b last:border-b-0">
              <span className="text-muted-foreground mr-2">{new Date(s.createdAt).toLocaleString()}</span>
              <span className="badge">V {avg.avgV.toFixed(2)}</span>
              <span className="badge ml-1">A {avg.avgA.toFixed(2)}</span>
              <span className="badge ml-1">D {avg.avgD.toFixed(2)}</span>
            </Link>
          );
        })}
      </Card>
      <Card className="p-6 flex items-center justify-between">
        <div className="text-sm">추천</div>
        <Link href="/programs" className="underline text-xs">마음챙김 1주 코스 살펴보기</Link>
      </Card>
    </div>
  );
}




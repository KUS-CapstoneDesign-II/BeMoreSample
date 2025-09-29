"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getDailyStreak, getWeeklyProgress, listSessions, summarizeSession, getProgramProgress } from "@/app/bemore-test/store";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState([] as ReturnType<typeof listSessions>);
  const [streak, setStreak] = useState({ streak: 0, todayHasSession: false });
  const [weekly, setWeekly] = useState({ completed: 0, target: 5, ratio: 0 });
  const [prog, setProg] = useState<{ day: number; total: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessions(listSessions().slice(0,3));
    setStreak(getDailyStreak());
    setWeekly(getWeeklyProgress());
    const p = getProgramProgress("mindfulness-7");
    setProg({ day: p?.day ?? 0, total: p?.totalDays ?? 7 });
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
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">BeMore</h1>
        <p className="text-sm text-muted-foreground">오늘의 마음을 3분만 살펴보고 가벼워지세요.</p>
      </header>
      <Card className="p-4 flex items-center justify-between">
        <div className="space-y-1 text-sm">
          <div>연속 {streak.streak}일 기록 {streak.todayHasSession ? "· 오늘 완료" : "· 오늘 미기록"}</div>
          <div className="flex items-center gap-2">
            <div className="grow h-2 rounded bg-muted overflow-hidden">
              <div className="h-2 bg-primary" style={{ width: `${Math.round(weekly.ratio*100)}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-20 text-right">{weekly.completed}/{weekly.target}</span>
          </div>
        </div>
        <Link href="/bemore-test" aria-label="오늘 기록 시작" className="rounded bg-primary text-primary-foreground px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">오늘 기록하기</Link>
      </Card>
      {prog && (
        <Card className="p-4 flex items-center justify-between">
          <div className="space-y-1 text-sm">
            <div>추천 프로그램: 마음챙김 7일</div>
            <div className="flex items-center gap-2">
              <div className="w-40 h-2 rounded bg-muted overflow-hidden">
                <div className="h-2 bg-primary" style={{ width: `${Math.round((prog.day/prog.total)*100)}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{prog.day}/{prog.total}</span>
            </div>
          </div>
          <Link href="/programs" className="underline text-xs">{prog.day>0?"계속하기":"시작하기"}</Link>
        </Card>
      )}
      <Card className="p-4 space-y-2">
        <div className="text-sm">최근 리포트</div>
        {sessions.length === 0 && <div className="text-xs text-muted-foreground">아직 리포트가 없어요. 오늘 첫 기록을 시작해 보세요.</div>}
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
      <Card className="p-4 flex items-center justify-between">
        <div className="text-sm">추천</div>
        <Link href="/programs" className="underline text-xs">마음챙김 1주 코스 살펴보기</Link>
      </Card>
    </div>
  );
}



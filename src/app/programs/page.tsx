"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { bumpProgramDay, getProgramProgress } from "@/app/bemore-test/store";

export default function ProgramsPage() {
  const courses = [
    { id: "mindfulness-7", title: "마음챙김 7일", minutes: 7 },
    { id: "sleep-7", title: "부드러운 수면 7일", minutes: 6 },
  ];
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">프로그램</h1>
        <p className="text-sm text-muted-foreground">5~10분 마이크로 과제로 가볍게 시작해요.</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {courses.map(c => {
          const progress = typeof window !== "undefined" ? getProgramProgress(c.id) : undefined;
          const day = progress?.day ?? 0;
          const total = progress?.totalDays ?? 7;
          const pct = Math.round((day/total)*100);
          return (
            <Card key={c.id} className="p-6 text-sm space-y-2 bg-gradient-to-b from-primary/5 to-background">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div>{c.title}</div>
                  <div className="text-xs text-muted-foreground">하루 {c.minutes}분 · {total}일</div>
                </div>
                <Button size="sm" variant="secondary" aria-label={`${c.title} ${day>0?"계속하기":"시작하기"}`} onClick={()=>{ bumpProgramDay(c.id, c.title, total); location.reload(); }}>{day>0?"계속하기":"시작"}</Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="grow h-2 rounded bg-muted overflow-hidden">
                  <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-muted-foreground w-16 text-right">{day}/{total}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}



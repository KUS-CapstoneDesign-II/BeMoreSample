"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReminder } from "@/app/bemore-test/store";

export default function MePage() {
  const reminder = typeof window !== "undefined" ? getReminder() : { enabled: false, time: "20:00" };
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">내 정보</h1>
        <p className="text-sm text-muted-foreground">익명 프로필과 기본 설정을 관리해요.</p>
      </header>
      <Card className="p-4 text-sm bg-gradient-to-b from-primary/5 to-background">
        <div className="text-xs text-muted-foreground">프로필(익명), 태그/즐겨찾기/메모 관리, 알림·리마인더·프라이버시 설정(모크)</div>
        <div className="mt-2 text-xs">리마인더: {reminder.enabled ? `사용 · ${reminder.time}` : "사용 안 함"}</div>
        <div className="mt-3">
          <Button size="sm" variant="secondary" disabled>설정 열기(모크)</Button>
        </div>
      </Card>
    </div>
  );
}



"use client";
import { Card } from "@/components/ui/card";

export default function LibraryPage() {
  const items = [
    { id: "cbreframe", title: "생각 재구성(CBT) 3단계", type: "글" },
    { id: "breath", title: "4-6 호흡 가이드", type: "가이드" },
    { id: "emotion", title: "감정의 3요소: V-A-D", type: "글" },
  ];
  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">라이브러리</h1>
        <p className="text-sm text-muted-foreground">짧은 읽을거리와 실습 가이드를 모았어요.</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(i => (
          <Card key={i.id} className="p-4 text-sm flex items-center justify-between">
            <div>{i.title}</div>
            <button className="text-xs underline" disabled>읽기(모크)</button>
          </Card>
        ))}
      </div>
    </div>
  );
}



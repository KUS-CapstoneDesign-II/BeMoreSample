"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

function LoadingBody() {
  const sp = useSearchParams();
  const router = useRouter();
  const sid = sp.get("sid");
  useEffect(() => {
    const t = setTimeout(() => {
      if (sid) router.replace(`/report/${sid}`);
      else router.replace("/onboarding");
    }, 1600);
    return () => clearTimeout(t);
  }, [sid, router]);
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="p-6 w-full max-w-md text-center space-y-3">
        <div className="text-sm text-muted-foreground">분석 중이에요… 잠시만 기다려주세요</div>
        <div className="h-2 w-full rounded bg-muted overflow-hidden">
          <div className="h-2 bg-primary animate-pulse rounded" style={{ width: "60%" }} />
        </div>
      </Card>
    </div>
  );
}

export default function LoadingReport() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">분석 중…</div>}>
      <LoadingBody />
    </Suspense>
  );
}

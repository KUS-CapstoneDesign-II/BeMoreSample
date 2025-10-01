"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { getOnboarding } from "@/app/bemore-test/store";

const tabs = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/bemore-test", label: "기록", icon: "🎙️" },
  { href: "/community", label: "커뮤니티", icon: "🌿" },
  { href: "/programs", label: "프로그램", icon: "🎯" },
  { href: "/library", label: "라이브러리", icon: "📚" },
  { href: "/me", label: "내 정보", icon: "🙂" },
];

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(()=>{
    try {
      const ob = getOnboarding();
      const done = !!ob.consent && (ob.step ?? 0) >= 4;
      if (!done) router.replace("/onboarding");
    } catch {}
  }, [router]);
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 pb-16">
        <div className="sr-only" aria-live="polite">이 서비스는 브라우저에서만 로컬로 작동합니다. 데이터는 외부로 전송되지 않습니다.</div>
        {children}
      </main>
      <nav aria-label="하단 탭" role="navigation" className="fixed bottom-0 inset-x-0 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl grid grid-cols-6">
          {tabs.map((t)=>{
            const active = pathname === t.href || (t.href !== "/bemore-test" && pathname?.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active?"page":undefined}
                className={`flex flex-col items-center justify-center py-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span aria-hidden className={`text-base leading-none ${active?"scale-110":"opacity-80"}`}>{t.icon}</span>
                <span className="mt-1">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}



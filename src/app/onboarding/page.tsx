"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OnboardingStep } from "@/components/ui/OnboardingStep";
import { brand } from "@/theme/colors";
import { getOnboarding, setOnboarding } from "@/app/bemore-test/store";

const steps = [1,2,3,4] as const;

function IconCam(){return (<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M15 10l4-3v10l-4-3v2H4V8h11v2z" stroke="currentColor" strokeWidth="1.5"/></svg>)}
function IconMic(){return (<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="8" y="3" width="8" height="12" rx="4" stroke="currentColor" strokeWidth="1.5"/><path d="M12 19v2m-5-8a5 5 0 0010 0" stroke="currentColor" strokeWidth="1.5"/></svg>)}
function IconHeart(){return (<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 21s-7-4.35-7-10a4 4 0 017-3 4 4 0 017 3c0 5.65-7 10-7 10z" stroke="currentColor" strokeWidth="1.5"/></svg>)}

export default function OnboardingPage(){
  const stored = getOnboarding();
  const [step, setStep] = useState<typeof steps[number]>((stored.step ?? 1) as any);
  const [camOk, setCamOk] = useState<"idle"|"granted"|"denied">("idle");
  const [micOk, setMicOk] = useState<"idle"|"granted"|"denied">("idle");
  const progress = (step/steps.length)*100;

  useEffect(()=>{ document.title = "BeMore Onboarding"; },[]);
  useEffect(()=>{ setOnboarding({ step, consent: stored.consent ?? false }); }, [step]);
  useEffect(()=>{ if (stored.step >= 4 && stored.consent) window.location.href = "/bemore-test"; }, []);

  async function requestCamera(){
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setCamOk("granted");
      setTimeout(()=>setStep(3), 500);
    } catch {
      setCamOk("denied");
    }
  }
  async function requestMic(){
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicOk("granted");
      setTimeout(()=>setStep(4), 500);
    } catch {
      setMicOk("denied");
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-xl p-6 space-y-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">BeMore 시작하기</h1>
            <span className="text-xs text-muted-foreground">따뜻하고 안전한 공간으로 안내해요</span>
          </div>
          <Progress value={progress} />
        </div>
        <AnimatePresence mode="wait">
          {step===1 && (
            <motion.div key="s1" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}>
              <OnboardingStep
                icon={<IconHeart/>}
                title="BeMore와 함께 시작해보세요"
                description="표정과 목소리, 그리고 말의 온도를 이해해 더 나은 하루를 돕습니다. 당신의 데이터는 이 브라우저에서만 안전하게 처리돼요."
                cta={{ label:"다음", onClick:()=>setStep(2) }}
              >
                <div className="rounded-md p-4 bg-primary/10 text-sm">준비하고 있어요... 잠시 후 가벼운 안내와 권한 요청이 이어집니다.</div>
              </OnboardingStep>
            </motion.div>
          )}
          {step===2 && (
            <motion.div key="s2" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}>
              <OnboardingStep
                icon={<IconCam/>}
                title="표정으로 감정을 이해해요"
                description="카메라를 통해 미소, 눈, 이마 움직임 같은 표정 신호를 가볍게 살핍니다. 불편하다면 언제든 끌 수 있어요."
                cta={{ label: camOk==="granted"?"완료":"카메라 허용", onClick: requestCamera }}
                secondaryCta={{ label: "건너뛰기", onClick: ()=>setStep(3) }}
              >
                {camOk==="denied" && <Alert><AlertDescription>카메라를 사용할 수 없어요. 설정에서 허용하거나 나중에 다시 시도해 주세요.</AlertDescription></Alert>}
              </OnboardingStep>
            </motion.div>
          )}
          {step===3 && (
            <motion.div key="s3" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}>
              <OnboardingStep
                icon={<IconMic/>}
                title="목소리의 감정을 들어요"
                description="마이크 신호로 볼륨과 높낮이 변화를 감지해 현재의 에너지를 파악합니다. 내용은 저장하지 않아요."
                cta={{ label: micOk==="granted"?"완료":"마이크 허용", onClick: requestMic }}
                secondaryCta={{ label: "건너뛰기", onClick: ()=>setStep(4) }}
              >
                {micOk==="denied" && <Alert><AlertDescription>마이크를 사용할 수 없어요. 설정에서 허용하거나 나중에 다시 시도해 주세요.</AlertDescription></Alert>}
              </OnboardingStep>
            </motion.div>
          )}
          {step===4 && (
            <motion.div key="s4" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}>
              <OnboardingStep
                icon={<IconHeart/>}
                title="어떻게 작동하나요?"
                description="말(Verbal) + 표정/목소리(Nonverbal)를 결합해 감정 좌표(VAD)를 만들고, 따뜻한 제안을 드립니다. 모든 처리는 브라우저에서만 수행돼요."
                cta={{ label:"세션으로 이동", onClick:()=>{ setOnboarding({ step: 4, consent: true }); window.location.href = "/bemore-test"; } }}
              >
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md p-3 bg-secondary/20">말하기
                    <div className="opacity-70">단어의 온도</div>
                  </div>
                  <div className="rounded-md p-3 bg-primary/20">표정/목소리
                    <div className="opacity-70">표정 · 톤</div>
                  </div>
                  <div className="rounded-md p-3 bg-amber-200/40">VAD & 제안
                    <div className="opacity-70">따뜻한 피드백</div>
                  </div>
                </div>
              </OnboardingStep>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>도움말: 언제든지 권한을 끄고 노이즈 모드로 사용할 수 있어요.</span>
          <a className="underline" href="/bemore-test">건너뛰기</a>
        </div>
      </Card>
      {/* Minimal bottom nav for onboarding (since platform layout doesn't wrap this route) */}
      <nav aria-label="하단 탭" role="navigation" className="fixed bottom-0 inset-x-0 border-t bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl grid grid-cols-6">
          {[
            { href: "/home", label: "홈", icon: "🏠" },
            { href: "/bemore-test", label: "기록", icon: "🎙️" },
            { href: "/community", label: "커뮤니티", icon: "🌿" },
            { href: "/programs", label: "프로그램", icon: "🎯" },
            { href: "/library", label: "라이브러리", icon: "📚" },
            { href: "/me", label: "내 정보", icon: "🙂" },
          ].map(t => (
            <Link key={t.href} href={t.href} className="flex flex-col items-center justify-center py-2 text-xs text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <span aria-hidden className="text-base leading-none">{t.icon}</span>
              <span className="mt-1">{t.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

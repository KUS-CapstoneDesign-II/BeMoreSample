# BeMore — 멀티모달 상담 (모크)

브라우저만으로 동작하는 감정 동반 서비스 프로토타입입니다. 말(텍스트), 소리(음성 RMS/피치), 얼굴 프록시를 가볍게 결합해 V/A/D(기분/에너지/주도성) 상태를 추정하고, 따뜻한 제안을 표시합니다. 서버/키 없음.

## 기술 스택
- Next.js 15 App Router + TypeScript
- TailwindCSS + shadcn/ui, Framer Motion
- MediaPipe Face(CDN), WebAudio API
- 경량 캔버스 차트(외부 차트 라이브러리 미사용)

## 시작하기
```bash
npm i
npm run dev
# http://localhost:3000/onboarding
```

## 라우트
- `/onboarding` — 온보딩(권한 안내, 튜토리얼, 동의)
- `/bemore-test` — 영상 중심 세션(권한 허용 또는 노이즈 모드)
- `/report/loading?sid=...` — “분석 중” 로딩(자동 전환)
- `/report/[sessionId]` — 결과 리포트(요약/하이라이트/제안)
- `/history` — 종합 분석 대시보드(추세 + 3D VAD)

## 핵심 UX
- 영상 우선 레이아웃: 큰 셀프뷰 + 오버레이(말풍선/칩)
- 상단 우측 ‘자세히’ → 분석 시트(스파크라인, RMS/피치, V 타임라인/스캐터)
- ‘상담 종료’ → 로컬 세션 저장 → 로딩 → 리포트 이동

## 종합 분석(/history)
- 추세: V/A/D 스파크라인
- 3D VAD: 드래그 회전, 휠 줌, 키보드(←→↑↓, Shift=미세)
- 프리셋 뷰: 아이소/정면/탑/사이드 전환
- 데모 데이터 생성 버튼 제공(빈 상태 빠른 체험)

## 사용 방법
- 카메라/마이크 허용 또는 노이즈 모드로 체험
- ‘상담 종료’로 리포트 생성, ‘모든 분석 결과 보기’로 아카이브 이동

## 안전·프라이버시(모크)
- 모든 처리는 브라우저에서만 수행됩니다
- 사용자 데이터가 외부로 전송되지 않습니다
- 임상의가 아닌 데모용 제안이며, 실제 상담/진단이 아닙니다

## 코드 맵
- `src/app/bemore-test/page.tsx` — 세션 화면(영상/오버레이/자세히/종료)
- `src/app/report/loading/page.tsx` — 분석 중 로딩
- `src/app/report/[sessionId]/page.tsx` — 리포트 화면
- `src/app/history/page.tsx` — 종합 분석(추세/3D/목록)
- `src/app/bemore-test/useAudio.ts` — RMS, 피치, 각성도 프록시
- `src/app/bemore-test/useFace.ts` — MediaPipe 로더 + 얼굴 프록시
- `src/app/bemore-test/useTranscript.ts` — 단순 텍스트 규칙
- `src/app/bemore-test/vad.ts` — 순수 유틸(클램프, EMA, 링 버퍼, 융합)
- `src/app/bemore-test/cbt.ts` — 제안 버킷/순환

## 개발 노트
- FPS 제한: 얼굴 ~15, 오디오 ~50, 차트 ≤30, 융합 500ms 간격
- 하이드레이션: 시간 의존 값은 클라이언트 마운트 후 갱신
- 경로 별칭: `@/*` → `src/*` (`tsconfig.json`)

## 라이선스
데모 목적의 예시 코드입니다. 자체 책임 하에 사용해 주세요.

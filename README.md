# BeMore — 멀티모달 감정 케어(모크)

브라우저만으로 동작하는 감정 동반 서비스 프로토타입입니다. 말(텍스트), 소리(RMS/피치), 얼굴 프록시를 결합해 V/A/D(기분·에너지·주도성)를 추정하고, 따뜻한 제안을 제시합니다. 서버 호출/비밀키 없음.

## 기술 스택
- Next.js 15(App Router) + TypeScript
- TailwindCSS + shadcn/ui, Framer Motion
- MediaPipe Face Landmarker(CDN), WebAudio API
- 경량 Canvas/SVG 컴포넌트(외부 차트 라이브러리 미사용)

## 시작하기
```bash
npm i
npm run dev
# http://localhost:3000  (최초 접속 시 /onboarding 가드)
```

## 플랫폼 구조(모바일 하단 탭)
- 홈(`/home`): 인사, 연속 기록(스트릭), 주간 목표, 최근 리포트 3개, 빠른 진입 CTA
- 기록(`/bemore-test`): 영상통화 느낌의 세션, 상단 ‘자세히’로 분석 시트
- 커뮤니티(`/community`): 주제 탭, 한 문장 글쓰기(익명, 로컬 모크), 공감(좋아요)
- 프로그램(`/programs`): 1주 코스(진행률 저장), 계속하기
- 라이브러리(`/library`): 간단 읽을거리/가이드(모크)
- 내 정보(`/me`): 익명 프로필, 리마인더 요약(모크)

## 라우트
- `/onboarding` — 권한 안내/동의(완료 전 플랫폼 접근 차단)
- `/bemore-test` — 영상 중심 세션(권한 허용 또는 노이즈 모드)
- `/report/loading?sid=...` — 분석 중(자동 전환)
- `/report/[sessionId]` — 리포트(요약/하이라이트/제안, 태그/메모/즐겨찾기 편집)
- `/history` — 종합 분석(추세 + 3D VAD, 즐겨찾기 고정, 태그 칩, 7/30/전체 필터)
- `/home` — 플랫폼 홈(2클릭 내 기록 시작)

## 핵심 UX
- 영상 우선: 큰 셀프뷰 + 상단 ‘자세히’ 버튼 + 말풍선형 가이드
- 메인 CTA: 하단 중앙 “오늘 기록하기” (홈/세션)
- 종료 플로우: 상담 종료 → 분석 중 → 리포트 → 홈/모든 분석 결과 보기
- 반복 장치: 연속 기록(스트릭), 주간 목표, 리마인더(모크)
- 저장 항목: 세션(태그/메모/즐겨찾기), 커뮤니티 글, 프로그램 진행률 — 모두 LocalStorage

## 종합 분석(/history)
- 추세: V/A/D 라인(스파크라인)
- 3D VAD: 드래그 회전, 휠 줌, 키보드(←→↑↓, Shift=미세), 프리셋(아이소/정면/탑/사이드)
- 연결선 표시: 세션 포인트들을 시간순으로 폴리라인 연결
- 빈 상태: “오늘 기록하기” + 데모 데이터 생성 버튼 제공

## 접근성·가독성 개선(요약)
- 하단 탭 라벨 한글화, `aria-current`/포커스 링 추가
- 홈 CTA/입력 등에 접근성 라벨 적용
- 리포트 요약을 `dl` 구조로 시맨틱 강화

## 안전·프라이버시(모크)
- 모든 처리는 브라우저 내부에서만 수행됩니다
- 사용자 데이터는 외부로 전송되지 않습니다
- 제안은 데모용 비의료 정보이며, 실제 상담/진단이 아닙니다

## 코드 맵
- `src/app/(platform)/layout.tsx` — 플랫폼 레이아웃(하단 탭·온보딩 가드)
- `src/app/home/page.tsx` — 홈(스트릭/주간 목표/최근 리포트/추천)
- `src/app/bemore-test/page.tsx` — 세션(영상/오버레이/자세히/종료)
- `src/app/report/loading/page.tsx` — 분석 중 로딩
- `src/app/report/[sessionId]/page.tsx` — 리포트(편집 가능: 태그/메모/즐겨찾기)
- `src/app/history/page.tsx` — 종합 분석(추세/3D/즐겨찾기/필터)
- `src/app/community/page.tsx` — 커뮤니티(주제/한 문장 글/공감)
- `src/app/programs/page.tsx` — 프로그램(진행률 저장/계속하기)
- `src/app/library/page.tsx` — 라이브러리(모크 콘텐츠)
- `src/app/me/page.tsx` — 내 정보(요약)
- `src/app/bemore-test/ui/Plot.tsx` — LinePlot/Scatter/Scatter3D(인터랙션)
- `src/app/bemore-test/store.ts` — LocalStorage CRUD(세션/온보딩/리마인더/커뮤니티/프로그램)
- `src/app/bemore-test/*` — 오디오/얼굴/텍스트 훅, VAD/CBT 유틸

## 개발 노트(성능/안정성)
- 하이드레이션: `mounted` 게이트로 로컬 값(Date/LS)은 마운트 후 반영
- 3D VAD 성능: `Scatter3D`에 `quality="fast"|"high"`, `maxPoints`로 디케이
- 융합 루프: 500ms 간격 업데이트(저전력)
- 키보드: 3D 뷰 `←→↑↓` 회전, `Shift` 미세 이동
- 경로 별칭: `@/*` → `src/*` (`tsconfig.json`)

## 라이선스
데모용 예시 코드입니다. 자체 책임 하에 사용해 주세요.

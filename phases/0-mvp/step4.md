# Step 4: dashboard-ui

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `/docs/UI_GUIDE.md` — 색상/컴포넌트/레이아웃/타이포/안티슬롭 규칙 (반드시 준수)
- `/docs/PRD.md` — 화면 3섹션(채널 분석 / 트렌드 / 추천), 완전 자동
- `/docs/ARCHITECTURE.md` — page는 동기 셸, 대시보드만 'use client'
- step 3 산출물: `src/app/api/analyze/route.ts`의 `TrendReport` 응답 형태
- step 1/2 산출물: `src/types.ts`의 타입(`VideoSummary`, `ScoredCandidate`, `Recommendation` 등)

## 작업

`/api/analyze`를 호출해 3섹션을 렌더하는 대시보드를 만든다. **완전 자동**(열면 바로 로드, 컨트롤은 새로고침 버튼 1개).

- `src/app/page.tsx` — 동기 서버 컴포넌트 셸. `<TrendDashboard />`를 감싼다. (async 금지)
- `src/components/TrendDashboard.tsx` — `'use client'`. 마운트 시 `fetch('/api/analyze')`. `useState`로 상태 **4종(loading / error / empty / success)** 관리. error는 API가 준 메시지(503/404/429)를 그대로 보여준다. 새로고침 버튼으로 재요청.
- `src/components/ChannelSummary.tsx` — ① 핵심 4지표(평균 조회수 / 주력 키워드 / 업로드 주기 / 베스트 TOP3).
- `src/components/TrendList.tsx` — ② 트렌드 목록(제목 / 조회속도 / 관련도).
- `src/components/RecommendationCard.tsx` — ③ 풍부한 추천 카드(제목 / 추천점수 / 근거 / 겹친 키워드 / 소스 영상 링크 `https://youtube.com/watch?v=<sourceVideoId>`).

UI_GUIDE를 엄격히 따른다: 다크 배경(#0a0a0a / #141414), 상승 포인트 #22c55e, `max-w-5xl` 좌측 정렬, fade-in만, 안티슬롭 표의 모든 항목 금지.

## Acceptance Criteria

```bash
npm run lint
npm run build
npm run test
```
(수동 확인은 사용자가 `.env.local`에 실제 키를 넣고 `npm run dev`로 `/` 접속해 진행한다.)

## 검증 절차

1. AC 통과 확인.
2. 체크리스트:
   - UI_GUIDE 안티슬롭(보라색 / glass / gradient-text / glow / orb / 균일 rounded-2xl) 위반이 없는가?
   - 클라이언트 컴포넌트가 `src/services/*`를 import하지 않는가? (키 노출 / 빌드 에러)
   - `src/app/page.tsx`가 동기인가?
   - loading / error / empty / success 4상태를 모두 처리하는가?
3. `phases/0-mvp/index.json` step 4 업데이트:
   - 성공 → `completed` + summary(생성 컴포넌트 목록, 3섹션 렌더 확인)
   - 실패/blocked 규칙 동일.

## 금지사항

- 클라이언트 컴포넌트에서 `src/services/youtube.ts`(server-only)를 import하지 마라. 이유: 빌드 에러 + 키 노출. 데이터는 `fetch('/api/analyze')`로만 가져온다.
- `src/app/page.tsx`를 async로 만들지 마라. 이유: Vitest 렌더 테스트 불가(ADR-003).
- 상태관리 라이브러리(Redux/Zustand 등)를 추가하지 마라. 이유: MVP, `useState`로 충분.
- UI_GUIDE의 안티슬롭 항목을 사용하지 마라.
- 기존 테스트를 깨뜨리지 마라.

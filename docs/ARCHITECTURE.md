# 아키텍처

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx               # 동기 서버 컴포넌트 셸
│   └── api/analyze/route.ts   # 유일한 서버 진입점: 오케스트레이션 + 키 사용
├── components/
│   ├── TrendDashboard.tsx     # 'use client' — /api/analyze fetch, 상태 관리
│   ├── ChannelSummary.tsx     # ① 내 채널 분석 (4지표)
│   ├── TrendList.tsx          # ② 지금 뜨는 트렌드
│   └── RecommendationCard.tsx # ③ 추천 카드
├── services/
│   └── youtube.ts             # YouTube Data API 래퍼 (import 'server-only')
├── lib/
│   ├── scoring.ts             # 순수함수: 키워드추출·virality·relevance·추천
│   └── env.ts                 # 환경변수 읽기/검증
└── types.ts                   # 공유 타입 (한 파일)
```
(types 폴더 대신 단일 `src/types.ts` 사용 — MVP 단순화)

## 패턴
- Server Components 기본. 데이터 패칭은 `app/api/analyze` 라우트 핸들러에서. 인터랙션(fetch/상태)이 필요한 대시보드만 `'use client'`.
- 레이어 3개(얇게): Presentation(app/page + components) / API 경계(route.ts) / Logic(services=외부 I/O, lib=순수 계산).
- 오케스트레이션(채널 해석 → 수집 → 점수화)은 별도 모듈 없이 `route.ts`가 직접 한다.

## 데이터 흐름
```
브라우저(components) → fetch('/api/analyze')
   → route.ts (서버, 키 사용)
       → services/youtube.ts (YouTube Data API v3, fetch)
       → lib/scoring.ts (순수 계산)
   → JSON 응답 → UI 렌더
```
YouTube API 키는 서버(route.ts/services)에서만 사용하며 클라이언트에 절대 전달되지 않는다.

## 상태 관리
- 서버 상태: `/api/analyze` 라우트의 응답 (매 요청 즉석 fetch, stateless).
- 클라이언트 상태: `TrendDashboard`의 `useState`로 loading / error / data 관리. 외부 상태관리 라이브러리 미사용.

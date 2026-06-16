# Step 3: api-route

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — 데이터 흐름, route.ts가 오케스트레이션
- `/docs/ADR.md` — ADR-001(라우트=경계), ADR-004(트렌드 소스, 검색 키워드 ≤2)
- `/CLAUDE.md` — CRITICAL: 키 server-only, MVP(별도 레이어 금지)
- step 1 산출물: `src/services/youtube.ts`, `src/lib/env.ts`, `src/types.ts`
- step 2 산출물: `src/lib/scoring.ts`

이전 step들의 함수 시그니처를 확인하고 일관성을 유지하라.

## 작업

`src/app/api/analyze/route.ts` — 유일한 서버 진입점. service + scoring을 **직접 조립**한다(별도 pipeline 모듈을 만들지 마라).

- `export const dynamic = 'force-dynamic';`
- `export async function GET(): Promise<Response>`
- 흐름(ADR-004 순서, 쿼터 보호):
  1. `getConfig()` → apiKey / handle / region
  2. `createYoutubeClient({ apiKey })`
  3. `resolveChannelId(handle)` → channelId / uploadsPlaylistId / profile
  4. `getRecentVideoIds(uploads, 25)` → `hydrateVideos` → 내 영상 `VideoSummary[]`
  5. `extractKeywords(내 영상 제목들)` → channelKeywords (상위 5)
  6. `getTrending(region)` → 트렌딩 후보
  7. channelKeywords 중 **상위 2개만** `searchVideoIds(kw, publishedAfter = 최근 30일 ISO)` → id 수집
  8. 트렌딩 + 검색 id를 **중복 제거**한 뒤 통계가 없는 것만 `hydrateVideos`로 채움(트렌딩은 이미 통계 보유 → 재활용)
  9. `rankCandidates(후보, channelKeywords, now)` → `buildRecommendations`
  10. 채널 분석 4지표(평균 조회수 / 주력 키워드 / 업로드 주기 / 베스트 TOP3) 계산
- 응답: `TrendReport` JSON, 헤더 `cache-control: no-store`.
- 에러 매핑(에러의 `code` 사용): `NO_KEY`→503, `NOT_FOUND`→404, `QUOTA`→429, 그 외→500. 본문에 사람이 읽는 메시지 포함(예: 503 "set YOUTUBE_API_KEY in .env.local").

`now`는 라우트에서 `new Date()`로 만들어 scoring에 주입한다(scoring 내부에서 만들지 않는다).

## Acceptance Criteria

```bash
npm run build   # 키 없이도 통과해야 함(force-dynamic — 빌드 타임에 라우트 실행 안 됨)
npm run lint
npm run test
```

## 검증 절차

1. AC 통과 확인. 특히 `npm run build`가 **API 키 없이** 성공하는지 확인한다.
2. 체크리스트: `dynamic='force-dynamic'`가 있는가? 검색 키워드 ≤2인가? 에러 code→HTTP 매핑이 정확한가? 별도 pipeline 모듈을 만들지 않았는가?
3. `phases/0-mvp/index.json` step 3 업데이트:
   - 성공 → `completed` + summary(`src/app/api/analyze/route.ts`, 응답 `TrendReport` 형태, 에러 매핑)
   - 실패/blocked 규칙 동일.

## 금지사항

- 빌드 타임에 YouTube를 호출하지 마라. 이유: 키 없는 환경에서 `next build`가 깨진다. 반드시 `dynamic='force-dynamic'`.
- 키를 클라이언트로 전달하거나 응답 본문에 포함하지 마라.
- 별도 `pipeline`/`repository`/DTO 레이어를 만들지 마라. 이유: MVP 오버엔지니어링. 라우트가 직접 조립한다.
- 검색 키워드를 3개 이상 돌리지 마라. 이유: `search.list`는 호출당 100 쿼터(ADR-004).
- 기존 테스트를 깨뜨리지 마라.

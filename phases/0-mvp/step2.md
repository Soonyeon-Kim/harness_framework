# Step 2: scoring

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `/docs/ADR.md` — ADR-002(휴리스틱 공식)
- `/docs/PRD.md` — 핵심 기능 3(근거 있는 추천)
- `/CLAUDE.md` — CRITICAL: TDD(테스트 먼저), 순수함수
- step 1 산출물: `src/types.ts`(`VideoSummary` 등), `src/services/youtube.ts`(데이터 형태 참고)

## 작업

추천 엔진의 **순수함수**를 TDD로 만든다. 네트워크/환경변수/Next import 금지, 결정적(deterministic)이어야 한다.

`src/lib/scoring.ts` (시그니처):
- `extractKeywords(titles: string[], topN = 5): string[]` — 제목들에서 키워드 빈도 추출(한글+영문 토큰, 2자 이상). 상위 N개.
- `keywordOverlap(a: string[], b: string[]): number` — 0~1 (교집합 비율 / 자카드).
- `ageInDays(publishedAt: string, now: Date): number` — 0 나눗셈 방지를 위해 최소값(예: 1/24일) 보장.
- `viralityScore(viewCount: number, publishedAt: string, now: Date): number` — 조회수 ÷ ageInDays.
- `relevanceScore(candidateKeywords: string[], channelKeywords: string[]): number` — `keywordOverlap` 활용, 0~1.
- `combinedScore(virality: number, relevance: number, opts?): number` — virality를 0~1로 **정규화**한 뒤 가중 결합 → 0~100.
- `rankCandidates(candidates: VideoSummary[], channelKeywords: string[], now: Date): ScoredCandidate[]` — 각 후보에 점수 부여 후 내림차순 정렬.
- `buildRecommendations(ranked: ScoredCandidate[], channelKeywords: string[]): Recommendation[]` — 상위 후보의 제목 패턴 + 내 키워드를 결합해 `{ title, score, reason, matchedKeywords, sourceVideoId }`를 생성. `reason`은 "어떤 트렌드가 어떤 조회속도로 떴고, 어떤 키워드가 겹쳤는지"를 사람이 읽는 한 문장으로.

타입 `ScoredCandidate`, `Recommendation`은 `src/types.ts`에 추가한다.

`src/lib/scoring.test.ts`:
- **테스트를 먼저 작성**한다(TDD). 표(table-driven) 기반으로 각 함수를 검증:
  - 0 나눗셈 가드(갓 게시된 영상),
  - 정규화 후 결합 점수 범위(0~100),
  - 키워드 겹침 0과 1 경계,
  - `now` 주입으로 결정적 결과,
  - `reason`에 겹친 키워드가 포함되는지.

## Acceptance Criteria

```bash
npm run test
npm run lint
npm run build
```

## 검증 절차

1. AC 통과 확인(테스트가 실제로 함수 동작을 검증하는지).
2. 체크리스트: 순수함수인가(fetch/env/`Date.now()` 없음)? `now`를 주입받는가? 정규화 후 결합하는가?
3. `phases/0-mvp/index.json` step 2 업데이트:
   - 성공 → `completed` + summary(함수 목록, `src/lib/scoring.ts`+테스트, `src/types.ts`에 추가된 타입)
   - 실패/blocked 규칙 동일.

## 금지사항

- `fetch`/네트워크/`process.env`를 import하거나 호출하지 마라. 이유: 순수성·테스트 용이성.
- `Date.now()` 또는 인자 없는 `new Date()`를 함수 내부에서 쓰지 마라. 이유: 결정적 테스트 불가. 반드시 `now: Date`를 주입받아라.
- scoring에서 YouTube API를 부르지 마라. 데이터는 인자로만 받는다.
- 기존 테스트를 깨뜨리지 마라.

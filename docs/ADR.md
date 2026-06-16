# Architecture Decision Records

## 철학
MVP 속도 최우선. 작동하는 최소 구현을 선택하고, 꼭 필요한 이유가 없으면 레이어·의존성·추상화를 추가하지 않는다. 순수 계산은 분리해 TDD로 보증하고, API 키는 서버 경계 안에 가둔다.

---

### ADR-001: App Router + Route Handler를 유일한 API 경계로 사용
**결정**: 모든 외부 API 호출을 `src/app/api/analyze/route.ts`(서버)에서 오케스트레이션하고, 클라이언트는 이 라우트만 fetch한다.
**이유**: YouTube API 키를 서버에 가두어 노출을 막고, 키 사용 지점을 한 곳으로 모은다.
**트레이드오프**: 클라이언트가 YouTube를 직접 못 부르므로 모든 데이터가 라우트를 거친다 (MVP에선 문제 없음).

### ADR-002: LLM 없는 휴리스틱 점수 추천
**결정**: 추천을 순수함수 점수로 계산한다. virality = 조회수 ÷ 게시 후 경과일, relevance = 후보 키워드 ∩ 내 채널 키워드, 추천점수 = 정규화(virality)·가중 + relevance·가중.
**이유**: 2차 API 키/비용 없이 빠르고 결정적이며 TDD에 적합.
**트레이드오프**: 추천 제목이 템플릿 변주 수준이라 LLM만큼 창의적이지 않다 (추후 옵션).

### ADR-003: 테스트 러너 Vitest, 스크립트는 `vitest run`
**결정**: 단위 테스트는 Vitest로 작성하고 `npm run test`는 `vitest run`(1회 실행 후 종료)으로 둔다.
**이유**: Next.js/TS/ESM 친화적이고 빠르다. watch 모드(`vitest`)는 종료되지 않아 Stop 훅을 무한 대기시킨다.
**트레이드오프**: 비동기 Server Component는 Vitest로 직접 렌더 테스트가 어렵다 → 순수 lib/services만 단위 테스트한다.

### ADR-004: 트렌드 소스 = KR 인기차트 + 제한된 키워드 검색
**결정**: `videos.list?chart=mostPopular&regionCode=KR`와 내 상위 키워드 2개에 대한 `search.list`를 합쳐 후보를 만들고, `videos.list`로 통계를 채운다. 검색 키워드는 상수로 최대 2개.
**이유**: search.list는 호출당 100 쿼터로 비싸다 (일 10,000). 키워드 2개 제한으로 ≈205/run, 하루 ~48회로 묶는다.
**트레이드오프**: 키워드를 더 많이 검색하면 후보가 풍부하지만 쿼터가 빠르게 소진된다.

### ADR-005: 수동 스캐폴딩 (create-next-app 미사용)
**결정**: Next.js 설정을 손으로 작성한다.
**이유**: 레포에 이미 harness 파일이 있어 `create-next-app`이 비어있지 않은 디렉토리를 거부하거나 `.git`을 건드릴 수 있다.
**트레이드오프**: 초기 설정 파일을 직접 관리해야 한다.

### ADR-006: DB·캐시·상태관리 라이브러리 미도입
**결정**: 영속 저장소/캐시/Redux 등을 쓰지 않고 매 요청 즉석 fetch(stateless), 클라이언트는 useState만.
**이유**: 사용자 1명·단일 채널·쿼터 여유로 불필요. MVP 단순성 우선.
**트레이드오프**: 매 새로고침마다 쿼터를 소비하고 응답이 느릴 수 있다 (추후 캐시 도입 가능).

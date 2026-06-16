# Step 1: youtube-service

## 읽어야 할 파일

먼저 아래를 읽고 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — services 레이어, 데이터 흐름, 키 서버 전용
- `/docs/ADR.md` — ADR-001(라우트=API경계), ADR-004(트렌드 소스/쿼터)
- `/CLAUDE.md` — CRITICAL: 외부 API는 services/api만, 키 server-only, 에러 클래스 계층 금지
- `/.env.example` — 환경변수 이름(`YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_HANDLE`, `YOUTUBE_REGION_CODE`)
- step 0 산출물: `package.json`(`server-only` 의존성 포함), `tsconfig.json`(`@/*` paths), `src/`

이전 step에서 만들어진 설정을 꼼꼼히 읽고 일관성을 유지하라.

## 작업

공유 타입, 환경변수 헬퍼, YouTube Data API v3 래퍼를 만든다. **실제 키 없이 테스트 가능**해야 한다.

### `src/types.ts` (공유 타입)
도메인 타입을 정의(시그니처 수준, 구현 시 합리적 보강 허용):
- `VideoSummary { id: string; title: string; channelTitle: string; publishedAt: string; viewCount: number }`
- `ChannelProfile { channelId: string; title: string; handle: string; subscriberCount: number; videoCount: number }`
- 후속 step이 쓸 타입(`ScoredCandidate`, `Recommendation`, `TrendReport`)도 여기에 모은다(점진 확장 허용).

### `src/lib/env.ts`
- `getConfig(): { apiKey: string; channelHandle: string; regionCode: string }`
- `YOUTUBE_API_KEY`가 없으면 `code: 'NO_KEY'` 속성을 가진 `Error`를 throw. **에러 클래스 계층을 만들지 마라** — 일반 `Error`에 `(err as any).code = 'NO_KEY'`로 충분.

### `src/services/youtube.ts`
- 파일 최상단에 `import 'server-only';` — 클라이언트 import 시 빌드 에러가 나서 키 노출을 막는다(CRITICAL).
- `createYoutubeClient({ apiKey, fetchImpl = fetch })` 형태로 **fetch 주입 가능**하게 만든다. 반환 객체 메서드(시그니처):
  - `resolveChannelId(handle: string): Promise<{ channelId: string; uploadsPlaylistId: string; profile: ChannelProfile }>`
    - `channels.list?part=snippet,statistics,contentDetails&forHandle=<handle>`. items가 비면 `code:'NOT_FOUND'` 에러. `@` 누락 시 보정. uploads 플레이리스트는 `contentDetails.relatedPlaylists.uploads`.
  - `getRecentVideoIds(uploadsPlaylistId: string, max = 25): Promise<string[]>` — `playlistItems.list`
  - `getTrending(regionCode: string): Promise<VideoSummary[]>` — `videos.list?chart=mostPopular&regionCode=...&part=snippet,statistics`
  - `searchVideoIds(keyword: string, publishedAfterISO: string): Promise<string[]>` — `search.list?order=viewCount&type=video&publishedAfter=...`
  - `hydrateVideos(ids: string[]): Promise<VideoSummary[]>` — `videos.list?part=snippet,statistics&id=...`, **한 번에 50개 이하로 배치**.
- HTTP 403 + reason `quotaExceeded`/`dailyLimitExceeded` → `code:'QUOTA'` 에러로 매핑.
- 통계 문자열(viewCount 등)은 `Number(...)`로 파싱해 `VideoSummary`로 변환.

### `src/services/youtube.test.ts`
- `fetchImpl`에 가짜 함수를 주입해 캔드(canned) JSON을 반환한다. **실제 네트워크/실제 키 사용 금지.**
- 검증: 올바른 endpoint/쿼리 파라미터 구성, `hydrateVideos`의 50개 배치 분할, 에러 매핑(NOT_FOUND / QUOTA), 통계 문자열→숫자 파싱.

## Acceptance Criteria

```bash
npm run test
npm run lint
npm run build
```

## 검증 절차

1. AC 통과 확인.
2. 체크리스트: 키가 services 밖으로 새지 않는가? `import 'server-only'`가 있는가? 테스트가 실제 키 없이 도는가?
3. `phases/0-mvp/index.json` step 1 업데이트:
   - 성공 → `completed` + summary(생성 파일: `src/types.ts`, `src/lib/env.ts`, `src/services/youtube.ts`+테스트 / 주요 함수 시그니처 / 에러 code 종류)
   - 실패/blocked 규칙은 step 0과 동일.

## 금지사항

- `src/services/youtube.ts`를 클라이언트에서 import 가능하게 만들지 마라(`import 'server-only'` 필수). 이유: API 키 노출.
- 테스트에서 실제 fetch/실제 키를 쓰지 마라. 이유: 키 없이도 빌드/테스트가 green이어야 하고(Stop 훅), blocked가 생기면 안 된다.
- 에러용 커스텀 클래스 계층을 만들지 마라. 이유: MVP 오버엔지니어링. `code` 필드로 충분.
- `search.list`를 이 step에서 남발하지 마라(호출당 100 쿼터). 실제 호출 횟수 제어는 step 3에서 한다.
- 기존 테스트를 깨뜨리지 마라.

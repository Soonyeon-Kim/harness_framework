# 프로젝트: NextPick

내 YouTube 채널을 자동 분석해, 내 니치에서 지금 뜨는 트렌드와 "다음에 만들면 좋을 콘텐츠"를 근거와 함께 보여주는 1인 크리에이터용 대시보드 (MVP).

## 기술 스택
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Vitest (테스트 — `vitest run`, watch 모드 금지)

## 아키텍처 규칙
- CRITICAL: 외부 API(YouTube Data API) 호출 로직은 `src/services/`와 `src/app/api/` 라우트 핸들러에서만 처리한다.
- CRITICAL: YouTube API 키는 서버에서만 사용한다. 클라이언트 컴포넌트에서 `YOUTUBE_API_KEY`를 읽거나 외부 API를 직접 호출하지 마라. `src/services/`는 `import 'server-only'`로 보호한다.
- 컴포넌트는 `src/components/`, 순수 계산 로직은 `src/lib/`, 외부 API 래퍼는 `src/services/`, 공유 타입은 `src/types.ts`에 둔다.
- CRITICAL: MVP다. 오버엔지니어링 금지 — DB·캐시·상태관리 라이브러리·인증·별도 pipeline/DTO 레이어·에러 클래스 계층을 만들지 마라.

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD). 특히 `src/lib/scoring.ts`의 순수함수는 단위 테스트로 검증한다.
- CRITICAL: 테스트는 실제 네트워크/실제 API 키 없이 동작해야 한다 (fetch 모킹).
- 커밋 메시지는 conventional commits 형식을 따를 것 (feat:, fix:, docs:, refactor:)

## 명령어
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run lint     # ESLint (eslint .)
npm run test     # 테스트 (vitest run — 1회 실행 후 종료)

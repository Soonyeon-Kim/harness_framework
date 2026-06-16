# Step 0: project-scaffold

## 읽어야 할 파일

먼저 아래 파일들을 읽고 프로젝트의 아키텍처와 설계 의도를 파악하라:

- `/docs/ARCHITECTURE.md` — `src/` 디렉토리 구조, 레이어
- `/docs/ADR.md` — ADR-003(Vitest `vitest run`), ADR-005(수동 스캐폴딩)
- `/CLAUDE.md` — 기술 스택, 명령어, CRITICAL 규칙
- `/.gitignore` — 이미 `.env*.local`, `node_modules/`, `.next/` 무시 설정됨
- `/.env.example` — 이미 존재(환경변수 이름 참고). 덮어쓰지 마라.

## 작업

빈 Next.js 15 앱을 **수동으로** 스캐폴딩한다. 앱 비즈니스 로직은 0이고, `npm run lint && npm run build && npm run test`가 모두 통과(green)하는 상태를 만든다.

생성/설정할 것:

1. **`package.json`** — Next.js 15, React 19, TypeScript, Tailwind, Vitest, eslint, eslint-config-next, `server-only`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `jsdom` 등 필요한 의존성. scripts는 정확히:
   ```json
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "lint": "eslint .",
     "test": "vitest run"
   }
   ```
2. **`tsconfig.json`** — `"strict": true`, paths `"@/*": ["./src/*"]`.
3. **`next.config.ts`**, **`postcss.config.mjs`**, **Tailwind 설정** — 동작하는 최신 안정 구성을 선택하라(Tailwind v4면 globals.css에 `@import "tailwindcss"` + postcss plugin).
4. **`eslint.config.mjs`** — flat config + `eslint-config-next`. (`next lint`는 deprecated이므로 쓰지 마라.)
5. **`vitest.config.mts`** — `environment: 'jsdom'`, `vite-tsconfig-paths` 플러그인으로 `@/*` 해석.
6. **`src/app/layout.tsx`**, **`src/app/globals.css`**(Tailwind import), **`src/app/page.tsx`** — 동기 컴포넌트 placeholder("NextPick" 텍스트 수준). async 금지.
7. **`src/lib/__tests__/smoke.test.ts`** — 통과하는 테스트 1개(예: `expect(1 + 1).toBe(2)`).
8. `npm install` 실행해 lockfile 생성.

순서 주의: 설정 파일 작성 → `npm install` → 최소 앱/테스트 → **마지막에** index.json status 갱신. (Stop 훅이 세션 종료 시 lint/build/test를 돌리므로 종료 시점에 green이어야 한다.)

## Acceptance Criteria

```bash
npm install
npm run lint
npm run build
npm run test
git check-ignore .env.local   # .env.local 이 출력되어야 함(무시됨 확인)
```

## 검증 절차

1. 위 AC 커맨드를 모두 실행해 통과를 확인한다.
2. 아키텍처 체크리스트:
   - ARCHITECTURE.md의 `src/` 구조를 따르는가?
   - CLAUDE.md 스택(Next.js 15 / TS strict / Tailwind / Vitest)과 일치하는가?
   - `test` 스크립트가 정확히 `vitest run` 인가?
3. 결과에 따라 `phases/0-mvp/index.json`의 step 0을 업데이트한다:
   - 성공 → `"status": "completed"`, `"summary": "Next.js15+TS strict+Tailwind+Vitest 수동 스캐폴딩, lint/build/test green. 생성: package.json, tsconfig.json, next.config.ts, eslint.config.mjs, vitest.config.mts, src/app/{layout,page}.tsx, globals.css, 스모크 테스트"`
   - 수정 3회 실패 → `"status": "error"`, `"error_message"`(구체적 내용)
   - 외부 개입 필요 → `"status": "blocked"`, `"blocked_reason"` 후 중단

## 금지사항

- `create-next-app` 실행 금지. 이유: 레포에 harness 파일이 있어 비어있지 않은 디렉토리를 거부하거나 `.git`/기존 파일을 손상시킨다. (ADR-005)
- `npm run test`를 watch 모드(`vitest`)로 두지 마라. 이유: 종료되지 않아 Stop 훅이 무한 대기하고 세션이 타임아웃된다. 반드시 `vitest run`. (ADR-003)
- 기존 `.env.example` / `.env.local` / `.gitignore`를 덮어쓰지 마라. 이유: 사용자가 이미 실제 API 키를 넣어두었다.
- 앱 비즈니스 로직(YouTube, scoring, 대시보드 UI)을 만들지 마라. 이 step은 스캐폴딩만.
- `page.tsx`를 async로 만들지 마라. 이유: Vitest로 렌더 테스트 불가(ADR-003).
- 기존 테스트를 깨뜨리지 마라.

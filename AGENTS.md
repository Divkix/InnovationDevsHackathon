# AGENTS.md

## Source Of Truth
- Trust `package.json`, `vite.config.ts`, `vitest.config.ts`, `biome.json`, `tsconfig*.json`, and `src/` over `README.md`.
- `README.md` is stale: it mentions `bun run test:run`, Playwright E2E, and ESLint, none of which match the current repo.

## Commands
- Install deps: `bun install`
- Start dev server: `bun run dev` (port 5173)
- Build production bundle: `bun run build`
- Lint: `bun run lint` (Biome, covers JS/TS/JSON)
- Typecheck: `bun run typecheck` (runs all three: app, test, tooling)
- Run all tests once: `bun x vitest run`
- Run one test file: `bun x vitest run src/utils/valueCalculator.test.ts`
- Watch tests: `bun run test`

## TypeScript Configuration
- Three separate tsconfig files:
  - `tsconfig.app.json` — App code only, excludes tests
  - `tsconfig.test.json` — Test code with Vitest globals and jest-dom types
  - `tsconfig.tooling.json` — Tooling/config files
- `typecheck` script runs all three sequentially; order matters for caching

## App Shape
- Single Vite + React 19 app rooted at `src/`. No monorepo.
- App entry: `src/main.tsx` mounts `App` inside `AppProvider`.
- `src/App.tsx` owns top-level flow: onboarding, camera/dashboard tabs, manual item modal, detail modal.
- `@/*` alias maps to `src/*` in both app code and tests.

## State And Business Logic
- App-wide state in `src/context/AppContext.tsx`.
- `AppContext` persists to `localStorage`: policy type, onboarding state, manual items, confidence threshold, camera permission, manual mode.
- Camera detections are transient: `detectedItems` is an in-memory `Map`, not persisted.
- Coverage rules in `src/data/coverageRules.json`; lookup in `src/utils/coverageLookup.ts`; valuation in `src/utils/valueCalculator.ts`.

## Detection Flow
- Path: `CameraView -> useObjectDetection -> useYOLODetection -> yoloProcessor -> CoverageOverlay`.
- `useObjectDetection.ts` is a compatibility wrapper; real implementation is `useYOLODetection.ts`.
- Mock mode is first-class: use `?mock=true` URL param or set `insurescope_mock_detection` in localStorage.

## Runtime Quirks
- ONNX runtime requires public assets at `public/models/yolo26n/yolo26n.onnx`. Keep paths in sync with `src/hooks/useYOLODetection.ts`.
- `vite.config.ts` sets COOP/COEP headers for SharedArrayBuffer/WASM threading. If detection breaks only in dev, check headers first.
- Tailwind v4 via `@tailwindcss/vite` and `@import "tailwindcss"` in `src/index.css`. No `tailwind.config.*` file.
- `VITE_GEMINI_API_KEY` gates a placeholder client in `src/hooks/useGemini.ts`; no real Gemini backend integration.

## Tests And Tooling
- Tests colocated: `src/**/*.test.ts(x)` plus `src/__tests__/`.
- `src/setupTests.ts` globally mocks localStorage, matchMedia, canvas APIs, and framer-motion. Reuse this setup.
- **Biome** is the linter and formatter (not ESLint). Config in `biome.json` covers `src/**/*.{js,jsx,ts,tsx}` and `*.{js,ts,json}`.
- No CI workflows under `.github/workflows/`; local commands are the only verified automation.

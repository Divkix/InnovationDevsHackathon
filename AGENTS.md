# AGENTS.md

## Source Of Truth
- Trust `package.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.ts`, `tsconfig*.json`, and `src/` over `README.md`.
- `README.md` is stale in a few important spots: it still mentions `bun run test:run`, Playwright E2E, and older architecture details that do not match the current repo.

## Commands
- Install deps: `bun install`
- Start dev server: `bun run dev`
- Build production bundle: `bun run build`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`
- Run all tests once: `bun x vitest run`
- Run one test file: `bun x vitest run src/utils/valueCalculator.test.ts`
- Watch tests: `bun run test`

## App Shape
- This is a single Vite + React app rooted at `src/`; there is no monorepo or package split.
- App entry is `src/main.tsx`, which mounts `App` inside `AppProvider`.
- `src/App.tsx` owns the top-level flow: onboarding, camera/dashboard tab content, manual item modal, detail modal, and the optional Gemini button.
- `@/*` is the shared alias for `src/*` in both app code and tests.

## State And Business Logic
- App-wide state lives in `src/context/AppContext.tsx`.
- `AppContext` persists `policyType`, onboarding state, manual items, confidence threshold, camera-permission state, and manual-mode state in `localStorage`.
- Camera detections are transient only: `detectedItems` is an in-memory `Map`, not persisted state.
- Coverage rules live in `src/data/coverageRules.json`; lookup and aggregation logic live in `src/utils/coverageLookup.ts` and `src/utils/valueCalculator.ts`.

## Detection Flow
- Main detection path is `CameraView -> useObjectDetection -> useYOLODetection -> yoloProcessor -> CoverageOverlay`.
- `useObjectDetection.ts` is only a compatibility wrapper; the real implementation is `useYOLODetection.ts`.
- Mock mode is first-class and is the fastest way to exercise UI flows without camera or ONNX: use `?mock=true` or set localStorage key `insurescope_mock_detection`.

## Runtime Quirks
- ONNX runtime depends on public assets at `public/models/yolo26n/yolo26n.onnx` and `public/ort-wasm-simd-threaded.wasm`; keep file moves and path changes in sync with `src/hooks/useYOLODetection.ts`.
- `vite.config.ts` sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers for SharedArrayBuffer/WASM threading. If detection breaks only in dev, check those headers before changing model code.
- Tailwind is v4 via `@tailwindcss/vite` and `@import "tailwindcss"` in `src/index.css`; there is no `tailwind.config.*` file.
- `VITE_GEMINI_API_KEY` only gates a placeholder client in `src/hooks/useGemini.ts`; there is no real Gemini backend integration in this repo.

## Tests And Tooling
- Tests are colocated under `src/**/*.test.ts(x)` plus `src/__tests__/`.
- `src/setupTests.ts` globally mocks `localStorage`, `matchMedia`, canvas APIs, and most of `framer-motion`; reuse that setup instead of rebuilding those mocks ad hoc.
- Root `biome.json` does not cover TS/TSX files. TS/TSX checks come from ESLint and TypeScript, so do not assume Biome is the formatter/linter of record for app code.
- There are no repo CI workflow files under `.github/workflows/`; local commands are the only verified automation surface in the repo.

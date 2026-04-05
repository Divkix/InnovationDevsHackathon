# TypeScript Migration Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the runtime regression introduced by the JavaScript-to-TypeScript migration, restore validation cleanliness, and bring regression coverage back to or above the protection level on `main`.

**Architecture:** Keep the runtime behavior aligned with `main`, not the accidental behavior introduced during the migration. Collapse the `updateDetectedItems` API back to the minimal working shape, make `AppContext` consume shared types instead of redefining them, typecheck the migrated tooling files explicitly, and harden the tests around the camera-to-context flow and ONNX initialization.

**Tech Stack:** React 19, TypeScript 6, Vite 6, Vitest 4, ESLint 9, onnxruntime-web

---

## Verified Issue Inventory

### Blocking issues

1. **Runtime regression in detected item flow**
   - `src/components/CameraView/CameraView.tsx:173`
   - `src/components/CameraView/CameraView.tsx:204`
   - `src/context/AppContext.tsx:200-205`
   - `src/types/index.ts:137-164`
   - `src/App.tsx:53-61`
   - `src/App.tsx:160-163`
   - `src/App.tsx:237-239`
   - `CameraView` now sends `updateDetectedItems({ type: 'map', data: itemsMap })`, but the provider still only knows how to normalize a raw `Map` or plain record. The result is a `Map` containing keys `type` and `data` instead of detection ids.
   - Impact: detected items do not populate correctly in app state, camera-origin items disappear from dashboard calculations, and selected camera items cannot be resolved correctly by id.

2. **Type contract drift allowed the runtime regression to compile**
   - `src/context/AppContext.tsx:8-33`
   - `src/types/index.ts:148-170`
   - `AppContext.tsx` defines its own local `AppContextValue` interface instead of using the shared one from `src/types/index.ts`. The two contracts no longer agree on `updateDetectedItems`, which is why the mismatch above was not caught by TypeScript.
   - Impact: the codebase looks typed, but the provider and consumers are no longer checked against the same contract.

3. **Migration is not validation-clean**
   - `bun run lint` fails with 46 errors.
   - Representative failures:
   - `src/setupTests.ts:94-100`
   - `src/setupTests.ts:156-157`
   - `src/setupTests.ts:247`
   - `src/__tests__/App.tab-navigation.test.tsx:103`
   - `src/hooks/useObjectDetection.test.tsx:2`
   - `src/hooks/useYOLODetection.test.tsx:1`
   - `src/components/DetailModal/DetailModal.test.tsx:2`
   - `src/utils/testUtils.ts:12`
   - Impact: the branch cannot clear the repo's lint gate, and several of the migrated test helpers are carrying dead code or incorrect TS patterns.

4. **Migrated tooling files are not typechecked or linted**
   - `tsconfig.base.json:20-29`
   - `tsconfig.app.json:6-7`
   - `tsconfig.test.json:10-15`
   - `eslint.config.ts:10-14`
   - `vite.config.ts:41-44`
   - `vitest.config.ts:13-16`
   - The new TS config only includes `src/**/*`, and ESLint globally ignores `*.config.ts`, so `eslint.config.ts`, `vite.config.ts`, and `vitest.config.ts` were renamed to TypeScript without gaining any TS safety. `vite.config.ts` also still references deleted `src/setupTests.js`.
   - Impact: config breakage can slip through without type or lint feedback, and test setup is configured inconsistently.

5. **Regression coverage got weaker than `main`**
   - `src/hooks/useYOLODetection.test.tsx:215-219`
   - `main:src/hooks/useYOLODetection.test.jsx:260-266`
   - `src/__tests__/App.tab-navigation.test.tsx:433-439`
   - `main:src/__tests__/App.tab-navigation.test.jsx:238-246`
   - `src/components/CameraView/CameraView.test.tsx:638-646`
   - The migrated tests no longer verify the exact model path and init options, no longer assert dashboard tab activation on manual-mode fallback, and only assert that `updateDetectedItems` was called instead of validating its payload shape.
   - Impact: the exact migration regression that shipped was no longer protected by tests.

### Non-blocking warnings and cleanup debt

1. `src/components/AddItemForm/AddItemForm.tsx:174` has a missing `handleClose` dependency in `useCallback`.
2. `src/components/CameraView/CameraView.tsx:236` has missing `requestCamera` and `stopCamera` dependencies in `useEffect`.
3. `src/components/ConfidenceThresholdSlider/ConfidenceThresholdSlider.tsx:8,13,18,23,30` triggers `react-refresh/only-export-components` because the file exports utilities and constants alongside the component.
4. `src/components/CoverageOverlay/CoverageOverlay.tsx:151,175` triggers `react-refresh/only-export-components` for the same reason.
5. `src/context/AppContext.tsx:364` triggers `react-refresh/only-export-components` because the provider and hook share the same module.

## Verification Snapshot

- `bun run lint` -> **fails**
- `bun run typecheck` -> **passes**
- `bun x vitest run` -> **passes** (`16 files`, `428 tests`)
- `bun run build` -> **passes**

The remediation order should be: runtime correctness first, validation gates second, coverage restoration third, cleanup warnings last.

## File Map

- Modify: `src/types/index.ts`
  - Shared app-level TS contracts, including `DetectedItemsInput` and `AppContextValue`.
- Modify: `src/context/AppContext.tsx`
  - Provider implementation and normalization logic for detected items.
- Modify: `src/components/CameraView/CameraView.tsx`
  - Camera loop that sends detected items into context.
- Modify: `src/context/AppContext.test.tsx`
  - Provider contract tests; tighten test data to use `DetectedItem`, not `ManualItem`.
- Modify: `src/components/CameraView/CameraView.test.tsx`
  - Regression test for the payload passed to `updateDetectedItems`.
- Modify: `src/setupTests.ts`
  - Remove migration-induced unused destructuring in Framer Motion mocks.
- Modify: `src/__tests__/App.tab-navigation.test.tsx`
  - Restore manual-mode tab-state assertion and remove unused props from mocked motion button.
- Modify: `src/hooks/useObjectDetection.test.tsx`
- Modify: `src/hooks/useYOLODetection.test.tsx`
- Modify: `src/components/DetailModal/DetailModal.test.tsx`
  - Remove unused imports and restore more exact ONNX initialization assertions.
- Modify: `src/utils/testUtils.ts`
  - Replace the empty-interface Window extension with a direct global property declaration.
- Modify: `eslint.config.ts`
  - Stop blindly ignoring config TS files; add a tooling block if needed.
- Modify: `vite.config.ts`
  - Point test setup to `src/setupTests.ts`.
- Modify: `vitest.config.ts`
  - Keep test setup consistent with Vite config.
- Create: `tsconfig.tooling.json`
  - Typecheck `vite.config.ts`, `vitest.config.ts`, and `eslint.config.ts` explicitly.
- Modify: `package.json`
  - Add `typecheck:tooling` and include it in the top-level `typecheck` script.
- Optional create: `src/components/ConfidenceThresholdSlider/thresholdUtils.ts`
- Optional create: `src/components/CoverageOverlay/layout.ts`
  - Extract non-component exports if the goal is zero warnings, not just zero errors.

### Task 1: Restore Detected Item Flow And Unify The Context Contract

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/context/AppContext.tsx`
- Modify: `src/components/CameraView/CameraView.tsx`
- Modify: `src/context/AppContext.test.tsx`
- Test: `src/components/CameraView/CameraView.test.tsx`

- [ ] **Step 1: Write the failing regression test in `src/components/CameraView/CameraView.test.tsx`**

```ts
it('passes a real detected-items map into context when detections are found', async () => {
  const mockUpdateDetectedItems = vi.fn()

  mockUseAppContext.mockReturnValue({
    ...baseContextValue,
    updateDetectedItems: mockUpdateDetectedItems,
  })

  const mockDetections: { detections: Detection[] } = {
    detections: [
      {
        boundingBox: { originX: 10, originY: 20, width: 100, height: 100 },
        categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
      },
    ],
  }

  mockUseObjectDetection.mockReturnValue({
    detect: vi.fn().mockResolvedValue(mockDetections),
    isLoaded: true,
    error: null,
    isMockMode: false,
  })

  render(<CameraView />)

  await waitFor(() => {
    const video = screen.getByTestId('camera-video')
    Object.defineProperty(video, 'readyState', { value: 2, writable: true })
  })

  await act(async () => {
    await rafCallbacks[rafCallbacks.length - 1](performance.now())
  })

  await waitFor(() => {
    expect(mockUpdateDetectedItems).toHaveBeenCalledWith(expect.any(Map))
  })

  const payload = mockUpdateDetectedItems.mock.calls[0]?.[0] as Map<string, DetectedItem>
  expect(payload.get('detection-0')).toMatchObject({
    id: 'detection-0',
    category: 'laptop',
  })
})
```

- [ ] **Step 2: Run the focused test to verify the regression exists**

Run: `bun x vitest run src/components/CameraView/CameraView.test.tsx -t "passes a real detected-items map into context when detections are found"`

Expected: FAIL because `mockUpdateDetectedItems` currently receives `{ type: 'map', data: Map(...) }` instead of a `Map`.

- [ ] **Step 3: Simplify the shared contract in `src/types/index.ts` back to the working shape**

```ts
export type DetectedItemsInput =
  | Map<string, DetectedItem>
  | Record<string, DetectedItem>

export interface AppContextValue {
  // ...existing state fields
  updateDetectedItems: (input: DetectedItemsInput) => void
}
```

Rationale: the tagged union adds no value here. `main` already had a working `Map | Record` contract.

- [ ] **Step 4: Remove the duplicate `AppContextValue` declaration and use the shared one in `src/context/AppContext.tsx`**

```ts
import type {
  AppContextValue,
  AppTab,
  DetectedItem,
  DetectedItemsInput,
  ManualItem,
  PolicyType,
} from '../types'

const updateDetectedItems = useCallback((nextItems: DetectedItemsInput): void => {
  if (nextItems instanceof Map) {
    setDetectedItemsState(new Map(nextItems))
    return
  }

  setDetectedItemsState(new Map(Object.entries(nextItems)))
}, [])
```

Delete the local `export interface AppContextValue` block from this file completely.

- [ ] **Step 5: Revert `CameraView` to sending the normalized `Map` directly**

```ts
updateDetectedItems(itemsMap)
```

Apply that change in both branches of the detection loop.

- [ ] **Step 6: Tighten `src/context/AppContext.test.tsx` so the provider is tested with `DetectedItem`, not `ManualItem`**

```ts
const newMap = new Map<string, DetectedItem>()
newMap.set('obj-1', {
  id: 'obj-1',
  category: 'laptop',
  confidence: 0.9,
  boundingBox: { originX: 0, originY: 0, width: 10, height: 10 },
  categories: [{ categoryName: 'laptop', score: 0.9, displayName: 'Laptop' }],
})
context.updateDetectedItems(newMap)
```

- [ ] **Step 7: Run the targeted tests and typecheck**

Run: `bun x vitest run src/components/CameraView/CameraView.test.tsx src/context/AppContext.test.tsx`

Expected: PASS

Run: `bun run typecheck`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/context/AppContext.tsx src/components/CameraView/CameraView.tsx src/context/AppContext.test.tsx src/components/CameraView/CameraView.test.tsx
git commit -m "fix: restore detected item flow"
```

### Task 2: Make Lint Green For Migrated Tests And Test Helpers

**Files:**
- Modify: `src/setupTests.ts`
- Modify: `src/__tests__/App.tab-navigation.test.tsx`
- Modify: `src/hooks/useObjectDetection.test.tsx`
- Modify: `src/hooks/useYOLODetection.test.tsx`
- Modify: `src/components/DetailModal/DetailModal.test.tsx`
- Modify: `src/utils/testUtils.ts`
- Modify: `src/components/AddItemForm/AddItemForm.tsx`
- Modify: `src/components/CameraView/CameraView.tsx`

- [ ] **Step 1: Run lint and capture the actual failures before touching code**

Run: `bun run lint`

Expected: FAIL with the unused-variable and empty-interface errors listed above.

- [ ] **Step 2: Replace the Framer Motion mock destructuring in `src/setupTests.ts` with a key-filter helper**

```ts
const MOTION_PROP_KEYS = new Set([
  'animate', 'initial', 'exit', 'variants', 'transition',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
  'viewport', 'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
  'onHoverStart', 'onHoverEnd', 'onTap', 'onTapStart', 'onTapCancel',
  'onPan', 'onPanStart', 'onPanEnd', 'onDrag', 'onDragStart', 'onDragEnd',
  'onViewportEnter', 'onViewportLeave',
])

function stripMotionProps(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !MOTION_PROP_KEYS.has(key) && key !== 'ref')
  )
}

const createMotionComponent = (element: string) =>
  React.forwardRef(({ children, ...props }, ref) => {
    const safeProps = stripMotionProps(props)
    return React.createElement(element, { ...safeProps, ref }, children)
  })
```

Also change `useMotionTemplate: vi.fn((...values: unknown[]) => ({` to `useMotionTemplate: vi.fn((..._values: unknown[]) => ({`.

- [ ] **Step 3: Remove the small migrated TS lint errors in the individual test files**

Use these exact edits:

```ts
// src/__tests__/App.tab-navigation.test.tsx
button: ({ children, whileHover: _whileHover, whileTap: _whileTap, ...props }) => (
  <button {...props}>{children}</button>
)

// src/hooks/useObjectDetection.test.tsx
import { renderHook } from '@testing-library/react'

// src/hooks/useYOLODetection.test.tsx
import { act, renderHook } from '@testing-library/react'

// src/components/DetailModal/DetailModal.test.tsx
import { render, screen, fireEvent, type RenderResult } from '@testing-library/react'
```

- [ ] **Step 4: Replace the empty-interface Window extension in `src/utils/testUtils.ts`**

```ts
declare global {
  interface Window {
    __TESTING__?: boolean
  }
}
```

Delete the `TestGlobals` import from this file if it becomes unused.

- [ ] **Step 5: Fix the hook dependency warnings while the file is open**

Use these exact dependency arrays:

```ts
// src/components/AddItemForm/AddItemForm.tsx
}, [name, category, value, editItem, isEditMode, policyType, addManualItem, updateManualItem, onSave, validateForm, handleClose])

// src/components/CameraView/CameraView.tsx
}, [requestCamera, stopCamera])
```

The callbacks are already memoized; the warnings are legitimate and should be fixed instead of ignored.

- [ ] **Step 6: Re-run lint**

Run: `bun run lint`

Expected: PASS on errors. If warnings remain, they should be limited to `react-refresh/only-export-components` and handled in Task 5.

- [ ] **Step 7: Commit**

```bash
git add src/setupTests.ts src/__tests__/App.tab-navigation.test.tsx src/hooks/useObjectDetection.test.tsx src/hooks/useYOLODetection.test.tsx src/components/DetailModal/DetailModal.test.tsx src/utils/testUtils.ts src/components/AddItemForm/AddItemForm.tsx src/components/CameraView/CameraView.tsx
git commit -m "fix: clear migration lint failures"
```

### Task 3: Typecheck And Lint The Migrated Tooling Files

**Files:**
- Create: `tsconfig.tooling.json`
- Modify: `package.json`
- Modify: `eslint.config.ts`
- Modify: `vite.config.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add a dedicated TS project for tooling files**

Create `tsconfig.tooling.json` with this content:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["node"],
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.tooling.tsbuildinfo"
  },
  "include": ["vite.config.ts", "vitest.config.ts", "eslint.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Wire the new tooling project into `package.json`**

```json
{
  "scripts": {
    "typecheck": "bun run typecheck:app && bun run typecheck:test && bun run typecheck:tooling",
    "typecheck:tooling": "tsc --project tsconfig.tooling.json --noEmit"
  }
}
```

Use `bun run`, not `npm run`, to match the repo standard.

- [ ] **Step 3: Stop ignoring all `*.config.ts` files in ESLint and give them a proper Node-flavored block**

Update the top of `eslint.config.ts` like this:

```ts
globalIgnores(['dist', '.venv', 'public/wasm'])
```

Add a dedicated block:

```ts
{
  files: ['*.config.ts'],
  extends: [js.configs.recommended, ...tsEslint.configs.recommended],
  languageOptions: {
    ecmaVersion: 2024,
    globals: globals.node,
    parser: tsEslint.parser,
    parserOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      project: './tsconfig.tooling.json',
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
  },
}
```

- [ ] **Step 4: Remove the stale setup path drift**

Update `vite.config.ts`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/setupTests.ts'],
},
```

`vitest.config.ts` should keep the same path.

- [ ] **Step 5: Run the new validation commands**

Run: `bun run typecheck:tooling`

Expected: PASS

Run: `bun run typecheck`

Expected: PASS

Run: `bun run lint`

Expected: PASS on errors

- [ ] **Step 6: Commit**

```bash
git add tsconfig.tooling.json package.json eslint.config.ts vite.config.ts vitest.config.ts
git commit -m "build: validate tooling typescript configs"
```

### Task 4: Restore The Lost Regression Coverage

**Files:**
- Modify: `src/hooks/useYOLODetection.test.tsx`
- Modify: `src/__tests__/App.tab-navigation.test.tsx`
- Modify: `src/components/CameraView/CameraView.test.tsx`

- [ ] **Step 1: Restore the ONNX model-path assertion in `src/hooks/useYOLODetection.test.tsx`**

Replace the weakened test body with:

```ts
it('loads model from correct path', async () => {
  renderHook(() => useYOLODetection())

  await waitFor(() => {
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.stringContaining('/models/yolo26n/yolo26n.onnx'),
      expect.objectContaining({
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })
    )
  })
})
```

That is stricter than the current branch and still compatible with `BASE_URL` handling.

- [ ] **Step 2: Restore the manual-mode tab assertion in `src/__tests__/App.tab-navigation.test.tsx`**

```ts
await waitFor(() => {
  expect(screen.getByTestId('tab-dashboard')).toHaveAttribute('data-active', 'true')
  expect(screen.getByTestId('mock-dashboard')).toBeInTheDocument()
})
```

- [ ] **Step 3: Strengthen the CameraView regression test from Task 1 so it checks payload shape, not just call count**

Keep this exact assertion in the test after the call count assertion:

```ts
const payload = mockUpdateDetectedItems.mock.calls[0]?.[0] as Map<string, DetectedItem>
expect(payload).toBeInstanceOf(Map)
expect(payload.get('detection-0')).toMatchObject({
  id: 'detection-0',
  category: 'laptop',
  confidence: 0.9,
})
```

- [ ] **Step 4: Run the focused regression suite**

Run: `bun x vitest run src/hooks/useYOLODetection.test.tsx src/__tests__/App.tab-navigation.test.tsx src/components/CameraView/CameraView.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useYOLODetection.test.tsx src/__tests__/App.tab-navigation.test.tsx src/components/CameraView/CameraView.test.tsx
git commit -m "test: restore migration regression coverage"
```

### Task 5: Clean Remaining Warnings And Finish With A Full Validation Sweep

**Files:**
- Optional create: `src/components/ConfidenceThresholdSlider/thresholdUtils.ts`
- Optional create: `src/components/CoverageOverlay/layout.ts`
- Modify: `src/components/ConfidenceThresholdSlider/ConfidenceThresholdSlider.tsx`
- Modify: `src/components/CoverageOverlay/CoverageOverlay.tsx`
- Modify: `eslint.config.ts`
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Eliminate the `react-refresh/only-export-components` warnings in the slider module**

Extract the constants and helper from `ConfidenceThresholdSlider.tsx` into `src/components/ConfidenceThresholdSlider/thresholdUtils.ts`:

```ts
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5
export const MIN_CONFIDENCE_THRESHOLD = 0.1
export const MAX_CONFIDENCE_THRESHOLD = 0.9
export const THRESHOLD_STEP = 0.05

export function formatThresholdPercentage(value: number): string {
  return `${Math.round(value * 100)}%`
}
```

Then import them into `ConfidenceThresholdSlider.tsx`.

- [ ] **Step 2: Eliminate the `react-refresh/only-export-components` warnings in the overlay module**

Extract the layout helpers from `CoverageOverlay.tsx` into `src/components/CoverageOverlay/layout.ts`:

```ts
export function getObjectCoverLayout(...) { /* move existing implementation unchanged */ }
export function projectBoundingBoxToCanvas(...) { /* move existing implementation unchanged */ }
```

Then import those helpers back into `CoverageOverlay.tsx`.

- [ ] **Step 3: Decide how to handle the context-module warning explicitly**

Preferred minimal fix: add a narrow ESLint override for the provider module instead of restructuring context wiring just to satisfy HMR lint noise.

```ts
{
  files: ['src/context/AppContext.tsx'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
}
```

Reason: context modules commonly export both the provider and the consuming hook.

- [ ] **Step 4: Run the full verification sweep**

Run: `bun run lint`

Expected: PASS with zero errors and zero warnings

Run: `bun run typecheck`

Expected: PASS

Run: `bun x vitest run`

Expected: PASS

Run: `bun run build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ConfidenceThresholdSlider/ConfidenceThresholdSlider.tsx src/components/ConfidenceThresholdSlider/thresholdUtils.ts src/components/CoverageOverlay/CoverageOverlay.tsx src/components/CoverageOverlay/layout.ts eslint.config.ts src/context/AppContext.tsx
git commit -m "chore: clean migration warning debt"
```

## Exit Criteria

- Camera detections reach `AppContext` as a real `Map<string, DetectedItem>`.
- `AppContext.tsx` no longer defines a local contract that can drift from `src/types/index.ts`.
- `bun run lint` passes.
- `bun run typecheck` includes app, tests, and tooling files.
- `bun x vitest run` passes with restored assertions for the camera flow, ONNX model path, and manual-mode tab state.
- `bun run build` passes.

## Risks To Watch During Implementation

- Do not widen the provider contract back to `unknown`; that just recreates the original hole.
- Do not keep the tagged `DetectedItemsInput` union unless every caller and the provider are migrated together and covered by tests.
- Do not “fix” the Framer Motion lint errors by disabling `@typescript-eslint/no-unused-vars`; the mock should be simplified instead.
- Do not add a tooling TS config without wiring it into `package.json`; otherwise it will rot unused.
- Do not stop at a passing test suite. The branch already proved that passing tests without the right assertions are worthless.

## Self-Review

- **Spec coverage:** This plan covers the verified runtime regression, the type drift that masked it, the lint failures, the missing tooling coverage, the stale `vite.config.ts` setup path, the weakened tests, and the remaining non-blocking warnings.
- **Placeholder scan:** No `TODO`, `TBD`, or “fix later” placeholders remain in the task steps.
- **Type consistency:** The plan uses a single `DetectedItemsInput` contract across `src/types/index.ts`, `src/context/AppContext.tsx`, and `src/components/CameraView/CameraView.tsx`.

Plan complete and saved to `docs/superpowers/plans/2026-04-05-typescript-migration-remediation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

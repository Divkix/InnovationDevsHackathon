# InsureScope TypeScript Migration - Test Conversion Plan

## Executive Summary

**Current State:**
- ✅ 29 source files converted to TypeScript
- ✅ All components, hooks, utils, and context migrated
- ✅ Build passes, typecheck passes
- ⚠️ 16 test files remain in JavaScript/JSX
- ⚠️ 3 config files remain in JavaScript

**Goal:** Complete TypeScript migration by converting all test files and config files.

---

## Review Findings Summary

### ✅ What's Working Well

1. **Type Definitions** (`src/types/index.ts`)
   - Comprehensive domain types covering Policy, Detection, App State
   - Component props interfaces defined
   - Proper exports and React type imports

2. **Build & Typecheck**
   - `npm run build` - PASS
   - `npm run typecheck` - PASS
   - `tsconfig` properly configured with `allowJs: false` for app code

3. **Hook Patterns**
   - `useYOLODetection.ts` - Complex ONNX hook properly typed
   - `useObjectDetection.ts` - Clean wrapper
   - `useMockDetection.ts` - Good useMemo/useCallback typing
   - `useGemini.ts` - API hook with proper return types

4. **Utility Functions**
   - `yoloProcessor.ts` - Pure functions with explicit types
   - `coverageLookup.ts` - Business logic with PolicyType union
   - `valueCalculator.ts` - Calculation types well defined

### 🔴 Critical Issues Fixed

| Issue | File | Fix Applied |
|-------|------|-------------|
| `unknown` in union | `types/index.ts` | Removed `unknown` from `updateDetectedItems`, created discriminated union |
| Redundant `bbox` field | `types/index.ts` | Removed - `DetectedItem` already extends `Detection` with `boundingBox` |
| Gemini return type | `types/index.ts` | Changed from `Promise<unknown>` to `Promise<GeminiCoverageResponse \| null>` |
| Union precedence | `types/index.ts` | Fixed `DetailModalProps.item` with proper `ModalItem` type alias |
| Missing React imports | `types/index.ts` | Added `import type { RefObject, ReactNode } from 'react'` |

---

## Remaining JavaScript Files Inventory

### Category 1: Config Files (3 files) - **MUST CONVERT FIRST**

| File | Complexity | Effort | Dependencies |
|------|------------|--------|--------------|
| `vite.config.js` | Low | 15 min | None |
| `vitest.config.js` | Low | 15 min | None |
| `eslint.config.js` | Low | 15 min | None |

**Why first?** Config files are imported by no other files. They're the safest to convert and establish the pattern.

### Category 2: Simple Test Files (5 files) - **QUICK WINS**

| File | Lines | Complexity | Key Dependencies | Effort |
|------|-------|------------|------------------|--------|
| `utils/yoloProcessor.test.js` | 112 | Simple | yoloProcessor | 15-30 min |
| `hooks/useObjectDetection.test.jsx` | 52 | Simple | useObjectDetection | 15 min |
| `__tests__/App.test.jsx` | 63 | Simple | App component | 15 min |
| `components/TabNavigation/TabNavigation.test.jsx` | 271 | Simple | TabNavigation | 15-30 min |
| `components/ConfidenceThresholdSlider/ConfidenceThresholdSlider.test.jsx` | 299 | Simple | ConfidenceThresholdSlider | 15-30 min |

**Characteristics:**
- Standard React Testing Library patterns
- Minimal mocking
- Simple assertions

### Category 3: Medium Complexity Tests (3 files)

| File | Lines | Complexity | Key Dependencies | Effort |
|------|-------|------------|------------------|--------|
| `hooks/useMockDetection.test.jsx` | 261 | Medium | localStorage, URL params | 30-45 min |
| `utils/coverageLookup.test.js` | 413 | Medium | coverageLookup | 30-45 min |
| `__tests__/App.tab-navigation.test.jsx` | 302 | Medium | App component, navigation | 30-60 min |
| `context/AppContext.test.jsx` | 579 | Medium | localStorage, context | 30-60 min |

**Characteristics:**
- localStorage mocking
- Provider wrapping
- Some async patterns

### Category 4: Complex Tests (7 files) - **NEED CAREFUL HANDLING**

| File | Lines | Complexity | Key Challenges | Effort |
|------|-------|------------|----------------|--------|
| `components/DetailModal/DetailModal.test.jsx` | 1,033 | Complex | Modal dialogs, keyboard events | 1-2 hrs |
| `components/CoverageOverlay/CoverageOverlay.test.jsx` | 869 | Complex | Canvas API, requestAnimationFrame | 1-2 hrs |
| `components/Dashboard/Dashboard.test.jsx` | 751 | Complex | Value calculations, animations | 1-2 hrs |
| `components/PolicySelector/PolicySelector.test.jsx` | 582 | Complex | Coverage lookup mocking | 1-2 hrs |
| `components/CameraView/CameraView.test.jsx` | 641 | Complex | getUserMedia, YOLO hooks | 1-2 hrs |
| `hooks/useYOLODetection.test.jsx` | 712 | Complex | TensorFlow.js mocks, WebGL | 1-2 hrs |
| `utils/valueCalculator.test.js` | 533 | Complex | Many test cases, calculations | 45-60 min |

**Characteristics:**
- Canvas mocking
- Web API mocking (getUserMedia, localStorage)
- Complex component interactions
- Hook mocking

---

## Phase-by-Phase Conversion Plan

### Phase 0: Preparation (15 minutes)

**Goal:** Prepare infrastructure for test TypeScript support

**Tasks:**
1. Update `tsconfig.test.json` to include test globals properly
2. Ensure `@types/testing-library__jest-dom` is installed
3. Create test type helpers file if needed

**Verification:**
```bash
npm run typecheck:test  # Should pass
```

---

### Phase 1: Config Files (15 minutes, 1 subagent)

**Files:**
- `vite.config.js` → `vite.config.ts`
- `vitest.config.js` → `vitest.config.ts`
- `eslint.config.js` → `eslint.config.ts`

**Migration Steps:**
1. Rename file extension
2. Add `import type` where needed
3. Export default with explicit type annotation if required
4. Verify build still works

**Example Changes:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**Verification:**
```bash
npm run build
npm run typecheck
```

---

### Phase 2: Simple Test Files (2 hours, 5 parallel subagents)

**Strategy:** Maximum parallelism - no dependencies between these files

**Dispatch 5 subagents simultaneously:**

| Subagent | File | Focus |
|----------|------|-------|
| A | `yoloProcessor.test.js` | Pure function tests |
| B | `useObjectDetection.test.jsx` | Hook wrapper tests |
| C | `App.test.jsx` | Component rendering |
| D | `TabNavigation.test.jsx` | UI interaction |
| E | `ConfidenceThresholdSlider.test.jsx` | Form input tests |

**Common Conversion Tasks:**
1. Rename `.js/.jsx` → `.ts/.tsx`
2. Add imports from `@/types` for any typed test data
3. Type test fixtures using domain types
4. Add return type annotations to helper functions
5. Type mock functions with `vi.fn<Parameters, ReturnType>`

**Pattern Example:**
```typescript
// Before (JS)
import { processYOLOOutput } from './yoloProcessor'

test('processes detections', () => {
  const input = [[100, 100, 200, 200, 0.9, 0]]
  const result = processYOLOOutput(input, classNames)
  expect(result).toHaveLength(1)
})

// After (TS)
import { processYOLOOutput } from './yoloProcessor'
import type { YOLODetection, Detection } from '../types'

test('processes detections', () => {
  const input: YOLODetection[] = [[100, 100, 200, 200, 0.9, 0]]
  const result: Detection[] = processYOLOOutput(input, classNames)
  expect(result).toHaveLength(1)
})
```

**Verification:**
```bash
npm run typecheck:test
npm run test -- --run
```

---

### Phase 3: Medium Complexity Tests (3 hours, 4 parallel subagents)

**Strategy:** Group by dependency patterns

| Batch | Files | Subagents | Dependencies |
|-------|-------|-----------|--------------|
| 3A | `useMockDetection.test.jsx`, `coverageLookup.test.js` | 2 | localStorage mocking |
| 3B | `App.tab-navigation.test.jsx`, `AppContext.test.jsx` | 2 | Context providers |

**Focus Areas:**

**localStorage Mocking Pattern:**
```typescript
// Define typed mock storage
interface MockStorage {
  [key: string]: string
}

const mockStorage: MockStorage = {}

// Type the mock implementation
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn<(key: string) => string | null>((key) => mockStorage[key] || null),
    setItem: vi.fn<(key: string, value: string) => void>((key, value) => {
      mockStorage[key] = value
    }),
    // ...
  },
  writable: true
})
```

**Context Provider Pattern:**
```typescript
// Type the wrapper props
interface WrapperProps {
  children: React.ReactNode
}

const wrapper = ({ children }: WrapperProps): React.ReactElement => (
  <AppProvider>{children}</AppProvider>
)
```

**Verification:**
```bash
npm run typecheck:test
npm run test -- --run
```

---

### Phase 4: Complex Component Tests (6 hours, 6 parallel subagents)

**Strategy:** Convert the complex tests in parallel batches

| Batch | Files | Challenges |
|-------|-------|------------|
| 4A | `CameraView.test.jsx`, `CoverageOverlay.test.jsx` | Canvas API, Web APIs |
| 4B | `Dashboard.test.jsx`, `PolicySelector.test.jsx` | Calculations, mocking |
| 4C | `DetailModal.test.jsx`, `AppContext.test.jsx` | Complex interactions |

**Special Handling:**

**Canvas Mocking:**
```typescript
// Type the canvas context mock
interface MockCanvasContext {
  fillRect: vi.Mock
  clearRect: vi.Mock
  // ... all used methods
}

HTMLCanvasElement.prototype.getContext = vi.fn<
  (contextId: string) => MockCanvasContext | null
>(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  // ...
}))
```

**Web API Mocking (getUserMedia):**
```typescript
// Type the media stream mock
interface MockMediaStream {
  getTracks: vi.Mock<() => MockMediaStreamTrack[]>
  // ...
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn<() => Promise<MockMediaStream>>(() => 
      Promise.resolve({
        getTracks: vi.fn(() => [{ stop: vi.fn() }])
      })
    )
  }
})
```

**Hook Mocking with Types:**
```typescript
// Type the mocked hook return
interface MockUseObjectDetection {
  detect: vi.Mock
  isLoaded: boolean
  error: Error | null
  isMockMode: boolean
}

vi.mocked(useObjectDetection).mockReturnValue({
  detect: vi.fn(),
  isLoaded: true,
  error: null,
  isMockMode: false
} as MockUseObjectDetection)
```

**Verification:**
```bash
npm run typecheck:test
npm run test -- --run
```

---

### Phase 5: Final Cleanup (30 minutes)

**Tasks:**
1. Set `allowJs: false` in `tsconfig.test.json`
2. Run full typecheck
3. Run full test suite
4. Build verification
5. Delete any remaining `.js` files in `src/`

**Verification Commands:**
```bash
npm run typecheck      # Should pass
npm run test -- --run  # All tests should pass
npm run build          # Should build successfully
```

---

## Total Effort Estimate

| Phase | Files | Estimated Time | Parallel Subagents |
|-------|-------|----------------|-------------------|
| 0: Prep | 0 | 15 min | 1 |
| 1: Config | 3 | 15 min | 1 |
| 2: Simple | 5 | 2 hrs | 5 |
| 3: Medium | 4 | 3 hrs | 4 |
| 4: Complex | 7 | 6 hrs | 6 |
| 5: Cleanup | 0 | 30 min | 1 |
| **TOTAL** | **19** | **~12 hours** | **18 parallel tasks** |

**With parallel subagents:** Can complete in ~4-5 wall-clock hours

---

## Critical Patterns for Test Migration

### 1. Test Data Fixtures

**Always type test fixtures:**
```typescript
import type { DetectedItem, ManualItem } from '../types'

const mockDetectedItem: DetectedItem = {
  id: 'test-1',
  category: 'laptop',
  confidence: 0.95,
  boundingBox: { originX: 10, originY: 10, width: 100, height: 100 },
  categories: [{ categoryName: 'laptop', score: 0.95, displayName: 'Laptop' }]
}

const mockManualItem: ManualItem = {
  id: 'manual-1',
  name: 'My Laptop',
  category: 'laptop',
  estimatedValue: 1200
}
```

### 2. Mock Function Typing

**Use `vi.fn` with explicit types:**
```typescript
import { vi } from 'vitest'

// Typed mock
const mockDetect = vi.fn<
  (video: HTMLVideoElement | null, timestamp: number) => Promise<{ detections: Detection[] }>
>(() => Promise.resolve({ detections: [] }))

// Or with implementation
const mockConsole = vi.spyOn(console, 'error').mockImplementation(
  (message: string, ...args: unknown[]): void => {
    // implementation
  }
)
```

### 3. Async Test Patterns

**Type async test helpers:**
```typescript
async function waitForDetection(
  callback: () => void,
  timeout: number = 1000
): Promise<void> {
  await waitFor(callback, { timeout })
}
```

### 4. Provider Wrappers

**Always type wrapper components:**
```typescript
import type { ReactElement, ReactNode } from 'react'

interface TestProviderProps {
  children: ReactNode
  initialState?: Partial<AppState>
}

function TestProvider({ children, initialState }: TestProviderProps): ReactElement {
  return (
    <AppProvider initialState={initialState}>
      {children}
    </AppProvider>
  )
}
```

---

## Risk Mitigation

### Risk: Tests Break After Conversion

**Mitigation:**
- Convert one file at a time (per subagent)
- Run tests after each file conversion
- Keep original `.js` file until new `.ts` passes
- Use `git diff` to verify no logic changes

### Risk: Complex Mock Types Are Wrong

**Mitigation:**
- Reference the actual module types
- Use `satisfies` operator to check mock shapes
- Add `// @ts-expect-error` comments for intentional type skips

### Risk: Canvas/Web API Mocks Are Complex

**Mitigation:**
- Create shared mock utilities in `src/test-utils/`
- Document mock interfaces
- Consider using `jest-canvas-mock` or similar packages

---

## Success Criteria

- [ ] All 19 remaining JS files converted to TS/TSX
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run test -- --run` passes with all tests green
- [ ] `npm run build` produces valid production build
- [ ] No `.js` or `.jsx` files remain in `src/` (except excluded)
- [ ] `allowJs: false` in both `tsconfig.app.json` and `tsconfig.test.json`

---

## Immediate Next Steps

1. **Phase 0:** Run preparation checks (15 min)
2. **Phase 1:** Dispatch 1 subagent for config files (15 min)
3. **Phase 2:** Dispatch 5 parallel subagents for simple tests (2 hrs)
4. **Phase 3:** Dispatch 4 parallel subagents for medium tests (3 hrs)
5. **Phase 4:** Dispatch 6 parallel subagents for complex tests (6 hrs)
6. **Phase 5:** Final verification and cleanup (30 min)

**Ready to execute?** All review findings have been incorporated, types are fixed, and the plan is ready for parallel subagent execution.

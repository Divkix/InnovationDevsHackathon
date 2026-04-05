# Integration: Shared Contracts & App Wiring — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement task-by-task.

**Goal:** Add shared type contracts, extend AppContext state, and wire placeholder sections in App.tsx for hazard warnings, disaster simulator, recommendations, and privacy mode.

**Architecture:** Minimal approach A — only shared types and wiring. Features stay in Dashboard sections. Privacy mode and simulator type persist; hazards/simulations/recommendations stay computed/derived.

**Tech Stack:** Vite + React 19 + TypeScript + Tailwind CSS 4

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Add 6 new shared interfaces (HazardWarning, DisasterSimulationResult, etc.) |
| `src/context/appState.ts` | Add storage keys and defaults for privacy mode + simulator type |
| `src/context/AppContext.tsx` | Add new state, persistence logic, and actions |
| `src/App.tsx` | Add placeholder sections in dashboard area |

---

### Task 1: Add Shared Types to src/types/index.ts

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add Hazard & Disaster types**

Add these interfaces after the existing `TestGlobals` interface:

```typescript
// ============================================================================
// Hazard & Disaster Types
// ============================================================================

export type DisasterType = "fire" | "theft" | "flood" | "earthquake";

export interface HazardWarning {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  message: string;
  relatedCategories: string[];
  positive?: boolean;
}

export interface DisasterImpactItem {
  itemId: string;
  category: string;
  estimatedValue: number;
  lossAmount: number;
  coveredAmount: number;
  outOfPocketAmount: number;
}

export interface DisasterSimulationResult {
  type: DisasterType;
  totalLoss: number;
  currentPolicyOutOfPocket: number;
  recommendedPolicyOutOfPocket: number;
  uncoveredItems: number;
  impactedItems: DisasterImpactItem[];
  insight: string;
}

// ============================================================================
// Recommendation & Privacy Types
// ============================================================================

export interface CoverageRecommendation {
  id: string;
  title: string;
  description: string;
  estimatedMonthlyCost?: number;
  exposureReductionPercent?: number;
  priority: "high" | "medium" | "low";
}

export interface PrivacyModeState {
  enabled: boolean;
  localOnlyMessage: string;
}
```

- [ ] **Step 2: Update AppState interface**

Add new fields to the `AppState` interface:

```typescript
export interface AppState {
  // ... existing fields ...
  
  // New feature state
  privacyMode: PrivacyModeState;
  activeSimulatorType: DisasterType | null;
  hazardWarnings: HazardWarning[];
  simulationResult: DisasterSimulationResult | null;
  recommendations: CoverageRecommendation[];
}
```

- [ ] **Step 3: Update AppContextValue interface**

Add new state fields and actions to `AppContextValue`:

```typescript
export interface AppContextValue {
  // ... existing state ...
  
  // New state
  privacyMode: PrivacyModeState;
  activeSimulatorType: DisasterType | null;
  hazardWarnings: HazardWarning[];
  simulationResult: DisasterSimulationResult | null;
  recommendations: CoverageRecommendation[];
  
  // ... existing actions ...
  
  // New actions
  setPrivacyMode: (enabled: boolean) => void;
  setActiveSimulatorType: (type: DisasterType | null) => void;
  setHazardWarnings: (warnings: HazardWarning[]) => void;
  setSimulationResult: (result: DisasterSimulationResult | null) => void;
  setRecommendations: (recommendations: CoverageRecommendation[]) => void;
}
```

- [ ] **Step 4: Update StorageKeys interface**

Add new storage keys:

```typescript
export interface StorageKeys {
  // ... existing keys ...
  privacyMode: string;
  activeSimulatorType: string;
}
```

- [ ] **Step 5: Run typecheck**

Run: `bun run typecheck:app`
Expected: PASS (no new errors from type additions)

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add shared interfaces for hazards, simulator, recommendations, privacy"
```

---

### Task 2: Update appState.ts with Storage Keys and Defaults

**Files:**
- Modify: `src/context/appState.ts`

- [ ] **Step 1: Add new storage keys**

Add to `STORAGE_KEYS`:

```typescript
export const STORAGE_KEYS: StorageKeys = {
  // ... existing keys ...
  privacyMode: "insurescope_privacyMode",
  activeSimulatorType: "insurescope_activeSimulatorType",
};
```

- [ ] **Step 2: Add default state values**

Add to `DEFAULT_STATE`:

```typescript
export const DEFAULT_STATE: AppState = {
  // ... existing fields ...
  
  // New feature defaults
  privacyMode: {
    enabled: false,
    localOnlyMessage: "All processing happens on your device. No data leaves your browser.",
  },
  activeSimulatorType: null,
  hazardWarnings: [],
  simulationResult: null,
  recommendations: [],
};
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck:app`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/context/appState.ts
git commit -m "feat(appState): add storage keys and defaults for privacy mode and simulator"
```

---

### Task 3: Extend AppContext with New State and Actions

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1: Add new useState hooks**

After existing `useState` hooks, add:

```typescript
// Load persisted privacy mode
const [privacyMode, setPrivacyModeState] = useState<PrivacyModeState>(() =>
  loadFromStorage<PrivacyModeState>(
    STORAGE_KEYS.privacyMode,
    DEFAULT_STATE.privacyMode,
    (v) => JSON.parse(v) as PrivacyModeState,
  ),
);

// Load persisted simulator type
const [activeSimulatorType, setActiveSimulatorTypeState] = useState<DisasterType | null>(() =>
  loadFromStorage<DisasterType | null>(
    STORAGE_KEYS.activeSimulatorType,
    DEFAULT_STATE.activeSimulatorType,
    (v) => v as DisasterType | null,
  ),
);

// Transient state (not persisted)
const [hazardWarnings, setHazardWarningsState] = useState<HazardWarning[]>(
  DEFAULT_STATE.hazardWarnings,
);
const [simulationResult, setSimulationResultState] = useState<DisasterSimulationResult | null>(
  DEFAULT_STATE.simulationResult,
);
const [recommendations, setRecommendationsState] = useState<CoverageRecommendation[]>(
  DEFAULT_STATE.recommendations,
);
```

- [ ] **Step 2: Add new action callbacks**

Add after existing `useCallback` actions:

```typescript
/**
 * Action: setPrivacyMode
 * Enables/disables privacy mode and persists to localStorage
 */
const setPrivacyMode = useCallback((enabled: boolean): void => {
  const newMode: PrivacyModeState = {
    ...privacyMode,
    enabled,
  };
  setPrivacyModeState(newMode);
  saveToStorage(STORAGE_KEYS.privacyMode, JSON.stringify(newMode));
}, [privacyMode]);

/**
 * Action: setActiveSimulatorType
 * Sets the active disaster simulator type and persists to localStorage
 */
const setActiveSimulatorType = useCallback((type: DisasterType | null): void => {
  setActiveSimulatorTypeState(type);
  if (type) {
    saveToStorage(STORAGE_KEYS.activeSimulatorType, type);
  } else {
    localStorage.removeItem(STORAGE_KEYS.activeSimulatorType);
  }
}, []);

/**
 * Action: setHazardWarnings
 * Updates hazard warnings (transient, computed from detections)
 */
const setHazardWarnings = useCallback((warnings: HazardWarning[]): void => {
  setHazardWarningsState(warnings);
}, []);

/**
 * Action: setSimulationResult
 * Updates disaster simulation result (transient, computed on demand)
 */
const setSimulationResult = useCallback((result: DisasterSimulationResult | null): void => {
  setSimulationResultState(result);
}, []);

/**
 * Action: setRecommendations
 * Updates coverage recommendations (transient, computed from gaps)
 */
const setRecommendations = useCallback((newRecommendations: CoverageRecommendation[]): void => {
  setRecommendationsState(newRecommendations);
}, []);
```

- [ ] **Step 3: Update contextValue memo**

Add new state and actions to the `useMemo` return object:

```typescript
const contextValue = useMemo<AppContextValue>(
  () => ({
    // ... existing state and actions ...
    
    // New state
    privacyMode,
    activeSimulatorType,
    hazardWarnings,
    simulationResult,
    recommendations,
    
    // New actions
    setPrivacyMode,
    setActiveSimulatorType,
    setHazardWarnings,
    setSimulationResult,
    setRecommendations,
  }),
  [
    // ... existing dependencies ...
    privacyMode,
    activeSimulatorType,
    hazardWarnings,
    simulationResult,
    recommendations,
    setPrivacyMode,
    setActiveSimulatorType,
    setHazardWarnings,
    setSimulationResult,
    setRecommendations,
  ],
);
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck:app`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `bun x vitest run src/context/`
Expected: All tests pass (if any exist for context)

- [ ] **Step 6: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat(context): add privacy mode, simulator, hazards, recommendations state"
```

---

### Task 4: Wire Placeholder Sections in App.tsx Dashboard

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add new state to App component destructuring**

Update the `useAppContext()` destructuring to include new state for passing to placeholders:

```typescript
const {
  // ... existing ...
  privacyMode,
  activeSimulatorType,
  hazardWarnings,
  simulationResult,
  recommendations,
  setPrivacyMode,
  setActiveSimulatorType,
  setHazardWarnings,
  setSimulationResult,
  setRecommendations,
} = useAppContext();
```

- [ ] **Step 2: Add placeholder sections in Dashboard tab**

Inside the `activeTab === "dashboard"` block, after the existing `<Dashboard ... />` component and before the closing `</div>`, add:

```typescript
{/* Feature Sections - Placeholders for Matin & Maitreyee */}

{/* Hazard Warnings Section - owned by Matin */}
<section 
  data-section="hazard-warnings" 
  data-owner="matin"
  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
>
  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
    <h3 className="font-black uppercase tracking-widest">Hazard Warnings</h3>
  </div>
  <div className="p-6">
    {hazardWarnings.length > 0 ? (
      <ul className="space-y-3">
        {hazardWarnings.map((warning) => (
          <li 
            key={warning.id} 
            className={`p-4 border-2 ${
              warning.severity === 'high' ? 'border-red-500 bg-red-50' :
              warning.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-green-500 bg-green-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{warning.title}</span>
              <span className={`text-xs uppercase px-2 py-1 ${
                warning.severity === 'high' ? 'bg-red-500 text-white' :
                warning.severity === 'medium' ? 'bg-yellow-500 text-black' :
                'bg-green-500 text-white'
              }`}>{warning.severity}</span>
            </div>
            <p className="text-sm mt-2 text-swiss-fg/80">{warning.message}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-swiss-fg/60 italic">No hazards detected. Scan items to see warnings.</p>
    )}
  </div>
</section>

{/* Disaster Simulator Section - owned by Matin */}
<section 
  data-section="disaster-simulator" 
  data-owner="matin"
  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
>
  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg flex items-center justify-between">
    <h3 className="font-black uppercase tracking-widest">Disaster Simulator</h3>
    <select 
      value={activeSimulatorType || ''}
      onChange={(e) => setActiveSimulatorType(e.target.value as DisasterType || null)}
      className="bg-swiss-bg text-swiss-fg border-2 border-swiss-fg px-3 py-1 text-sm uppercase font-bold"
    >
      <option value="">Select disaster type...</option>
      <option value="fire">Fire</option>
      <option value="theft">Theft</option>
      <option value="flood">Flood</option>
      <option value="earthquake">Earthquake</option>
    </select>
  </div>
  <div className="p-6">
    {simulationResult ? (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border-2 border-swiss-fg">
            <div className="text-sm uppercase text-swiss-fg/60">Total Loss</div>
            <div className="text-2xl font-black">${simulationResult.totalLoss.toLocaleString()}</div>
          </div>
          <div className="p-4 border-2 border-swiss-fg">
            <div className="text-sm uppercase text-swiss-fg/60">Your Out-of-Pocket</div>
            <div className="text-2xl font-black text-red-600">
              ${simulationResult.currentPolicyOutOfPocket.toLocaleString()}
            </div>
          </div>
        </div>
        <p className="text-sm text-swiss-fg/80">{simulationResult.insight}</p>
      </div>
    ) : (
      <p className="text-swiss-fg/60 italic">
        {activeSimulatorType 
          ? `Ready to simulate ${activeSimulatorType}. Integration pending Matin's implementation.` 
          : 'Select a disaster type to see potential impact on your coverage.'}
      </p>
    )}
  </div>
</section>

{/* Recommendations Section - owned by Maitreyee */}
<section 
  data-section="recommendations" 
  data-owner="maitreyee"
  className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
>
  <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
    <h3 className="font-black uppercase tracking-widest">Smart Recommendations</h3>
  </div>
  <div className="p-6">
    {recommendations.length > 0 ? (
      <ul className="space-y-4">
        {recommendations.map((rec) => (
          <li key={rec.id} className="p-4 border-2 border-swiss-fg bg-swiss">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold">{rec.title}</h4>
                <p className="text-sm text-swiss-fg/80 mt-1">{rec.description}</p>
              </div>
              <span className={`text-xs uppercase px-2 py-1 ${
                rec.priority === 'high' ? 'bg-swiss-accent text-swiss-bg' :
                rec.priority === 'medium' ? 'bg-swiss-fg text-swiss-bg' :
                'bg-swiss-fg/30 text-swiss-fg'
              }`}>{rec.priority}</span>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-swiss-fg/60 italic">
        No recommendations yet. Add more items or run disaster simulation to see personalized suggestions.
      </p>
    )}
  </div>
</section>

{/* Privacy Mode Toggle - owned by Maitreyee */}
<section 
  data-section="privacy-mode" 
  data-owner="maitreyee"
  className="border-2 border-swiss-accent bg-swiss-muted"
>
  <div className="px-6 py-4 border-b-2 border-swiss-accent bg-swiss-accent text-swiss-bg flex items-center justify-between">
    <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
      <Shield className="w-5 h-5" />
      Zero Documentation Mode
    </h3>
    <button
      onClick={() => setPrivacyMode(!privacyMode.enabled)}
      className={`px-4 py-2 uppercase font-bold text-sm border-2 ${
        privacyMode.enabled 
          ? 'bg-swiss-bg text-swiss-accent border-swiss-bg' 
          : 'bg-swiss-accent text-swiss-bg border-swiss-bg'
      }`}
    >
      {privacyMode.enabled ? 'Enabled' : 'Disabled'}
    </button>
  </div>
  <div className="p-6">
    <p className="text-swiss-fg/80">{privacyMode.localOnlyMessage}</p>
    {privacyMode.enabled && (
      <div className="mt-4 p-3 bg-swiss-accent/10 border border-swiss-accent">
        <p className="text-sm text-swiss-accent font-bold uppercase">
          Privacy mode active — all AI processing runs locally in your browser
        </p>
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 3: Add DisasterType import**

Add `DisasterType` to the types import at the top:

```typescript
import type { DisasterType, ManualItem } from "./types";
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck:app`
Expected: PASS

- [ ] **Step 5: Run build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 6: Run tests**

Run: `bun x vitest run`
Expected: All 429 tests pass

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire placeholder sections for hazards, simulator, recommendations, privacy"
```

---

### Task 5: Final Verification & Integration Ready

- [ ] **Step 1: Run full typecheck**

Run: `bun run typecheck`
Expected: All three configs pass

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `bun x vitest run`
Expected: All 429 tests pass

- [ ] **Step 4: Build production**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 5: Create integration summary comment**

Add a code comment at the top of `src/App.tsx` briefly documenting the placeholder sections for teammates:

```typescript
/**
 * INTEGRATION NOTES FOR TEAMMATES
 * 
 * This file contains placeholder sections for new features being built
 * by Matin (hazard warnings, disaster simulator) and Maitreyee (recommendations, privacy mode).
 * 
 * Placeholder sections are marked with data-owner and data-section attributes.
 * When implementing your feature, replace the placeholder content inside these sections.
 * 
 * DO NOT modify section containers (they're owned by Divanshu/Integrator).
 * DO modify content inside sections (that's your feature code).
 */
```

- [ ] **Step 6: Final commit**

```bash
git add src/App.tsx
git commit -m "docs(app): add integration notes for teammates"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|----------------- |------|
| Add shared types for hazards, simulation, recommendations, privacy | Task 1 |
| Add storage keys and defaults | Task 2 |
| Add new AppContext state and persistence | Task 3 |
| Wire placeholder sections in App.tsx | Task 4 |
| No TabNavigation changes | Verified — kept Camera/Dashboard only |
| Keep demo flow simple | Verified — sections in dashboard only |
| Privacy + simulator type persist | Tasks 2-3 |
| Hazards/simulation/recommendations transient | Task 3 — no saveToStorage calls |

## Placeholder Scan

No TBD/TODO/FIXME markers in the actual code. Placeholder UI is functional (shows data if available, helpful messages if not).

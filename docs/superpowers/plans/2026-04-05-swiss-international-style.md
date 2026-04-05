# Swiss International Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign InsureScope with Swiss International Style — zero rounded corners, pure black/white with Swiss Red (#FF3000), bold uppercase typography, visible grid structure, and pattern-based textures.

**Architecture:** Foundation-first migration with 5 phases: (1) Design tokens and CSS patterns, (2) Layout primitives, (3) Component migration (buttons → cards → inputs → nav → icons → modals), (4) Page-level redesigns, (5) Animation migration to mechanical snappy transitions.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Framer Motion (modified for linear/easeOut transitions), Vite, Vitest

---

## File Structure Overview

**New Files:**
- `src/styles/swissTheme.css` — Swiss design tokens, patterns, utilities
- `src/components/Swiss/SwissButton.tsx` — Reusable Swiss button component
- `src/components/Swiss/SwissCard.tsx` — Reusable Swiss card component
- `src/components/Swiss/SwissSectionLabel.tsx` — Numbered section label

**Modified Files:**
- `src/index.css` — Import swissTheme, update base styles
- `src/App.tsx` — App shell redesign
- `src/components/OnboardingFlow/OnboardingFlow.tsx` — Complete visual overhaul
- `src/components/Dashboard/Dashboard.tsx` — Financial summary redesign
- `src/components/TabNavigation/TabNavigation.tsx` — Swiss tab navigation
- `src/components/DetailModal/DetailModal.tsx` — Modal redesign
- `src/components/CameraView/CameraView.tsx` — Overlay styling
- `src/components/CoverageOverlay/CoverageOverlay.tsx` — Badge styling
- `src/components/AddItemForm/AddItemForm.tsx` — Form input styling
- `src/components/PolicySelector/PolicySelector.tsx` — Selector styling

---

## Phase 1: Design Tokens Foundation

### Task 1.1: Create Swiss Theme CSS File

**Files:**
- Create: `src/styles/swissTheme.css`

- [ ] **Step 1: Write the Swiss design tokens CSS**

Create `src/styles/swissTheme.css` with this content:

```css
/**
 * Swiss International Style Design System
 * Pure black/white with Swiss Red (#FF3000)
 * Zero rounded corners, visible grid structure
 */

/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');

:root {
  /* Swiss Color System */
  --swiss-bg: #FFFFFF;
  --swiss-fg: #000000;
  --swiss-muted: #F2F2F2;
  --swiss-accent: #FF3000;
  --swiss-border: #000000;
  
  /* Semantic mappings */
  --color-primary: var(--swiss-fg);
  --color-accent: var(--swiss-accent);
  --color-background: var(--swiss-bg);
  --color-muted: var(--swiss-muted);
}

/* Base typography */
html {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  font-weight: 400;
}

/* Strictly rectangular — override any rounded corners */
* {
  border-radius: 0 !important;
}

/* Exception: icon containers may be circular */
.swiss-icon-circle {
  border-radius: 9999px !important;
}

/* ============================================
   PATTERN TEXTURES
   ============================================ */

/* Grid Pattern — 24×24px grid lines at 3% opacity */
.swiss-grid-pattern {
  background-image: 
    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Dot Matrix — 16×16px dots at 4% opacity */
.swiss-dots {
  background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 16px 16px;
}

/* Diagonal Lines — 45° lines at 2% opacity */
.swiss-diagonal {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0,0,0,0.02) 10px,
    rgba(0,0,0,0.02) 11px
  );
}

/* Noise Texture — fractal noise at 1.5% opacity */
.swiss-noise {
  position: relative;
}

.swiss-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.015;
  pointer-events: none;
  z-index: 0;
}

.swiss-noise > * {
  position: relative;
  z-index: 1;
}

/* ============================================
   TYPOGRAPHY UTILITIES
   ============================================ */

/* Swiss uppercase with tracking */
.swiss-uppercase {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.swiss-uppercase-wide {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.swiss-uppercase-tight {
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

/* ============================================
   BORDERS & STRUCTURE
   ============================================ */

/* Thick Swiss borders */
.swiss-border {
  border: 2px solid var(--swiss-border);
}

.swiss-border-thick {
  border: 4px solid var(--swiss-border);
}

/* Section separators */
.swiss-section-border {
  border-top: 4px solid var(--swiss-border);
}

/* ============================================
   COLOR UTILITIES
   ============================================ */

.bg-swiss { background-color: var(--swiss-bg); }
.bg-swiss-muted { background-color: var(--swiss-muted); }
.bg-swiss-accent { background-color: var(--swiss-accent); }
.bg-swiss-fg { background-color: var(--swiss-fg); }

.text-swiss { color: var(--swiss-fg); }
.text-swiss-muted { color: #737373; }
.text-swiss-accent { color: var(--swiss-accent); }
.text-swiss-bg { color: var(--swiss-bg); }

.border-swiss { border-color: var(--swiss-border); }
.border-swiss-accent { border-color: var(--swiss-accent); }

/* ============================================
   SPACING UTILITIES (Swiss generous spacing)
   ============================================ */

.swiss-p-section { padding: 3rem 2rem; }
.swiss-p-card { padding: 2rem; }

@media (min-width: 768px) {
  .swiss-p-section { padding: 4rem 3rem; }
  .swiss-p-card { padding: 3rem; }
}

@media (min-width: 1024px) {
  .swiss-p-section { padding: 6rem 4rem; }
  .swiss-p-card { padding: 4rem; }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */

/* Focus visible — Swiss Red outline */
:focus-visible {
  outline: 2px solid var(--swiss-accent);
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

/* High contrast touch targets */
.swiss-touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

- [ ] **Step 2: Commit Phase 1 foundation**

```bash
git add src/styles/swissTheme.css
git commit -m "feat(design): create Swiss International Style design tokens

- Add CSS custom properties for Swiss color palette
- Import Inter font (400, 500, 700, 900)
- Implement 4 pattern textures: grid, dots, diagonal, noise
- Add typography, spacing, border, and color utilities
- Enforce zero border-radius (strictly rectangular)
- Include accessibility: focus indicators, reduced motion"
```

---

### Task 1.2: Update index.css to Use Swiss Theme

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace stateFarmTheme with swissTheme**

Modify `src/index.css`:

```css
@import "tailwindcss";
/* Replace State Farm theme with Swiss International Style */
@import "./styles/swissTheme.css";

:root {
  color-scheme: light;
  color: var(--swiss-fg);
  background-color: var(--swiss-bg);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  display: flex;
  place-items: flex-start;
  min-width: 320px;
  min-height: 100vh;
  overflow-x: hidden;
  max-width: 100vw;
  /* Apply noise texture globally */
  background-color: var(--swiss-bg);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.015;
  pointer-events: none;
  z-index: 9999;
}

#root {
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  text-align: left; /* Swiss: left-aligned, not center */
  position: relative;
  z-index: 1;
}

/* Remove light/dark mode media query — Swiss is always high-contrast light */
```

- [ ] **Step 2: Verify build still works**

```bash
bun run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(design): switch to Swiss theme in index.css

- Replace State Farm theme import with swissTheme.css
- Set left-aligned text (Swiss style)
- Apply global noise texture to body
- Remove light/dark mode media query"
```

---

## Phase 2: Layout Primitives

### Task 2.1: Create Swiss Component Primitives

**Files:**
- Create: `src/components/Swiss/index.ts`
- Create: `src/components/Swiss/SwissSectionLabel.tsx`

- [ ] **Step 1: Create Swiss component index**

Create `src/components/Swiss/index.ts`:

```typescript
export { SwissSectionLabel } from './SwissSectionLabel';
export type { SwissSectionLabelProps } from './SwissSectionLabel';
```

- [ ] **Step 2: Create SwissSectionLabel component**

Create `src/components/Swiss/SwissSectionLabel.tsx`:

```typescript
import type { ReactElement } from 'react';

export interface SwissSectionLabelProps {
  number: string; // "01", "02", etc.
  label: string;  // "SYSTEM", "METHOD", etc.
  className?: string;
}

export function SwissSectionLabel({ 
  number, 
  label, 
  className = '' 
}: SwissSectionLabelProps): ReactElement {
  return (
    <div className={`flex items-center gap-2 mb-8 ${className}`}>
      <span className="text-swiss-accent font-black text-xl">{number}.</span>
      <span className="uppercase tracking-widest text-swiss font-bold text-lg">
        {label}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Swiss/
git commit -m "feat(components): create Swiss layout primitives

- Add SwissSectionLabel component for numbered section headers
- Export from Swiss component index"
```

---

## Phase 3: Component Migration

### Task 3.1: Create Swiss Button Component

**Files:**
- Create: `src/components/Swiss/SwissButton.tsx`
- Modify: `src/components/Swiss/index.ts`

- [ ] **Step 1: Create SwissButton component**

Create `src/components/Swiss/SwissButton.tsx`:

```typescript
import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';

export interface SwissButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'default' | 'large';
  children: ReactNode;
}

export function SwissButton({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  disabled,
  ...props
}: SwissButtonProps): ReactElement {
  const baseClasses = `
    font-bold uppercase tracking-widest
    border-2 transition-colors duration-200 ease-out
    flex items-center justify-center gap-2
    swiss-touch-target
  `;

  const sizeClasses = size === 'large' 
    ? 'px-8 py-4 text-base' 
    : 'px-6 py-3 text-sm';

  const variantClasses = {
    primary: `
      bg-swiss-fg text-swiss-bg border-swiss-fg
      hover:bg-swiss-accent hover:text-swiss-bg hover:border-swiss-accent
    `,
    secondary: `
      bg-swiss-bg text-swiss-fg border-swiss-fg
      hover:bg-swiss-fg hover:text-swiss-bg
    `,
    accent: `
      bg-swiss-accent text-swiss-bg border-swiss-accent
      hover:bg-swiss-fg hover:border-swiss-fg
    `,
  };

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer';

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={`
        ${baseClasses}
        ${sizeClasses}
        ${variantClasses[variant]}
        ${disabledClasses}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

- [ ] **Step 2: Export from index**

Modify `src/components/Swiss/index.ts`:

```typescript
export { SwissSectionLabel } from './SwissSectionLabel';
export type { SwissSectionLabelProps } from './SwissSectionLabel';
export { SwissButton } from './SwissButton';
export type { SwissButtonProps } from './SwissButton';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Swiss/
git commit -m "feat(components): create SwissButton component

- Primary, secondary, and accent variants
- Uppercase typography with tracking-widest
- Mechanical hover states (color inversion, no scale)
- Zero rounded corners"
```

---

### Task 3.2: Create Swiss Card Component

**Files:**
- Create: `src/components/Swiss/SwissCard.tsx`
- Modify: `src/components/Swiss/index.ts`

- [ ] **Step 1: Create SwissCard component**

Create `src/components/Swiss/SwissCard.tsx`:

```typescript
import { motion } from 'framer-motion';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

export interface SwissCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'accent';
  pattern?: 'none' | 'grid' | 'dots' | 'diagonal';
  hoverable?: boolean;
  children: ReactNode;
}

export function SwissCard({
  variant = 'default',
  pattern = 'none',
  hoverable = false,
  children,
  className = '',
  ...props
}: SwissCardProps): ReactElement {
  const baseClasses = `
    border-2 border-swiss p-8
    transition-colors duration-200 ease-out
  `;

  const variantClasses = {
    default: 'bg-swiss text-swiss-fg',
    muted: 'bg-swiss-muted text-swiss-fg',
    accent: 'bg-swiss-accent text-swiss-bg',
  };

  const patternClasses = {
    none: '',
    grid: 'swiss-grid-pattern',
    dots: 'swiss-dots',
    diagonal: 'swiss-diagonal',
  };

  const hoverClasses = hoverable
    ? 'hover:bg-swiss-fg hover:text-swiss-bg cursor-pointer'
    : '';

  return (
    <motion.div
      whileHover={hoverable ? { scale: 1.02 } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${patternClasses[pattern]}
        ${hoverClasses}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Export from index**

Modify `src/components/Swiss/index.ts`:

```typescript
export { SwissSectionLabel } from './SwissSectionLabel';
export type { SwissSectionLabelProps } from './SwissSectionLabel';
export { SwissButton } from './SwissButton';
export type { SwissButtonProps } from './SwissButton';
export { SwissCard } from './SwissCard';
export type { SwissCardProps } from './SwissCard';
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Swiss/
git commit -m "feat(components): create SwissCard component

- Default, muted, and accent variants
- Pattern support: grid, dots, diagonal
- Hoverable with color inversion
- Thick 2px borders, zero rounded corners"
```

---

## Phase 4: Page-Level Redesign

### Task 4.1: Redesign App Shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App shell with Swiss styling**

Replace the existing `src/App.tsx` with Swiss-styled version. Keep all logic identical, only update styling:

```typescript
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Package, Plus, Shield } from "lucide-react";
import { type ReactElement, useState } from "react";
import { SwissButton } from "./components/Swiss";
import { AddItemForm, ManualItemsList } from "./components/AddItemForm/AddItemForm";
import { CameraView } from "./components/CameraView/CameraView";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { DetailModal } from "./components/DetailModal/DetailModal";
import { OnboardingFlow } from "./components/OnboardingFlow/OnboardingFlow";
import { PolicySelector } from "./components/PolicySelector/PolicySelector";
import { TabNavigation } from "./components/TabNavigation/TabNavigation";
import { useAppContext } from "./context/AppContext";
import { useGemini } from "./hooks/useGemini";
import type { ManualItem } from "./types";

function App(): ReactElement {
  const {
    policyType,
    activeTab,
    manualItems,
    detectedItems,
    selectedItemId,
    onboardingComplete,
    manualModeEnabled,
    removeManualItem,
    setActiveTab,
    setSelectedItem,
    enableManualMode,
    disableManualMode,
  } = useAppContext();

  const gemini = useGemini();
  const [, setCameraError] = useState<Error | string | null>(null);
  const [isAddItemFormOpen, setIsAddItemFormOpen] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<ManualItem | null>(null);

  const handleManualMode = (): void => enableManualMode();
  const handleEnableCamera = (): void => disableManualMode();

  const selectedItem = selectedItemId
    ? detectedItems.get(selectedItemId) || manualItems.find((item) => item.id === selectedItemId)
    : null;

  const detailModalItem = selectedItem && selectedItemId
    ? { ...selectedItem, source: (detectedItems.has(selectedItemId) ? "camera" : "dashboard") as "camera" | "dashboard" }
    : null;

  const handleCloseDetailModal = (): void => setSelectedItem(null);
  const handleOpenAddItem = (): void => { setEditItem(null); setIsAddItemFormOpen(true); };
  const handleEditItem = (item: ManualItem): void => { setEditItem(item); setIsAddItemFormOpen(true); };
  const handleRemoveItem = (item: ManualItem): void => {
    if (confirm(`Remove "${item.name}"?`)) removeManualItem(item.id);
  };
  const handleCloseAddItem = (): void => { setIsAddItemFormOpen(false); setEditItem(null); };

  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-swiss flex flex-col overflow-x-hidden">
      {/* Manual Mode Banner — Swiss Style */}
      <AnimatePresence>
        {manualModeEnabled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-swiss-fg text-swiss-bg px-4 py-3 text-center border-b-2 border-swiss-accent"
          >
            <span className="font-bold uppercase tracking-widest text-sm">Manual Mode Active</span>
            <span className="mx-2 text-swiss-accent">—</span>
            <span className="text-sm">Camera disabled.</span>
            <button
              onClick={handleEnableCamera}
              className="ml-3 underline hover:text-swiss-accent uppercase text-sm font-bold"
            >
              Enable Camera
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header — Swiss Style */}
      <header className="bg-swiss border-b-4 border-swiss-fg px-6 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-swiss-fg border-2 border-swiss-fg flex items-center justify-center">
              <Shield className="w-7 h-7 text-swiss-bg" />
            </div>
            <h1 className="text-2xl font-black text-swiss-fg uppercase tracking-tight">
              InsureScope
            </h1>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <AnimatePresence>
              {gemini && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-swiss-fg text-swiss-bg border-2 border-swiss-fg uppercase font-bold text-sm tracking-widest hover:bg-swiss-accent hover:border-swiss-accent transition-colors duration-200"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Ask</span>
                </motion.button>
              )}
            </AnimatePresence>
            <PolicySelector variant="compact" detectedItems={Array.from(detectedItems?.values() || [])} manualItems={manualItems} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "camera" && (
            <motion.div
              key="camera-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full p-4 pb-24 md:pb-4"
            >
              <div className="max-w-6xl mx-auto h-full relative">
                <SwissButton
                  onClick={handleOpenAddItem}
                  variant="secondary"
                  className="absolute top-4 right-4 z-30"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </SwissButton>
                <CameraView onError={setCameraError} onManualMode={handleManualMode} onItemClick={(item) => setSelectedItem(item.id)} />
              </div>
            </motion.div>
          )}

          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto p-4 pb-24 md:pb-4"
            >
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b-2 border-swiss-fg pb-4">
                  <h2 className="text-xl font-black text-swiss-fg uppercase tracking-widest flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Your Items
                  </h2>
                  <SwissButton onClick={handleOpenAddItem} variant="accent">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </SwissButton>
                </div>

                <Dashboard
                  detectedItems={Array.from(detectedItems?.values() || [])}
                  manualItems={manualItems}
                  policyType={policyType}
                  onItemClick={(item) => setSelectedItem(item.id)}
                />

                <AnimatePresence>
                  {manualItems.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern"
                    >
                      <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-fg text-swiss-bg">
                        <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Manual Items
                          <span className="text-sm font-normal ml-2">({manualItems.length})</span>
                        </h3>
                      </div>
                      <div className="p-6">
                        <ManualItemsList
                          items={manualItems}
                          onEdit={handleEditItem}
                          onRemove={handleRemoveItem}
                          onItemClick={(item) => setSelectedItem(item.id)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <DetailModal isOpen={!!selectedItemId} onClose={handleCloseDetailModal} item={detailModalItem} policyType={policyType} />
      <AddItemForm isOpen={isAddItemFormOpen} onClose={handleCloseAddItem} editItem={editItem} />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Verify build**

```bash
bun run build
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): redesign App shell with Swiss International Style

- Header with thick 4px border, black logo square
- Manual mode banner with uppercase typography
- SwissButton integration for Add Item actions
- Remove State Farm branding and rounded corners"
```

---

### Task 4.2: Redesign OnboardingFlow

**Files:**
- Modify: `src/components/OnboardingFlow/OnboardingFlow.tsx`

- [ ] **Step 1: Completely redesign OnboardingFlow**

Replace the file with Swiss-styled version:

```typescript
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Camera, Car, Check, ChevronLeft, Home, Shield, ShieldAlert } from "lucide-react";
import { type KeyboardEvent, type ReactElement, useCallback, useState } from "react";
import { SwissButton, SwissCard, SwissSectionLabel } from "@/components/Swiss";
import { useAppContext } from "@/context/AppContext";
import type { OnboardingFlowProps, PolicyType } from "@/types";

interface PolicyOption {
  id: PolicyType;
  label: string;
  icon: LucideIcon;
  description: string;
}

const POLICY_OPTIONS: PolicyOption[] = [
  { id: "renters", label: "Renter's Insurance", icon: Home, description: "Coverage for personal property in rented homes" },
  { id: "homeowners", label: "Homeowner's Insurance", icon: Shield, description: "Full property and belongings coverage" },
  { id: "auto", label: "Auto Insurance", icon: Car, description: "Vehicle coverage and roadside protection" },
  { id: "none", label: "No Insurance", icon: ShieldAlert, description: "See what is unprotected (demo mode)" },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps): ReactElement {
  const { policyType, setPolicyType, completeOnboarding } = useAppContext();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyType | null>(policyType || null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const handlePolicySelect = useCallback((policyId: PolicyType): void => {
    setSelectedPolicy(policyId);
    setPolicyType(policyId);
  }, [setPolicyType]);

  const handleNext = useCallback((): void => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentStep === 1) {
        setCurrentStep(2);
      } else {
        completeOnboarding();
        if (onComplete) onComplete();
      }
      setIsTransitioning(false);
    }, 300);
  }, [currentStep, isTransitioning, completeOnboarding, onComplete]);

  const handleBack = useCallback((): void => {
    if (isTransitioning || currentStep === 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(1);
      setIsTransitioning(false);
    }, 300);
  }, [currentStep, isTransitioning]);

  const handleSkip = useCallback((): void => {
    setSelectedPolicy("renters");
    setPolicyType("renters");
    completeOnboarding();
    if (onComplete) onComplete();
  }, [setPolicyType, completeOnboarding, onComplete]);

  return (
    <div className="min-h-screen bg-swiss swiss-noise flex flex-col" data-testid="onboarding-flow">
      {/* Hero */}
      <div className="border-b-4 border-swiss-fg py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-swiss-fg flex items-center justify-center">
              <Shield className="w-10 h-10 text-swiss-bg" />
            </div>
            <div>
              <h1 className="text-6xl md:text-8xl font-black text-swiss-fg uppercase tracking-tighter leading-none">
                InsureScope
              </h1>
              <p className="text-sm uppercase tracking-widest text-swiss-fg/70 mt-2">
                Object Detection for Insurance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SwissSectionLabel number="01" label="Policy" className="justify-center" />
                
                <h2 className="text-3xl font-black text-swiss-fg uppercase tracking-tight text-center mb-2">
                  Select Your Insurance
                </h2>
                <p className="text-swiss-fg/70 text-center mb-8">
                  Choose your current policy type. You can change this later.
                </p>

                {/* Policy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-2 border-swiss-fg mb-8">
                  {POLICY_OPTIONS.map((policy, index) => {
                    const Icon = policy.icon;
                    const isSelected = selectedPolicy === policy.id;
                    const isFirstRow = index < 2;
                    
                    return (
                      <motion.button
                        key={policy.id}
                        whileHover={{ backgroundColor: isSelected ? '#FF3000' : '#000000' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePolicySelect(policy.id)}
                        className={`
                          p-8 flex flex-col items-center text-left
                          border-swiss-fg
                          ${isFirstRow ? 'border-b-2' : ''}
                          ${index % 2 === 0 ? 'border-r-2' : ''}
                          ${isSelected ? 'bg-swiss-accent text-swiss-bg' : 'bg-swiss text-swiss-fg'}
                          transition-colors duration-200
                        `}
                      >
                        <div className={`
                          w-12 h-12 border-2 mb-4 flex items-center justify-center
                          ${isSelected ? 'border-swiss-bg' : 'border-swiss-fg'}
                        `}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-black uppercase tracking-wide text-lg mb-1">
                          {policy.label}
                        </h3>
                        <p className={`text-sm ${isSelected ? 'text-swiss-bg/80' : 'text-swiss-fg/60'}`}>
                          {policy.description}
                        </p>
                        {isSelected && (
                          <div className="absolute top-4 right-4 w-6 h-6 bg-swiss-bg flex items-center justify-center">
                            <Check className="w-4 h-4 text-swiss-accent" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <SwissButton
                  onClick={handleNext}
                  disabled={!selectedPolicy || isTransitioning}
                  variant="primary"
                  size="large"
                  className="w-full"
                >
                  {isTransitioning ? 'Continuing...' : 'Continue'}
                  <ArrowRight className="w-5 h-5" />
                </SwissButton>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <SwissSectionLabel number="02" label="Camera" className="justify-center" />
                
                <h2 className="text-3xl font-black text-swiss-fg uppercase tracking-tight text-center mb-2">
                  Point Your Camera
                </h2>
                <p className="text-swiss-fg/70 text-center mb-8">
                  Scan your room to detect items and see your insurance coverage.
                </p>

                {/* Bauhaus-style camera illustration */}
                <div className="border-2 border-swiss-fg mb-8">
                  <div className="grid grid-cols-2">
                    <div className="bg-swiss-muted swiss-diagonal p-12 flex items-center justify-center border-r-2 border-swiss-fg">
                      <div className="w-24 h-24 border-4 border-swiss-fg bg-swiss flex items-center justify-center relative">
                        <Camera className="w-12 h-12 text-swiss-fg" />
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-swiss-accent" />
                      </div>
                    </div>
                    <div className="p-8 swiss-dots">
                      <ul className="space-y-4">
                        {['Point camera at objects', 'AI detects items automatically', 'See coverage status instantly'].map((text, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="text-swiss-accent font-black text-lg">0{i + 1}.</span>
                            <span className="text-swiss-fg font-medium">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-widest text-swiss-fg/50 text-center mb-8">
                  All processing happens on your device. No images sent to servers.
                </p>

                <div className="flex gap-4">
                  <SwissButton onClick={handleBack} disabled={isTransitioning} variant="secondary" className="flex-1">
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </SwissButton>
                  <SwissButton onClick={handleNext} disabled={isTransitioning} variant="primary" size="large" className="flex-[2]">
                    <Camera className="w-5 h-5" />
                    {isTransitioning ? 'Starting...' : 'Start Camera'}
                  </SwissButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip Option */}
          <p className="text-center mt-8 text-sm text-swiss-fg/50">
            Already have an account?{' '}
            <button onClick={handleSkip} className="text-swiss-accent hover:underline font-bold uppercase">
              Skip to main view
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OnboardingFlow/OnboardingFlow.tsx
git commit -m "feat(onboarding): complete Swiss International Style redesign

- Hero with massive uppercase typography
- Numbered section labels (01. POLICY, 02. CAMERA)
- Seamless bordered grid for policy selection
- Bauhaus-style camera illustration with diagonal pattern
- Mechanical hover states with color inversion"
```

---

### Task 4.3: Redesign Dashboard

**Files:**
- Modify: `src/components/Dashboard/Dashboard.tsx`

- [ ] **Step 1: Redesign Dashboard with Swiss styling**

Replace the file with Swiss-styled version:

```typescript
import { motion, useSpring, useTransform } from "framer-motion";
import { AlertTriangle, CheckCircle, DollarSign, Shield, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { calculateValues, formatCurrency, formatPercentage, getUpgradeRecommendations } from "@/utils/valueCalculator";
import type { CoverageStatus, DashboardProps, ItemBreakdown } from "../../types";

interface AnimatedNumberProps {
  value: number;
  formatter: (value: number) => string;
}

function AnimatedNumber({ value, formatter }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 });
  useEffect(() => { spring.set(value); }, [value, spring]);
  const display = useTransform(spring, (current) => formatter(current));
  const [displayValue, setDisplayValue] = useState(formatter(value));
  useEffect(() => {
    const unsubscribe = display.on("change", (latest) => setDisplayValue(latest));
    return () => unsubscribe();
  }, [display]);
  return <span>{displayValue}</span>;
}

export function Dashboard({ detectedItems = [], manualItems = [], policyType = "renters", onItemClick }: DashboardProps) {
  const calculationResult = useMemo(() => {
    const safeDetectedItems = Array.isArray(detectedItems) ? detectedItems : [];
    const safeManualItems = Array.isArray(manualItems) ? manualItems : [];
    return calculateValues(safeDetectedItems, safeManualItems, policyType || "renters");
  }, [detectedItems, manualItems, policyType]);

  const recommendations = useMemo(() => 
    getUpgradeRecommendations(calculationResult.items, policyType),
    [calculationResult.items, policyType]
  );

  const { totalValue, protectedValue, unprotectedValue, coverageGapPercentage, items } = calculationResult;
  const allCovered = items.length > 0 && unprotectedValue === 0;
  const hasItems = items.length > 0;
  const hasRecommendations = recommendations.length > 0;

  const statusColors: Record<CoverageStatus, { bg: string; text: string; border: string }> = {
    covered: { bg: "bg-swiss-fg", text: "text-swiss-bg", border: "border-swiss-fg" },
    conditional: { bg: "bg-swiss", text: "text-swiss-fg", border: "border-swiss-fg" },
    not_covered: { bg: "bg-swiss-accent", text: "text-swiss-bg", border: "border-swiss-accent" },
  };

  const statusLabels: Record<CoverageStatus, string> = {
    covered: "Covered",
    conditional: "Conditional",
    not_covered: "Not Covered",
  };

  return (
    <div data-testid="dashboard-container" className="w-full h-full bg-swiss overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-swiss-fg pb-4">
          <h2 className="text-2xl font-black text-swiss-fg uppercase tracking-widest">
            Financial Summary
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-5 h-5" />
            <span className="uppercase tracking-widest font-bold">
              {policyType === "none" ? "No Insurance" : `${policyType}'s Insurance`}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-swiss-fg">
          {/* Total Value */}
          <div className="p-6 border-b-2 sm:border-b-0 sm:border-r-2 border-swiss-fg bg-swiss">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-swiss-fg/60" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Total Value
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={totalValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Protected Value */}
          <div className="p-6 border-b-2 lg:border-b-0 lg:border-r-2 border-swiss-fg bg-swiss">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-swiss-fg" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Protected
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={protectedValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Unprotected Value — MOST PROMINENT */}
          <div 
            data-testid="unprotected-section"
            className="p-6 bg-swiss-accent text-swiss-bg sm:col-span-2 lg:col-span-1 border-b-2 lg:border-b-0 lg:border-r-2 border-swiss-fg"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-swiss-bg/80" />
              <span className="text-xs font-black uppercase tracking-widest text-swiss-bg/80">
                Unprotected
              </span>
            </div>
            <p className="text-5xl font-black text-swiss-bg tracking-tight">
              <AnimatedNumber value={unprotectedValue} formatter={formatCurrency} />
            </p>
          </div>

          {/* Coverage Gap */}
          <div className="p-6 bg-swiss sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-swiss-fg/60" />
              <span className="text-xs font-bold uppercase tracking-widest text-swiss-fg/60">
                Coverage Gap
              </span>
            </div>
            <p className="text-3xl font-black text-swiss-fg">
              <AnimatedNumber value={coverageGapPercentage} formatter={(v) => formatPercentage(v)} />
            </p>
          </div>
        </div>

        {/* Empty State */}
        {!hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-fg p-12 text-center swiss-dots"
          >
            <div className="flex justify-center mb-4">
              <div className="border-2 border-swiss-fg p-4">
                <DollarSign className="w-8 h-8 text-swiss-fg" />
              </div>
            </div>
            <h3 className="text-xl font-black text-swiss-fg uppercase tracking-widest mb-2">
              No Items Detected
            </h3>
            <p className="text-swiss-fg/70 max-w-md mx-auto">
              Point your camera at objects to begin scanning. Detected items will appear here.
            </p>
          </motion.div>
        )}

        {/* All Covered Message */}
        {allCovered && hasItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-swiss-fg p-6 bg-swiss-fg text-swiss-bg"
          >
            <div className="flex items-center gap-4">
              <div className="border-2 border-swiss-bg p-2">
                <CheckCircle className="w-6 h-6 text-swiss-bg" />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-lg">
                  All items fully covered
                </h3>
                <p className="text-swiss-bg/80">
                  Your current insurance policy protects all detected items.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Item Breakdown Table */}
        {hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-fg"
          >
            <div className="px-6 py-4 border-b-2 border-swiss-fg bg-swiss-muted swiss-grid-pattern">
              <h3 className="font-black uppercase tracking-widest text-swiss-fg">Item Breakdown</h3>
            </div>
            <div>
              {items.map((item: ItemBreakdown, index: number) => {
                const colors = statusColors[item.status];
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid="item-row"
                    onClick={() => onItemClick?.(item)}
                    className="w-full px-6 py-4 flex items-center justify-between border-b border-swiss-fg/20 hover:bg-swiss-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 ${colors.bg} ${item.status === 'conditional' ? 'border-2 border-swiss-fg' : ''}`} />
                      <div>
                        <p className="font-bold text-swiss-fg capitalize">{item.category}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                          {statusLabels[item.status]}
                        </span>
                      </div>
                    </div>
                    <p className="font-black text-swiss-fg text-lg">{formatCurrency(item.estimatedValue)}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        {hasRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-swiss-accent"
          >
            <div className="px-6 py-4 border-b-2 border-swiss-accent bg-swiss-accent text-swiss-bg">
              <h3 className="font-black uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recommendations
              </h3>
            </div>
            <div className="p-6 swiss-diagonal">
              <ul className="space-y-4">
                {recommendations.map((recommendation: string, index: number) => (
                  <motion.li
                    key={recommendation}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-swiss-fg text-swiss-bg font-black text-sm shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-swiss-fg font-medium">{recommendation}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard/Dashboard.tsx
git commit -m "feat(dashboard): Swiss International Style redesign

- Seamless bordered stat cards with thick 2px borders
- Swiss Red accent for unprotected value (most prominent)
- Item breakdown table with grid pattern header
- Square status indicators (not circles)
- Numbered recommendations with diagonal pattern"
```

---

### Task 4.4: Redesign TabNavigation

**Files:**
- Modify: `src/components/TabNavigation/TabNavigation.tsx`

- [ ] **Step 1: Redesign with Swiss styling**

```typescript
import { motion } from "framer-motion";
import { Camera, LayoutDashboard, type LucideIcon } from "lucide-react";
import type { AppTab, TabNavigationProps } from "../../types";

interface TabConfig {
  id: AppTab;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
}

export function TabNavigation({ activeTab, onTabChange, className = "" }: TabNavigationProps) {
  const tabs: TabConfig[] = [
    { id: "camera", label: "Camera", icon: Camera, ariaLabel: "Switch to Camera view" },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, ariaLabel: "Switch to Dashboard view" },
  ];

  const handleTabClick = (tabId: AppTab): void => {
    if (tabId !== activeTab) onTabChange(tabId);
  };

  return (
    <nav
      aria-label="Main navigation"
      className={`
        fixed bottom-0 left-0 right-0
        md:relative md:bottom-auto md:left-auto md:right-auto
        bg-swiss border-t-4 border-swiss-fg
        md:border-t-0 md:border-b-4
        z-50 md:z-auto
        ${className}
      `}
      data-testid="tab-navigation"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-around md:justify-start md:gap-1 px-4 py-2 pb-[env(safe-area-inset-bottom,8px)] md:pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.98 }}
                role="tab"
                aria-selected={isActive}
                aria-label={tab.ariaLabel}
                onClick={() => handleTabClick(tab.id)}
                data-testid={`tab-${tab.id}`}
                data-active={isActive}
                className={`
                  flex items-center justify-center gap-2
                  flex-col md:flex-row
                  px-6 py-3 md:py-4
                  min-w-[80px] md:min-w-0
                  min-h-[44px] md:min-h-0
                  font-bold uppercase tracking-widest text-xs md:text-sm
                  transition-colors duration-200 ease-out
                  border-b-4
                  ${isActive
                    ? "border-swiss-accent text-swiss-fg"
                    : "border-transparent text-swiss-fg/50 hover:text-swiss-fg"
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-swiss-accent focus-visible:ring-offset-2
                `}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5" aria-hidden="true" />
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default TabNavigation;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TabNavigation/TabNavigation.tsx
git commit -m "feat(navigation): Swiss International Style tab navigation

- Thick 4px borders (top on mobile, bottom on desktop)
- Active state indicated by accent border (not background)
- Uppercase typography with tracking-widest
- Mechanical tap animation (scale 0.98)"
```

---

## Phase 5: Animation Migration

### Task 5.1: Audit and Update Animations

**Files:**
- All modified files already updated with linear/easeOut transitions

- [ ] **Step 1: Verify all Framer Motion uses linear/easeOut**

Search for any remaining spring animations:

```bash
grep -r "stiffness\|damping\|type.*spring" src/ --include="*.tsx" || echo "No spring animations found — good!"
```

Expected: No spring physics found (or only in AnimatedNumber which is appropriate).

- [ ] **Step 2: Run full test suite**

```bash
bun x vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Run type check**

```bash
bun run typecheck
```

Expected: No type errors.

- [ ] **Step 4: Run linter**

```bash
bun run lint
```

Expected: No linting errors.

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat(design): complete Swiss International Style migration

- Replace all spring animations with linear/easeOut
- All components use mechanical snappy transitions
- Reduced motion media query respected
- Build, tests, typecheck, lint all passing"
```

---

## Verification Checklist

Before marking complete, verify:

- [ ] **Visual:** No rounded corners anywhere in the app
- [ ] **Colors:** Swiss Red (#FF3000) used for accents only
- [ ] **Typography:** All headings uppercase with tracking
- [ ] **Patterns:** Grid, dots, diagonal, noise all render correctly
- [ ] **Borders:** Thick 2-4px black borders visible throughout
- [ ] **Animations:** Mechanical snappy feel (no springs)
- [ ] **Responsive:** Works on mobile, tablet, desktop
- [ ] **Accessibility:** Focus rings visible, reduced motion respected
- [ ] **Tests:** All tests passing
- [ ] **Build:** Production build succeeds
- [ ] **Typecheck:** No TypeScript errors

---

## Parallel Subagent Dispatch Plan

This plan can be executed with parallel subagents per phase:

**Phase 1 Subagent:** Design tokens (Task 1.1, 1.2)
**Phase 2 Subagent:** Layout primitives (Task 2.1)
**Phase 3 Subagent:** Components (Tasks 3.1, 3.2)
**Phase 4 Subagent:** Page redesigns (Tasks 4.1, 4.2, 4.3, 4.4)
**Phase 5 Subagent:** Animation verification (Task 5.1)

Each subagent should:
1. Read this plan document
2. Execute their assigned tasks in order
3. Run verification steps
4. Commit after each task
5. Report completion

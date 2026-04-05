# InsureScope 🔍🏠

**AR Insurance Coverage Visualizer** — Point your camera at a room and instantly see which belongings are covered by your insurance policy.

Built for **State Farm Innovation Hacks 2.0** hackathon.

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](#typescript-migration)
[![YOLO](https://img.shields.io/badge/YOLO26-ONNX_Runtime-FF6F00)](https://onnxruntime.ai/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18)](https://vitest.dev/)

---

## Table of Contents

- [What It Does](#what-it-does)
- [Demo](#demo)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Object Detection Model](#object-detection-model)
- [Coverage System](#coverage-system)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Project Structure](#project-structure)
- [TypeScript Migration](#typescript-migration)
- [Configuration](#configuration)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Privacy & Security](#privacy--security)
- [License](#license)

---

## What It Does

InsureScope uses your device camera and AI-powered object detection to identify belongings in any room, then overlays real-time, color-coded insurance coverage information directly on the live camera feed.

- 🟩 **Green overlay** — item is covered by your current policy
- 🟨 **Yellow overlay** — item is partially covered (e.g., below deductible or sub-limit)
- 🟥 **Red overlay** — item is **not covered** ("No Insurance" moment)

A dashboard summarizes the total value of unprotected items, helping you understand coverage gaps at a glance.

---

## Demo

### Live Camera Mode
Point your camera at objects in a room. The YOLO26 model detects items in real-time and the Canvas overlay renders coverage information immediately.

### Mock Mode
Test the UI without a camera: `http://localhost:5173?mock=true`

Mock mode loads simulated detections so you can test overlays, dashboard logic, and coverage calculations end-to-end.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         InsureScope App                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
│  │  CameraView │────▶│   useYOLO   │────▶│   Canvas    │     │
│  │  Component  │     │ Detection   │     │   Overlay   │     │
│  └─────────────┘     └──────┬──────┘     └──────┬──────┘     │
│                             │                      │           │
│                             ▼                      ▼           │
│                       ┌─────────────┐     ┌─────────────┐     │
│                       │  ONNX Web   │     │ coverage    │     │
│                       │  Runtime    │     │ Lookup      │     │
│                       └─────────────┘     └─────────────┘     │
│                                                  │             │
│                       ┌─────────────┐           │             │
│                       │ coverage    │◀──────────┘             │
│                       │ Rules.json  │                           │
│                       └─────────────┘                           │
│                                │                                │
│                                ▼                                │
│                       ┌─────────────┐                           │
│                       │   Dashboard │                           │
│                       │  Component  │                           │
│                       └─────────────┘                           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                      State Management                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AppContext (React Context)                                │  │
│  │  - Policy type (renters/homeowners/condo)                 │  │
│  │  - Detected items array                                     │  │
│  │  - Manual items array                                       │  │
│  │  - Active tab                                               │  │
│  │  - Confidence threshold                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Camera video stream → `useObjectDetection` hook
2. YOLO26 model (ONNX Runtime Web) → bounding boxes + class labels
3. `coverageLookup` maps COCO classes → coverage rules
4. `valueCalculator` estimates monetary value by category
5. Canvas overlay renders color-coded boxes in real-time
6. Dashboard aggregates totals and identifies coverage gaps

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 19 + Vite 5 | UI framework and build tool |
| **Language** | TypeScript 5.x | Type safety and DX |
| **Object Detection** | YOLO26 via ONNX Runtime Web | Real-time in-browser ML |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Theme** | Custom State Farm theme | Brand-aligned design tokens |
| **Overlays** | HTML5 Canvas API | Bounding box rendering |
| **Animations** | Framer Motion | Page transitions and micro-interactions |
| **Icons** | Lucide React | Consistent iconography |
| **AI Assistance** | Gemini API (optional) | Natural language policy explanations |
| **Testing** | Vitest + Testing Library + Playwright | Unit, integration, and E2E tests |
| **Linting** | ESLint + typescript-eslint | Code quality and consistency |
| **Package Manager** | Bun | Fast dependency management |

---

## Object Detection Model

### YOLO26 (You Only Look Once v26)

This application uses **YOLO26n** (nano variant) for real-time object detection, running entirely in the browser via **ONNX Runtime Web**.

### Why YOLO26?

| Metric | YOLO26 | MediaPipe EfficientDet | YOLO11 |
|--------|--------|------------------------|--------|
| **mAP (COCO)** | 40.9 | ~34 | ~37 |
| **CPU Inference** | Baseline | 30% slower | 43% slower |
| **NMS Required** | No | Yes | Yes |
| **Runtime Size** | ~2MB (ONNX) | ~5MB | ~2MB |

### Model Files

Located in `public/models/yolo26n/`:

```
public/models/yolo26n/
└── yolo26n.onnx          # ONNX model (~9.5MB)
```

### Supported Object Classes

All 80 COCO classes are supported, with common household items including:

**Furniture:** chair, couch, bed, dining table, desk, bookshelf, refrigerator
**Electronics:** tv, laptop, mouse, remote, keyboard, cell phone, microwave, oven
**Valuables:** book, clock, vase, teddy bear, handbag, suitcase
**Exclusions:** person (filtered — humans aren't insurable property)

### Regenerating the Model

```bash
# Requires Python 3.12 or earlier (TensorFlow export not supported on 3.13)
pip install ultralytics onnx onnxslim

# Export to ONNX
yolo export model=yolo26n.pt format=onnx

# Copy to public directory
mkdir -p public/models/yolo26n
cp yolo26n.onnx public/models/yolo26n/
```

---

## Coverage System

### Policy Types

Three base policy configurations are supported:

| Policy | Best For | Base Coverage |
|--------|----------|---------------|
| **Basic** | Renters | Personal property only |
| **Standard** | Homeowners | Dwelling + personal property |
| **Premium** | High-value homes | Extended replacement cost |

### Coverage Rules

Coverage determination is driven by `src/data/coverageRules.json`:

```typescript
interface CoverageRule {
  category: string;          // COCO class name or custom category
  policyTypes: {
    [key in PolicyType]: {
      status: 'covered' | 'partial' | 'excluded';
      limit?: number;        // Coverage limit in USD
      deductible?: number;   // Deductible amount
      notes?: string;        // Human-readable explanation
    }
  }
}
```

### Coverage Status Logic

```
IF item.category IN excludedCategories:
  → RED (excluded)
ELSE IF item.estimatedValue < policy.deductible:
  → YELLOW (below deductible)
ELSE IF item.estimatedValue > policy.limit:
  → YELLOW (exceeds limit)
ELSE:
  → GREEN (fully covered)
```

### Value Calculation

Item values are estimated using category-based valuation from `src/utils/valueCalculator.js`:

| Category | Base Value | Depreciation |
|----------|------------|--------------|
| Electronics | $500-2000 | 20% annually |
| Furniture | $200-1500 | 10% annually |
| Appliances | $300-1200 | 15% annually |
| Jewelry | $500-5000 | Minimal |
| Art/Antiques | $1000+ | Appreciates |

---

## Quick Start

### Prerequisites

- **Bun** (recommended) or Node.js 18+
- **Modern browser** with WebGL support (for ONNX Runtime)
- **Webcam access** for live detection mode

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/insurescope.git
cd insurescope

# Install dependencies (using Bun)
bun install

# Or with npm
npm install
```

### Development Server

```bash
# Start the dev server
bun run dev

# Or with npm
npm run dev

# Open in browser
# → http://localhost:5173
```

### Production Build

```bash
# Build for production
bun run build

# Preview the production build locally
bun run preview
```

---

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with HMR |
| `bun run build` | Production build (Vite) |
| `bun run preview` | Preview production build locally |
| `bun run lint` | Run ESLint with auto-fix |
| `bun run test` | Run Vitest in watch mode |
| `bun run test:run` | Run Vitest once (CI mode) |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run typecheck:app` | Type-check app code only |
| `bun run typecheck:test` | Type-check test code only |

### Code Quality Checks

All code must pass three validation gates before committing:

```bash
# 1. Linting
bun run lint

# 2. Type checking
bun run typecheck

# 3. Tests
bun run test:run
```

### Git Workflow

1. Create a feature branch from `main`
2. Make changes with passing tests
3. Run validation gates locally
4. Commit using conventional commit format
5. Push and open PR

---

## Testing Strategy

### Test Pyramid

| Level | Framework | Location | Purpose |
|-------|-----------|----------|---------|
| **Unit** | Vitest | `src/**/*.test.ts` | Pure functions, utilities |
| **Integration** | Vitest + Testing Library | `src/**/*.test.tsx` | Hooks, components in isolation |
| **E2E** | Playwright | `tests/e2e/` | Full user flows |

### Mock Mode for Testing

Use mock mode to test without camera access:

```typescript
// URL parameter triggers mock detection
const url = new URL(window.location.href);
const isMock = url.searchParams.get('mock') === 'true';

// Mock detections provide consistent test data
const mockDetections: Detection[] = [
  { label: 'laptop', confidence: 0.92, bbox: { x: 100, y: 200, width: 150, height: 100 } },
  { label: 'chair', confidence: 0.87, bbox: { x: 300, y: 400, width: 100, height: 200 } }
];
```

### Running Tests

```bash
# Watch mode (development)
bun run test

# CI mode (single run)
bun run test:run

# With coverage
bun run test:run -- --coverage

# Specific test file
bun run test -- src/utils/valueCalculator.test.ts
```

---

## Project Structure

```
insurescope/
├── public/
│   └── models/
│       └── yolo26n/
│           └── yolo26n.onnx          # ONNX model file
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component with tab routing
│   ├── index.css                     # Global styles + Tailwind
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript types
│   ├── components/
│   │   ├── CameraView/
│   │   │   ├── CameraView.tsx        # Live camera + detection logic
│   │   │   └── index.ts              # Barrel export
│   │   ├── CoverageOverlay/
│   │   │   └── CoverageOverlay.tsx     # Canvas overlay rendering
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx         # Coverage summary + stats
│   │   ├── DetailModal/
│   │   │   └── DetailModal.tsx       # Per-item coverage breakdown
│   │   ├── PolicySelector/
│   │   │   └── PolicySelector.tsx    # Policy type toggle
│   │   ├── TabNavigation/
│   │   │   └── TabNavigation.tsx     # Bottom navigation
│   │   ├── AddItemForm/
│   │   │   └── AddItemForm.tsx       # Manual item entry
│   │   ├── OnboardingFlow/
│   │   │   └── OnboardingFlow.tsx    # First-time walkthrough
│   │   └── ConfidenceThresholdSlider/
│   │       └── ConfidenceThresholdSlider.tsx
│   ├── context/
│   │   ├── AppContext.tsx            # Global state management
│   │   └── appState.ts               # Initial state + constants
│   ├── hooks/
│   │   ├── useObjectDetection.ts     # YOLO26 detection orchestration
│   │   ├── useYOLODetection.ts       # ONNX Runtime integration
│   │   ├── useMockDetection.ts       # Mock detection for testing
│   │   ├── mockDetections.ts         # Mock data fixtures
│   │   └── useGemini.ts              # Gemini AI integration
│   ├── data/
│   │   └── coverageRules.json        # Insurance coverage rules
│   ├── utils/
│   │   ├── coverageLookup.ts         # Coverage rule resolver
│   │   ├── valueCalculator.ts        # Item valuation logic
│   │   ├── yoloProcessor.ts          # YOLO output post-processing
│   │   └── testUtils.ts              # Test helpers
│   └── setupTests.ts                 # Vitest setup
├── index.html                        # HTML entry
├── vite.config.ts                    # Vite configuration
├── vitest.config.ts                  # Vitest configuration
├── tsconfig.base.json                # Base TypeScript config
├── tsconfig.app.json                 # App-specific TS config
├── tsconfig.test.json                # Test-specific TS config
├── eslint.config.js                  # ESLint flat config
└── package.json
```

---

## TypeScript Migration

This project was migrated from JavaScript to TypeScript using an incremental approach. The migration followed this dependency order:

1. **Foundation (Parallel)** — Leaf modules with no local dependencies
2. **Utils Layer** — Value calculation utilities
3. **Hook Chain (Sequential)** — Detection hooks in dependency order
4. **Context Layer** — App state management
5. **Components (Batched)** — UI components in dependency order
6. **Entry Points** — main.tsx and App.tsx

### Type Configuration

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "vitest/globals"]
  }
}
```

### Path Aliases

All imports use the `@/` alias pointing to `src/`:

```typescript
// ❌ Avoid relative paths
import { lookupCoverage } from '../../utils/coverageLookup';

// ✅ Use path alias
import { lookupCoverage } from '@/utils/coverageLookup';
```

---

## Configuration

### Environment Variables

Create a `.env` file for local development:

```bash
# Optional: Enable Gemini AI features
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Mock mode default
VITE_DEFAULT_MOCK_MODE=false
```

**Note:** Environment variables must be prefixed with `VITE_` to be exposed to client-side code.

### Vite Configuration

Key configuration in `vite.config.ts`:

- **Dev server:** Port 5173 with strict port checking
- **Build:** Target ES2022, sourcemaps enabled
- **Assets:** Inline assets under 4KB
- **Optimize deps:** Pre-bundle `onnxruntime-web`, `framer-motion`, `lucide-react`
- **Aliases:** `@` → `src/`

### Vitest Configuration

- **Environment:** `jsdom` for DOM testing
- **Globals:** Enabled for `describe`, `it`, `expect`
- **Setup:** `src/setupTests.ts` runs before tests
- **Coverage:** Istanbul provider, 100% statement coverage target

---

## API Integration

### Gemini AI (Optional)

If configured with `VITE_GEMINI_API_KEY`, the app can use Google's Gemini API for:

- Natural language policy explanations
- Coverage gap analysis summaries
- Personalized insurance recommendations

**Privacy note:** Gemini API calls send only aggregated metadata (coverage statistics, not individual items or images).

### ONNX Runtime Web

The YOLO26 model runs entirely in-browser via ONNX Runtime Web:

- No model upload required
- No server-side inference
- WebGL backend for GPU acceleration (fallback to CPU)
- ~9.5MB model download on first load (cached)

---

## Deployment

### Cloudflare Workers (Recommended)

This project is configured for deployment to Cloudflare Workers:

```bash
# Build the project
bun run build

# Deploy with Wrangler
wrangler deploy
```

**Requirements:**
- Wrangler CLI configured
- `wrangler.toml` with proper bindings
- Static assets in `dist/` directory

### Static Hosting

The production build outputs static files to `dist/`:

```bash
bun run build

# Serve dist/ with any static file server
npx serve dist
```

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Lighthouse Performance** | 90+ mobile, 95+ desktop | Via web-perf skill |
| **LCP** | < 2.5s | Model download is largest factor |
| **INP** | < 200ms | Canvas rendering must be smooth |
| **CLS** | < 0.1 | Layout shifts from detection overlays |

---

## Contributing

### Development Guidelines

1. **Test-Driven Development:** Write failing tests first, then implementation
2. **Strict TypeScript:** No `any` types without explicit justification
3. **Component Structure:** One component per directory with barrel export
4. **Hook Dependencies:** Document all hook dependencies in JSDoc
5. **Performance:** Use `React.memo` for expensive renders, `useMemo` for calculations

### Code Review Checklist

- [ ] TypeScript strict mode passes (`bun run typecheck`)
- [ ] All tests pass (`bun run test:run`)
- [ ] No ESLint errors (`bun run lint`)
- [ ] Component has corresponding tests
- [ ] No hardcoded values in components (use constants)
- [ ] Accessibility: Keyboard navigation, ARIA labels
- [ ] Mobile responsive design verified

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add confidence threshold slider
fix: resolve canvas flickering on rapid detections
docs: update README with deployment instructions
refactor: extract coverage logic to utility function
test: add unit tests for valueCalculator
chore: update dependencies
```

---

## Privacy & Security

### Client-Side Only

**Everything runs in your browser.** No images, detection data, or personal information ever leaves your device:

- Object detection: Local ONNX Runtime (no cloud)
- Coverage analysis: Local rule engine (no server)
- No cookies, no tracking scripts
- No telemetry or analytics (unless self-hosted Umami is configured)

### Data Flow

```
Camera → Browser → ONNX Runtime Web → Canvas Overlay
            ↓
       coverageRules.json (local)
            ↓
       Dashboard Display
```

### Gemini API Privacy

When Gemini API is enabled:
- Only aggregated statistics are sent (e.g., "3 items uncovered, total value $5,000")
- No images or individual item details are transmitted
- API calls are optional and disabled by default

---

## License

Hackathon project — all rights reserved.

Built with ❤️ for State Farm Innovation Hacks 2.0.

---

## Acknowledgments

- **State Farm** for the hackathon opportunity and brand guidelines
- **ONNX Runtime Web** team for in-browser ML capabilities
- **Ultralytics** for YOLO26 model architecture
- **React & Vite** communities for excellent developer experience

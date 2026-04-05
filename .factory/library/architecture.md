# Architecture

How InsureScope works — components, relationships, data flows, invariants.

**What belongs here:** System-level architectural knowledge that workers need to understand the codebase.

---

## System Overview

InsureScope is a single-page React application that uses the device camera to detect household objects and visualize their insurance coverage status through color-coded overlays. Everything runs client-side — no server, no data leaves the device.

## Core Data Flow

```
Camera Feed (getUserMedia)
    │
    ▼
MediaPipe detectForVideo() ──► Detection Results [{bbox, class, score}]
    │                                    │
    │                                    ▼
    │                           Coverage Rules Lookup
    │                        (category + policyType → status)
    │                                    │
    ▼                                    ▼
Canvas Overlay Rendering          Dashboard State Update
(colored bounding boxes)        (totals, breakdown, recommendations)
```

## Key Components

### useObjectDetection Hook
- Manages MediaPipe ObjectDetector lifecycle
- Loads model on mount, cleans up on unmount
- Returns: `{ detect(video, timestamp), isLoaded, error }`
- Uses `useRef` for detector instance to avoid re-renders
- Detection runs in requestAnimationFrame loop

### Coverage Rules Engine
- Pure function: `(category: string, policyType: string) → CoverageResult`
- CoverageResult: `{ status: "covered"|"conditional"|"not_covered", color: "green"|"yellow"|"red", estimatedValue: number, note: string, conditions?: string[], upgrade?: string }`
- Rules defined in `coverageRules.json` with entries for 4 policy types × 20+ COCO categories
- Used by both overlay renderer and dashboard

### Canvas Overlay Renderer
- Positioned absolutely over the `<video>` element
- Same dimensions as video feed, resizes responsively
- Draws bounding boxes with: colored border, status icon, item name, estimated value
- Applies detection smoothing: exponential moving average on coordinates, minimum persistence threshold

### Dashboard
- Receives detection results + coverage status
- Computes: totalValue, protectedValue, unprotectedValue, coverageGap%
- Generates policy upgrade recommendations based on uncovered items
- All calculations are reactive — update when detections or policy changes

## State Architecture

```
App State (React Context / useState)
├── policyType: "renters" | "homeowners" | "auto" | "none"
├── onboardingComplete: boolean
├── activeTab: "camera" | "dashboard"
├── detectedItems: Map<string, DetectedItem>  (keyed by id, updated each frame)
├── manualItems: ManualItem[]
└── selectedItemId: string | null  (for detail modal)

localStorage
├── policyType
├── onboardingComplete
└── manualItems
```

## Invariants

1. **Dashboard arithmetic:** `totalValue == protectedValue + unprotectedValue` at all times
2. **Coverage consistency:** An item's overlay color must always match its dashboard status
3. **No orphaned media streams:** Camera tracks must be stopped when leaving camera view
4. **Policy applies uniformly:** Policy switch must update both overlay AND dashboard simultaneously

## Policy Coverage Logic

Four policy types with different coverage maps:
- **Renter's:** Covers personal property (electronics, furniture, clothing). Excludes vehicles, landlord property.
- **Homeowner's:** Broader coverage including structure. More items covered, higher limits.
- **Auto:** Covers vehicles and vehicle contents only. Most household items NOT covered.
- **None:** Everything shows as "Not Covered" — the demo moment.

## COCO Categories Used

Insurance-relevant subset of 80 COCO categories:
- Electronics: laptop, cell phone, tv, mouse, keyboard, remote, microwave, oven, refrigerator, toaster
- Furniture: couch, bed, dining table, chair
- Vehicles: car, motorcycle, bicycle
- Other: backpack, umbrella, book, clock, potted plant, bottle, sports ball
- Pets: dog, cat

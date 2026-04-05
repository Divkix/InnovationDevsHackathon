# User Testing

Testing surface, required testing skills/tools, and resource cost classification.

**What belongs here:** Validation surface details, tooling, concurrency limits, testing infrastructure.

---

## Validation Surface

**Surface:** Browser application at http://localhost:5173
**Tool:** agent-browser
**Setup:** Start Vite dev server (`npx vite --port 5173`), wait for healthcheck to pass

### Testing Approach

Since the app relies on a camera feed for object detection, automated validation needs a strategy:

1. **Coverage rules engine (unit tests):** Pure functions — test exhaustively with Vitest. No browser needed.
2. **UI rendering (agent-browser):** Mock the `useObjectDetection` hook to return predefined detection results. Verify overlays, dashboard, modals, forms render correctly.
3. **State management (agent-browser):** Test policy switching, tab navigation, manual item CRUD with mocked detections.
4. **Onboarding flow (agent-browser):** Testable end-to-end — no camera needed for policy selection and instruction screens.
5. **Camera-specific tests:** Cannot be fully automated. These assertions (VAL-CAM-001 through VAL-CAM-012) require manual verification with a real camera.

### Camera Mocking

Workers should create a test utility that mocks `useObjectDetection` to return configurable detection results:
```js
// Example mock
const mockDetections = [
  { boundingBox: { originX: 100, originY: 50, width: 200, height: 150 },
    categories: [{ categoryName: "laptop", score: 0.85 }] },
  // ...
];
```

## Validation Concurrency

**Machine specs:** 48GB RAM, 14 CPU cores, macOS

**agent-browser:** Each instance consumes ~300MB RAM. Dev server adds ~200MB.
- Available headroom: ~40GB (after baseline ~8GB usage)
- Usable headroom (70%): ~28GB
- 5 concurrent instances: ~1.5GB + 200MB dev server = ~1.7GB total
- **Max concurrent validators: 5**

**Resource cost classification:** LIGHT — lightweight React SPA with no heavy server-side processing.

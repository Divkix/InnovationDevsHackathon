# User Testing

Testing surface, required testing skills/tools, and resource cost classification.

**What belongs here:** Validation surface details, tooling, concurrency limits, testing infrastructure.

---

## Validation Concurrency

**Browser Surface (http://localhost:5173):**
- Max concurrent validators: 5
- Each validator uses an independent browser session
- Shared infrastructure: Vite dev server (minimal memory overhead)
- Resource cost assessment: Browser sessions use ~50-100MB each, no GPU required for headless mode

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

### Known Testing Limitations

**MediaPipe AI Model Loading:**
The MediaPipe object detection model (efficientdet_lite0) fails to initialize reliably in headless browser environments:
- Model downloads WASM files from cdn.jsdelivr.net
- Model file fetched from storage.googleapis.com
- Loading timeout: >30 seconds in headless environment vs expected 3-5s
- Error: net::ERR_FAILED when loading from CDN

**Impact on Testing:**
- Assertions requiring bounding boxes (VAL-OVERLAY-010, VAL-OVERLAY-014) cannot be tested
- Assertions requiring camera view (VAL-DM-006, VAL-CROSS-007) are blocked
- DetailModal can be tested via dashboard-triggered modals (manual items) instead of camera-overlay-triggered modals

**Workarounds:**
- Test DetailModal functionality via dashboard (add manual items, click to open modal)
- Detail modal content and close behavior is identical regardless of entry point
- Policy change updates (VAL-DM-007) can be tested through dashboard items

**Recommendation:**
Add a mock detection mode via localStorage flag or query parameter (`?mock=true`) that bypasses MediaPipe initialization and renders predefined bounding boxes for automated testing.

## Flow Validator Guidance: Browser

### Isolation Rules
- **Data:** Tests run against the same dev server instance. Each validator session should clear localStorage at the start to ensure clean state.
- **State:** No user accounts or namespaces required. localStorage is the only persistence layer.
- **Concurrency:** Validators can run concurrently — each operates on independent browser sessions. No shared state conflicts.

### Testing Boundaries
- **URL:** http://localhost:5173
- **Tool:** agent-browser (invoke via Skill tool)
- **Setup:** Ensure dev server is running on port 5173 before testing

### Test Data Preparation
- Clear localStorage before each test to simulate fresh user
- Set localStorage values to simulate returning user scenarios when needed
- Mock detection data via localStorage or URL parameters if the app supports it

### Common Patterns
1. **Fresh user test:** Clear localStorage, load page, verify onboarding shows
2. **Returning user test:** Set localStorage values, refresh page, verify state restored
3. **Policy switch test:** Navigate to camera view, change policy, verify UI updates
4. **Tab switch test:** Click Camera tab, verify camera view; click Dashboard tab, verify dashboard

### Screenshots & Evidence
- Save screenshots to: `{missionDir}/evidence/{milestone}/{group-id}/`
- Name format: `{assertion-id}-{description}.png`

### Session Management
- Use unique session IDs for each flow validator (e.g., `--session "camera-flow-1"`)
- Close browser sessions after testing completes

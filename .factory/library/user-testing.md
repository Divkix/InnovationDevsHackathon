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
- Save screenshots to: `{missionDir}/evidence/camera/{group-id}/`
- Name format: `{assertion-id}-{description}.png`

### Session Management
- Use unique session IDs for each flow validator (e.g., `--session "camera-flow-1"`)
- Close browser sessions after testing completes

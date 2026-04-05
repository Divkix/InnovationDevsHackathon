---
name: frontend-worker
description: React + Vite frontend worker for building InsureScope components, hooks, and utilities.
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

All features in this mission — building React components, hooks, utilities, data files, and tests for the InsureScope application.

## Required Skills

- **agent-browser** — For manual UI verification after implementation. Use to verify pages load, components render, and user interactions work.
- **code-edit** — For precise file edits when modifying existing files.

## Work Procedure

### 1. Read Context
Read these files in order:
1. `AGENTS.md` in the mission directory for boundaries, conventions, and architecture
2. `.factory/library/architecture.md` for system design
3. `.factory/library/environment.md` for env vars and dependencies
4. `.factory/services.yaml` for available commands
5. The feature description for what to build

### 2. Write Tests First (TDD — RED)
- Before ANY implementation code, write failing tests
- Test files co-located with source: `Component.test.jsx` next to `Component.jsx`
- Use Vitest + @testing-library/react
- For components that depend on camera/detection, mock the `useObjectDetection` hook
- Run tests to confirm they FAIL: `npm test`

### 3. Implement (GREEN)
- Write the minimum code to make tests pass
- Follow the architecture in `.factory/library/architecture.md`
- Use Tailwind CSS for all styling — no custom CSS files
- Use path alias `@/` for `src/` imports
- Follow React conventions: hooks for logic, components for UI
- Run tests to confirm they PASS: `npm test`

### 4. Manual Verification
- Start the dev server: `npx vite --port 5173`
- Open http://localhost:5173 in agent-browser
- Verify the feature works visually:
  - Page loads without errors
  - Components render correctly
  - Interactions work (click, type, navigate)
  - Check browser console for errors/warnings
- Each verified flow = one `interactiveChecks` entry

### 5. Run Quality Checks
- `npm test` — all tests must pass
- Check for any console errors in agent-browser
- Verify no TypeScript/ESLint errors (if configured)

### 6. Commit and Handoff
- Stage and commit changes with a descriptive message
- Complete the handoff with all required fields

## Example Handoff

```json
{
  "salientSummary": "Built CoverageOverlay component with green/red/yellow bounding box rendering. TDD: wrote 8 tests covering color coding, positioning, multi-object rendering, and empty state — all passing. Verified in browser with mocked detections.",
  "whatWasImplemented": "CoverageOverlay.jsx: canvas-based overlay renderer that draws color-coded bounding boxes (green=covered, red=not covered, yellow=conditional) with item labels and values. Supports multiple simultaneous detections and overlays positioned at exact detection coordinates.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm test -- --grep 'CoverageOverlay'", "exitCode": 0, "observation": "8 tests passing" },
      { "command": "npx vite --port 5173", "exitCode": 0, "observation": "Dev server started successfully" }
    ],
    "interactiveChecks": [
      { "action": "Navigated to http://localhost:5173 with mocked detections (laptop, car, bicycle)", "observed": "Three bounding boxes rendered: laptop green ($1,200 Covered), car red ($15,000 Not Covered), bicycle yellow ($500 Conditional)" },
      { "action": "Switched policy to 'No Insurance'", "observed": "All three boxes turned red with 'Not Covered' labels" }
    ]
  },
  "tests": {
    "added": [
      {
        "file": "src/components/CoverageOverlay/CoverageOverlay.test.jsx",
        "cases": [
          { "name": "renders green box for covered item", "verifies": "VAL-OVERLAY-001" },
          { "name": "renders red box for uncovered item", "verifies": "VAL-OVERLAY-002" },
          { "name": "renders yellow box for conditional item", "verifies": "VAL-OVERLAY-003" },
          { "name": "renders no boxes when no detections", "verifies": "VAL-OVERLAY-004" },
          { "name": "positions box at detection coordinates", "verifies": "VAL-OVERLAY-005" },
          { "name": "renders separate boxes for multiple detections", "verifies": "VAL-OVERLAY-006" },
          { "name": "handles overlapping boxes", "verifies": "VAL-OVERLAY-009" },
          { "name": "updates colors on policy change", "verifies": "VAL-OVERLAY-011" }
        ]
      }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a component or hook that doesn't exist yet and isn't part of the current feature
- Requirements are ambiguous or contradictory
- Existing bugs or environment issues block progress
- Need to violate mission boundaries (ports, off-limits resources)

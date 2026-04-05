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

## Work Procedure — HACKATHON SPEED MODE

### 1. Read Context (QUICK)
Skim the feature description. Check existing components in `src/components/` to understand patterns already used.

### 2. IMPLEMENT FIRST (Build Fast)
- Write the component/feature code directly — NO tests first
- Follow existing patterns from already-built components
- Use Tailwind CSS for all styling
- Use path alias `@/` for `src/` imports
- Keep it simple — ship working code over perfect code

### 3. Quick Browser Check
- Start dev server if not running: `npx vite --port 5173 --host`
- Open http://localhost:5173 in agent-browser
- Take ONE screenshot to verify the feature renders
- Check browser console for errors
- If it works, commit and move on

### 4. Commit and Handoff
- Stage and commit changes
- Complete handoff — keep it brief

## Example Handoff

```json
{
  "salientSummary": "Built AddItemForm with category selection, value input, and dashboard integration. Verified in browser.",
  "whatWasImplemented": "AddItemForm.jsx: form with 10+ insurance categories, name/value fields, validation. Integrates with AppContext for manual item CRUD.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npx vite --port 5173", "exitCode": 0, "observation": "Dev server started" }
    ],
    "interactiveChecks": [
      { "action": "Opened app, added jewelry item via form", "observed": "Item appeared in dashboard with correct coverage status" }
    ]
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a component or hook that doesn't exist yet and isn't part of the current feature
- Requirements are ambiguous or contradictory
- Existing bugs or environment issues block progress
- Need to violate mission boundaries (ports, off-limits resources)

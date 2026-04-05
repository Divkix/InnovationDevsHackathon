# InsureScope 🔍🏠

**AR Insurance Coverage Visualizer** — Point your camera at a room and instantly see which belongings are covered by your insurance policy.

Built for **State Farm Innovation Hacks 2.0** hackathon.

---

## What It Does

InsureScope uses your device camera and AI-powered object detection to identify belongings in any room, then overlays real-time, color-coded insurance coverage information directly on the live camera feed.

- 🟩 **Green overlay** — item is covered by your current policy
- 🟨 **Yellow overlay** — item is partially covered (e.g., below deductible or sub-limit)
- 🟥 **Red overlay** — item is **not covered** ("No Insurance" moment)

A dashboard summarizes the total value of unprotected items, helping you understand coverage gaps at a glance.

---

## Object Detection Model

This application uses **YOLO26** (You Only Look Once v26) for real-time object detection, 
running entirely in the browser via **ONNX Runtime Web**.

### Why YOLO26?

- **Better Accuracy**: 40.9 mAP on COCO vs ~34 mAP for MediaPipe EfficientDet
- **Faster CPU Inference**: Up to 43% faster than YOLO11 on CPU-only devices
- **No NMS Required**: End-to-end design eliminates post-processing bottlenecks
- **Lightweight**: ONNX Runtime Web (~2MB) vs TensorFlow.js (~18MB)

### Model Files

The YOLO26n (nano) model file is stored in `public/models/yolo26n/`:
- `yolo26n.onnx` - ONNX model (~9.5MB)

### Regenerating Model Files

If you need to regenerate the model (e.g., for custom training):

```bash
pip install ultralytics onnx onnxslim
yolo export model=yolo26n.pt format=onnx
mkdir -p public/models/yolo26n
cp yolo26n.onnx public/models/yolo26n/
```

Note: Requires Python 3.12 or earlier. TensorFlow export is not supported on Python 3.13.

The app automatically filters out the "person" class from coverage analysis 
(humans aren't insurable property). All other COCO classes (80 total) are supported.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + Vite |
| Object Detection | YOLO26 via ONNX Runtime Web (`onnxruntime-web`) |
| Styling | Tailwind CSS v4 + custom State Farm theme |
| Overlays | HTML5 Canvas API |
| Animations | Framer Motion |
| Icons | Lucide React |
| AI Assistance | Gemini API (optional) |
| Testing | Vitest + Testing Library + Playwright |

---

## Key Features

- **Real-time object detection** — YOLO26 identifies furniture, electronics, appliances, and more via the live camera feed using ONNX Runtime Web
- **Color-coded coverage overlays** — green/yellow/red overlays drawn on detected objects via Canvas
- **Dashboard with unprotected value counter** — see the total dollar value of items not covered by your policy
- **"No Insurance" red moment** — dramatic red highlighting for uninsured items to create urgency
- **Policy switching** — toggle between renters, homeowners, and condo policies to compare coverage
- **Manual item addition** — add items that the camera didn't detect, with name, category, and estimated value
- **Multi-step onboarding** — guided walkthrough for first-time users
- **Detail modal** — tap any detected or manual item to see full coverage breakdown

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open in browser
# → http://localhost:5173
```

### Other Commands

```bash
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm test           # Run Vitest test suite
```

---

## Mock Mode

For testing without a camera or real object detection, append `?mock=true` to the URL:

```
http://localhost:5173?mock=true
```

Mock mode loads simulated detections so you can test the UI, overlays, dashboard, and coverage logic end-to-end.

---

## Project Structure

```
src/
├── App.jsx                          # Main app component with tab routing
├── main.jsx                         # React entry point
├── index.css                        # Global styles + Tailwind
├── components/
│   ├── CameraView/                  # Live camera feed + Canvas overlay rendering
│   ├── CoverageOverlay/             # Draws color-coded bounding boxes on Canvas
│   ├── Dashboard/                   # Summary of detected items & coverage stats
│   ├── DetailModal/                 # Per-item coverage breakdown modal
│   ├── PolicySelector/              # Switch between policy types
│   ├── TabNavigation/               # Bottom tab bar (Camera / Dashboard / Manual)
│   ├── AddItemForm/                 # Manual item entry form + list
│   ├── OnboardingFlow/              # Multi-step first-run experience
│   └── ConfidenceThresholdSlider/   # Adjust detection confidence threshold
├── context/
│   ├── AppContext.jsx               # Global React context (policy, items, tabs)
│   └── appState.js                  # Initial state factory
├── hooks/
│   ├── useObjectDetection.js        # YOLO26 object detection hook
│   ├── useMockDetection.js          # Mock detection hook for testing
│   ├── mockDetections.js            # Predefined mock detection results
│   └── useGemini.js                 # Gemini AI integration hook
├── data/
│   └── coverageRules.json           # Policy coverage rules & limits
├── utils/
│   ├── coverageLookup.js            # Maps detected objects to coverage status
│   ├── valueCalculator.js           # Estimates item values by category
│   └── testUtils.js                 # Shared test helpers
├── styles/
│   └── stateFarmTheme.css           # State Farm brand theme overrides
└── __tests__/
    └── ...                          # Component and integration tests
```

---

## State Farm Branding

InsureScope uses State Farm's signature red (`#E31837`) as the primary brand color throughout the interface — accents, headers, CTAs, and the uninsured-item highlight.

---

## Privacy

**Everything runs client-side.** No images, detection data, or personal information ever leave your device. Object detection runs directly in the browser via TensorFlow.js — no server-side processing, no cloud uploads, no data collection.

---

## License

Hackathon project — all rights reserved.

# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | No | Gemini API key for AI coverage explanations. When empty, the Gemini feature is hidden with graceful fallback. |

## External Dependencies

### MediaPipe Object Detection
- **WASM files:** Loaded from CDN `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm`
- **Model file:** EfficientDet-Lite0 int8 from `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite` (~4.4MB)
- **Cold load time:** ~3-5 seconds (includes model download + WASM initialization)
- **No API key required** — runs entirely client-side

### Browser Requirements
- Modern browser with WebAssembly support (Chrome 83+, Safari 15+, Firefox 89+)
- getUserMedia support (requires HTTPS or localhost)
- WebGL support (for GPU-accelerated inference, falls back to WASM/CPU)

## Platform Notes

- macOS development: camera access works on localhost without HTTPS
- Mobile testing: use Chrome DevTools remote debugging or test directly on device
- The app is client-side only — no backend server, no database

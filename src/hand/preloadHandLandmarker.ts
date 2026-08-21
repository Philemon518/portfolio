import { FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let wasmPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
let modelFilePromise: Promise<ArrayBuffer> | null = null;

function warmUrl(url: string) {
  void fetch(url, { cache: 'force-cache' }).catch(() => {
    // Best-effort network warm-up.
  });
}

/** Resolve MediaPipe WASM from CDN (cached after first call). */
export function getVisionWasm() {
  if (!wasmPromise) {
    wasmPromise = FilesetResolver.forVisionTasks(WASM_BASE);
  }
  return wasmPromise;
}

/** Warm WASM + model weights before the user opens Fun Way / camera. */
export function preloadHandLandmarkerAssets() {
  void getVisionWasm();

  if (!modelFilePromise) {
    modelFilePromise = fetch(MODEL_URL, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Hand model fetch failed (${response.status})`);
        }
        return response.arrayBuffer();
      })
      .catch(() => new ArrayBuffer(0));
  }

  // MediaPipe pulls multiple .wasm files from this folder on first run.
  warmUrl(`${WASM_BASE}/vision_wasm_internal.js`);
  warmUrl(`${WASM_BASE}/vision_wasm_internal.wasm`);
}

export function getHandModelWarmPromise() {
  preloadHandLandmarkerAssets();
  return modelFilePromise;
}

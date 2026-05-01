# Garage Portfolio (hand UI)

A React + Three.js portfolio concept built as a stylized 3D garage, with optional MediaPipe hand control from the HUD (top right). Intended for **desktop** browsers.

## Deploy to Vercel

1. Import the Git repo in Vercel.
2. Set **Root Directory** to `portfolio3` (when the monorepo root is the parent folder).
3. Framework: **Vite** (or leave auto-detect). **Build Command:** `npm run build`. **Output Directory:** `dist`. **Install Command:** `npm install`.
4. No environment variables are required for this app; do not add client-exposed `VITE_*` secrets unless you intend them to be public in the bundle.

[`vercel.json`](vercel.json) pins the build, enables an SPA fallback rewrite, and sets baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` with `camera=(self)` for Fun Way). Static files under `dist/assets/` are still served before the rewrite.

Production uses **HTTPS** on Vercel, which is required for the webcam (`getUserMedia`) and clipboard APIs used by hand mode and the Roya Link demo.

## Security notes

This project is a **static SPA** (no server routes in-repo). User-facing YouTube URLs are validated before use (`extractYoutubeVideoId`). Hand tracking loads third-party WASM and a model from jsDelivr and Google Cloud Storage; the Roya Link demo loads the YouTube IFrame API from `youtube.com`—review those trust boundaries for your threat model.

Before releases, run `npm audit` (and `npm audit fix` where appropriate). Enable **Dependabot** (or similar) on the repository for ongoing dependency updates.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

Open the URL Vite prints (often `http://localhost:5173`). Webcam and MediaPipe load from the network; use **HTTPS** if you test from a non-localhost hostname, or the browser may block the camera.

Production builds omit JS source maps (`vite.config.ts`) to reduce accidental source exposure in the browser; re-enable locally if you need to debug minified production bundles.

## Key files

- `src/data/portfolioItems.ts`: object names, descriptions, and camera presets
- `src/scene/GarageScene.tsx`: garage layout, lighting, interactive objects, and hover/click behavior
- `src/scene/garageTextures.ts`: generated poster, plate, laptop, pegboard, and wall textures
- `src/styles.css`: overlay UI and responsive layout
- `src/hand/`, `src/ui/HudCamera.tsx`, `src/stores/handUiStore.ts`: optional hand tracking and synthetic pointer

## Interaction

- Hover an object to outline it; click to focus and open the detail panel
- Click empty space or press `Esc` to return (clears hover when a detail is open)
- Turn **Hand control** on in the HUD: cursor follows the middle knuckle; **pinch** to click; **fist** clears detail like Back; **peace** scrolls the detail panel when it overflows

## Python `.venv`

Optional for future scripts or tooling:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

The web app itself is **Node-only** (`npm`).

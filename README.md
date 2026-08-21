# Garage Portfolio (hand UI)

A React + Three.js portfolio concept built as a stylized 3D garage, with optional MediaPipe hand control from the HUD (top right). Intended for **desktop** browsers.

**Git LFS:** `public/models/*.glb` are tracked with [Git LFS](https://git-lfs.com/) (GitHub’s 100 MB blob limit). Install Git LFS (`brew install git-lfs` / package manager, then `git lfs install`) before cloning so models are real files, not pointer stubs. Railway and other hosts must enable LFS when cloning the repo.

## Deploy to Railway

1. Create a Railway project linked to [`Philemon518/portfolio`](https://github.com/Philemon518/portfolio) (repo root = this folder).
2. Railway auto-detects [`railway.toml`](railway.toml) and builds with the [`Dockerfile`](Dockerfile). The Dockerfile **clones the repo with Git LFS** during the build (Railway’s Docker context only includes LFS pointer files, not the real GLB blobs).
3. Deploy and confirm the build log shows `Verified GLB model assets are hydrated.`
4. Smoke test on the `*.railway.app` URL:
   - Welcome screen loads
   - `/models/honda_cr-v.glb` returns a ~104 MB binary (not HTML)
   - All 5 GLB models appear in the 3D scene

[`nginx.conf.template`](nginx.conf.template) serves static GLB files before the SPA fallback, sets security headers, and listens on Railway’s `$PORT`.

No environment variables are required for this app.

### Custom domain (philemonmulunda.com)

1. In Railway → Settings → Domains, add `philemonmulunda.com` and `www.philemonmulunda.com`.
2. Copy the CNAME target Railway provides.
3. At your DNS registrar, point `@` / `www` to Railway (follow Railway’s apex instructions if needed).
4. Lower TTL on old Vercel DNS records before cutover for faster propagation.
5. After HTTPS is active on Railway, remove or detach the domain from Vercel.

Production uses **HTTPS**, which is required for the webcam (`getUserMedia`) and clipboard APIs used by hand mode and the Roya Link demo.

## AI-readable content

Portfolio text is duplicated for AI agents in three places (invisible in the UI):

- [`src/data/aiSiteManifest.ts`](src/data/aiSiteManifest.ts) — canonical structured manifest in source
- Browser console — logged as `[portfolio-ai-manifest]` on page load
- Built HTML — `<script type="application/json" id="portfolio-ai-manifest">` injected at build time
- [`public/llms.txt`](public/llms.txt) — short index for external crawlers

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
- `src/data/aiSiteManifest.ts`: machine-readable copy of all portfolio content
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

## Local Docker preview

```bash
npm run build
docker build -t garage-portfolio .
docker run -p 8080:8080 -e PORT=8080 garage-portfolio
```

Open `http://localhost:8080`.

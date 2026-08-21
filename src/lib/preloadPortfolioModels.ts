/** Shared GLB URLs — keep cache-bust in sync with GarageScene useGLTF paths. */
export const PORTFOLIO_MODEL_URLS = {
  arcReactor: '/models/arc_reactor.glb?v=real-20260501',
  coffee: '/models/coffee_machine.glb?v=real-20260501',
  macbook: '/models/macbook_air_m4.glb?v=real-20260501',
  generator: '/models/generator.glb?v=real-20260501',
  crv: '/models/honda_cr-v.glb?v=real-20260501',
} as const;

const PRIORITY_MODELS = [
  PORTFOLIO_MODEL_URLS.arcReactor,
  PORTFOLIO_MODEL_URLS.coffee,
  PORTFOLIO_MODEL_URLS.macbook,
  PORTFOLIO_MODEL_URLS.generator,
] as const;

let crvPreloadScheduled = false;
let crvPreloadFn: (() => void) | null = null;

function warmModelUrl(url: string) {
  if (typeof fetch === 'undefined') {
    return;
  }
  void fetch(url, { cache: 'force-cache' }).catch(() => {
    // Best-effort warm cache for useGLTF; ignore offline / blocked requests.
  });
}

/** Start fetching visible garage models immediately; defer the 104 MB CR-V. */
export function preloadPortfolioModels() {
  for (const url of PRIORITY_MODELS) {
    warmModelUrl(url);
  }
  scheduleCrVModelPreload(warmModelUrl);
}

/** Register drei's useGLTF.preload for the CR-V after smaller models have a head start. */
export function scheduleCrVModelPreload(preloadFn: (url: string) => void) {
  if (crvPreloadScheduled) {
    return;
  }
  crvPreloadScheduled = true;
  crvPreloadFn = () => preloadFn(PORTFOLIO_MODEL_URLS.crv);

  const run = () => crvPreloadFn?.();

  if (typeof window === 'undefined') {
    return;
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
    return;
  }

  globalThis.setTimeout(run, 400);
}

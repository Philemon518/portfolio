# Plan: Keep portfolio3 3D in sync with portfolio2

## Why this exists

The **portfolio2 → portfolio3** work originally focused on merging the **hand HUD** stack. A **bulk 3D sync** from portfolio2 was applied separately (scene, procedural textures, table/post stack, postprocessing outline). That sync was **not** captured in the older merge plan document, which is why it was easy to miss.

Going forward, treat **portfolio2 as the source of truth** for garage **3D** (meshes, materials, camera presets, interaction rules) unless portfolio3 intentionally diverges.

## Full parity procedure (use whenever portfolio2 moves ahead)

Copy these files **from portfolio2 into portfolio3** verbatim, then apply **portfolio3-only** ESLint cleanups:

1. [`../portfolio2/src/data/portfolioItems.ts`](../portfolio2/src/data/portfolioItems.ts) → `portfolio3/src/data/portfolioItems.ts` — all **camera presets** (including **CR-V** zoom) and copy stay in sync.
2. [`../portfolio2/src/scene/GarageScene.tsx`](../portfolio2/src/scene/GarageScene.tsx) → `portfolio3/src/scene/GarageScene.tsx` — scene graph, props, **`canHoverItem` / `canOutlineItem`**, postprocessing, etc.
3. [`../portfolio2/src/scene/garageTextures.ts`](../portfolio2/src/scene/garageTextures.ts) → `portfolio3/src/scene/garageTextures.ts` — procedural textures.

**After each paste, in portfolio3 only:**

- Remove **`outlineEnabled`** from `InteractiveGroup` (p2 passes it but it is unused) and drop every `outlineEnabled={…}` prop from JSX.
- Add **`void highlighted;`** at the top of **`CoffeeMachine`**, **`Laptop`**, and **`CRV`** bodies (p2 passes `highlighted` into GLTF wrappers that do not read it).
- Delete **unused** texture helpers not referenced by **`useGarageTextures()`** (same list as before: juggernog/st-lawrence poster factories, laptop screen, keyboard, wall art) so **`@typescript-eslint/no-unused-vars`** passes.

**Do not overwrite** `portfolio3/src/App.tsx`, `src/styles.css` (blue HUD + hand + SLU panels), or `src/ui/` / `src/hand/` / `src/stores/` — those are portfolio3-specific.

## Verification

- `npm run build && npm run lint` in `portfolio3`.
- Spot-check **CR-V** and **laptop** focus cameras against portfolio2 in the browser.

---

*This file is the canonical “3D sync” plan; link it from the main README if you want it discoverable.*

/**
 * Map a hand landmark from a centered **square** in normalized camera space (0–1)
 * to full viewport pixels. Only the middle `span`×`span` region maps to the screen;
 * values outside are clamped to the edges — so you need less physical reach.
 *
 * @param span Edge length of the square in normalized coords (e.g. `0.36` = tighter / less reach).
 */
export function landmarkTipToScreen(
  nxRaw: number,
  nyRaw: number,
  screenW: number,
  screenH: number,
  span = 0.36,
): { x: number; y: number } {
  const cx = 0.5
  const cy = 0.5
  const half = span / 2
  const u = (nxRaw - (cx - half)) / span
  const v = (nyRaw - (cy - half)) / span
  const clamp = (t: number) => Math.min(1, Math.max(0, t))
  return { x: clamp(u) * screenW, y: clamp(v) * screenH }
}

/** Default square span — lower = less arm movement to reach screen edges. */
export const HAND_SCREEN_MAP_SPAN = 0.34

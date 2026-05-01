/** Heuristic: desktop/laptop only (no mobile layout). */
export function isDesktopEnvironment(): boolean {
  if (typeof window === 'undefined') return true
  const w = window.innerWidth
  const h = window.innerHeight
  const minDim = Math.min(w, h)
  const ua = navigator.userAgent
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false
  const small = minDim < 640 || w < 1024
  return !mobileUa && !small && !(coarse && noHover)
}

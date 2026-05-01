/** Heuristic: desktop/laptop only (no mobile layout). */
export function isDesktopEnvironment(): boolean {
  if (typeof window === 'undefined') return true
  const ua = navigator.userAgent
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false
  return !mobileUa && !(coarse && noHover)
}

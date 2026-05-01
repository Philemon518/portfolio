/** Exponential moving average for jitter reduction. */
export function createEma2d(alpha: number) {
  let x: number | null = null
  let y: number | null = null
  return {
    reset() {
      x = null
      y = null
    },
    push(nx: number, ny: number): { x: number; y: number } {
      if (x === null || y === null) {
        x = nx
        y = ny
        return { x, y }
      }
      x = alpha * nx + (1 - alpha) * x
      y = alpha * ny + (1 - alpha) * y
      return { x, y }
    },
  }
}

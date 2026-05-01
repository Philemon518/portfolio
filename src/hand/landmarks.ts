/** MediaPipe hand landmark indices */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const

export type Landmark = { x: number; y: number; z?: number }

export function dist2(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/** Euclidean distance using x, y, and z when present (better across fist orientations). */
export function dist3(a: Landmark, b: Landmark): number {
  const az = a.z ?? 0
  const bz = b.z ?? 0
  return Math.hypot(a.x - b.x, a.y - b.y, az - bz)
}

export function fingerExtended(
  tip: Landmark,
  pip: Landmark,
  mcp: Landmark,
  wrist: Landmark,
): boolean {
  const dTip = dist2(tip, wrist)
  const dPip = dist2(pip, wrist)
  const dMcp = dist2(mcp, wrist)
  return dTip > dPip * 0.92 && dPip > dMcp * 0.85
}

export function fingerCurled(tip: Landmark, pip: Landmark, wrist: Landmark): boolean {
  return dist2(tip, wrist) < dist2(pip, wrist) * 1.05
}

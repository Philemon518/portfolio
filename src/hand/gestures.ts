import { LM, type Landmark, dist2, dist3, fingerCurled, fingerExtended } from './landmarks'

export type GestureSignals = {
  pinchActive: boolean
  fistActive: boolean
  peaceActive: boolean
}

/** Thumb–index distance below this counts as pinching (freeze cursor + click). */
export const PINCH_DIST_THRESH = 0.045

const STABLE_FRAMES = 4

function landmarksOk(lm: Landmark[] | undefined): lm is Landmark[] {
  return !!lm && lm.length >= 21
}

export function isPinchPose(lm: Landmark[] | undefined): boolean {
  if (!landmarksOk(lm)) return false
  return dist2(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]) < PINCH_DIST_THRESH
}

/**
 * Fist ≈ all fingertips gathered near their MCPs (3D), scale-normalized — works across
 * more orientations than “tip vs wrist in 2D” alone. Excludes peace and pinches.
 */
function isFistPose(lm: Landmark[]): boolean {
  const wrist = lm[LM.WRIST]
  const palmScale = Math.max(dist3(lm[LM.INDEX_MCP], lm[LM.PINKY_MCP]), dist3(wrist, lm[LM.MIDDLE_MCP]), 0.07)

  const indexExt = fingerExtended(lm[LM.INDEX_TIP], lm[LM.INDEX_PIP], lm[LM.INDEX_MCP], wrist)
  const middleExt = fingerExtended(lm[LM.MIDDLE_TIP], lm[LM.MIDDLE_PIP], lm[LM.MIDDLE_MCP], wrist)
  const ringCurled = fingerCurled(lm[LM.RING_TIP], lm[LM.RING_PIP], wrist)
  const pinkyCurled = fingerCurled(lm[LM.PINKY_TIP], lm[LM.PINKY_PIP], wrist)
  const peaceActive = indexExt && middleExt && ringCurled && pinkyCurled
  if (peaceActive) return false

  const kFinger = 0.52
  const kThumb = 0.62
  const digitsCurled =
    dist3(lm[LM.INDEX_TIP], lm[LM.INDEX_MCP]) < kFinger * palmScale &&
    dist3(lm[LM.MIDDLE_TIP], lm[LM.MIDDLE_MCP]) < kFinger * palmScale &&
    dist3(lm[LM.RING_TIP], lm[LM.RING_MCP]) < kFinger * palmScale &&
    dist3(lm[LM.PINKY_TIP], lm[LM.PINKY_MCP]) < kFinger * palmScale

  const thumbNearChain =
    dist3(lm[LM.THUMB_TIP], lm[LM.THUMB_MCP]) < kThumb * palmScale ||
    dist3(lm[LM.THUMB_TIP], lm[LM.THUMB_IP]) < 0.45 * palmScale

  const fistLike = digitsCurled && thumbNearChain

  const pinchWithoutFist = isPinchPose(lm) && !fistLike
  if (pinchWithoutFist) return false

  return fistLike
}

export function detectGestureSignals(lm: Landmark[] | undefined): GestureSignals {
  if (!landmarksOk(lm)) {
    return { pinchActive: false, fistActive: false, peaceActive: false }
  }
  const wrist = lm[LM.WRIST]

  const indexExt = fingerExtended(lm[LM.INDEX_TIP], lm[LM.INDEX_PIP], lm[LM.INDEX_MCP], wrist)
  const middleExt = fingerExtended(lm[LM.MIDDLE_TIP], lm[LM.MIDDLE_PIP], lm[LM.MIDDLE_MCP], wrist)
  const ringCurled = fingerCurled(lm[LM.RING_TIP], lm[LM.RING_PIP], wrist)
  const pinkyCurled = fingerCurled(lm[LM.PINKY_TIP], lm[LM.PINKY_PIP], wrist)
  const peaceActive = indexExt && middleExt && ringCurled && pinkyCurled

  const fistActive = isFistPose(lm)
  const pinchActive = isPinchPose(lm) && !fistActive

  return { pinchActive, fistActive, peaceActive }
}

type StableCounter = { pinch: number; fist: number; peace: number }

/**
 * Pinch / fist use short stability then **rising edge** only: one click (or one back)
 * per open→close cycle; holding does not repeat until the pose opens again.
 */
export function createGestureEngine() {
  let stable: StableCounter = { pinch: 0, fist: 0, peace: 0 }
  let pinchDebouncedPrev = false
  let fistDebouncedPrev = false
  let lastScroll = 0
  let peaceY: number | null = null

  return {
    reset() {
      stable = { pinch: 0, fist: 0, peace: 0 }
      pinchDebouncedPrev = false
      fistDebouncedPrev = false
      peaceY = null
    },
    tick(
      lm: Landmark[] | undefined,
      now: number,
    ): { primaryClick: boolean; fistBack: boolean; scrollDy: number } {
      const sig = detectGestureSignals(lm)
      stable = {
        pinch: sig.pinchActive ? stable.pinch + 1 : 0,
        fist: sig.fistActive ? stable.fist + 1 : 0,
        peace: sig.peaceActive ? stable.peace + 1 : 0,
      }

      const pinchDebounced = stable.pinch >= STABLE_FRAMES
      const fistDebounced = stable.fist >= STABLE_FRAMES

      const primaryClick = pinchDebounced && !pinchDebouncedPrev
      const fistBack = fistDebounced && !fistDebouncedPrev

      pinchDebouncedPrev = pinchDebounced
      fistDebouncedPrev = fistDebounced

      let scrollDy = 0

      if (stable.peace >= STABLE_FRAMES && landmarksOk(lm)) {
        const y = lm[LM.WRIST].y
        if (peaceY !== null && now - lastScroll > 80) {
          const dy = (y - peaceY) * 1800
          if (Math.abs(dy) > 6) {
            scrollDy = dy
            lastScroll = now
          }
        }
        peaceY = y
      } else {
        peaceY = null
      }

      return { primaryClick, fistBack, scrollDy }
    },
  }
}

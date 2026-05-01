import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import { createEma2d } from './smoothing'
import { createGestureEngine, isPinchPose } from './gestures'
import { LM, type Landmark } from './landmarks'
import { HAND_SCREEN_MAP_SPAN, landmarkTipToScreen } from './screenMapping'
import { useHandUiStore } from '../stores/handUiStore'
import { usePointerStore } from '../stores/pointerStore'

const WASM_BASE =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export type HandHudPayload = {
  landmarks: Landmark[] | undefined
  videoWidth: number
  videoHeight: number
}

type HandCallbacks = {
  onHud?: (p: HandHudPayload) => void
  onSyntheticEvent?: (type: 'move' | 'primary', x: number, y: number) => void
  /** Fist gesture: e.g. clear detail / go back in the host app (default no-op). */
  onFistBack?: () => void
}

/** Middle-finger MCP (knuckle at palm) — stable for pointing; index can move during pinch. */
function landmarkAnchorToClient(lm: Landmark, mirror: boolean): { x: number; y: number } {
  const w = window.innerWidth || 1
  const h = window.innerHeight || 1
  const nx = mirror ? 1 - lm.x : lm.x
  const ny = lm.y
  return landmarkTipToScreen(nx, ny, w, h, HAND_SCREEN_MAP_SPAN)
}

async function createLandmarker(): Promise<HandLandmarker> {
  const wasm = await FilesetResolver.forVisionTasks(WASM_BASE)
  const tryCreate = (delegate: 'GPU' | 'CPU') =>
    HandLandmarker.createFromOptions(wasm, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      numHands: 1,
      runningMode: 'VIDEO',
    })
  try {
    return await tryCreate('GPU')
  } catch {
    return await tryCreate('CPU')
  }
}

export function useHandPipeline(
  videoRef: RefObject<HTMLVideoElement | null>,
  callbacks: HandCallbacks,
) {
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number>(0)
  const emaRef = useRef(createEma2d(0.22))
  const gestureRef = useRef(createGestureEngine())
  const cbRef = useRef(callbacks)
  const lastResultRef = useRef<HandLandmarkerResult | null>(null)
  /**
   * Owns the current `getUserMedia` stream until fully released. On unmount, `videoRef.current`
   * may already be null while tracks are still live — always stop via this ref first.
   */
  const activeMediaStreamRef = useRef<MediaStream | null>(null)

  /** Incremented on every `stop()` so in-flight `start()` abandons stale `getUserMedia` results. */
  const startEpochRef = useRef(0)

  cbRef.current = callbacks

  const stop = useCallback(() => {
    startEpochRef.current += 1
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    const owned = activeMediaStreamRef.current
    activeMediaStreamRef.current = null
    if (owned) {
      for (const t of owned.getTracks()) {
        t.stop()
      }
    }
    const v = videoRef.current
    if (v) {
      try {
        v.pause()
      } catch {
        // ignore
      }
      const so = v.srcObject
      if (so) {
        for (const t of (so as MediaStream).getTracks()) {
          t.stop()
        }
      }
      v.srcObject = null
      v.removeAttribute('src')
      /* Fully reset the element so the browser drops the camera indicator. */
      v.load()
    }
    emaRef.current.reset()
    gestureRef.current.reset()
    lastResultRef.current = null
  }, [videoRef])

  const start = useCallback(async () => {
    const videoEl = videoRef.current
    if (!videoEl) return
    stop()
    const epochAfterStop = startEpochRef.current
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    })
    if (epochAfterStop !== startEpochRef.current) {
      for (const t of stream.getTracks()) {
        t.stop()
      }
      return
    }
    activeMediaStreamRef.current = stream
    const elAfterAcquire = videoRef.current
    if (!elAfterAcquire) {
      for (const t of stream.getTracks()) {
        t.stop()
      }
      activeMediaStreamRef.current = null
      return
    }
    elAfterAcquire.srcObject = stream
    try {
      await elAfterAcquire.play()
    } catch {
      stop()
      return
    }
    if (epochAfterStop !== startEpochRef.current || !videoRef.current) {
      stop()
      return
    }
    let landmarker: HandLandmarker
    try {
      landmarker = await createLandmarker()
    } catch {
      stop()
      return
    }
    if (epochAfterStop !== startEpochRef.current || !videoRef.current) {
      landmarker.close()
      stop()
      return
    }
    landmarkerRef.current = landmarker

    const loop = () => {
      const handMode = useHandUiStore.getState().handMode
      const lmInstance = landmarkerRef.current
      const vid = videoRef.current
      if (!lmInstance || !vid || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }

      const now = performance.now()
      const result = lmInstance.detectForVideo(vid, now)
      lastResultRef.current = result

      const lm = result.landmarks[0] as Landmark[] | undefined
      cbRef.current.onHud?.({
        landmarks: lm,
        videoWidth: vid.videoWidth,
        videoHeight: vid.videoHeight,
      })

      if (handMode && lm) {
        const pinching = isPinchPose(lm)
        if (!pinching) {
          const anchor = lm[LM.MIDDLE_MCP]
          const { x: rx, y: ry } = landmarkAnchorToClient(anchor, true)
          const { x, y } = emaRef.current.push(rx, ry)
          usePointerStore.getState().setFromClient(x, y, 'hand')
          cbRef.current.onSyntheticEvent?.('move', x, y)
        }

        const g = gestureRef.current.tick(lm, now)
        if (g.scrollDy !== 0) {
          const root = document.querySelector('[data-scroll-root]') as HTMLElement | null
          if (root) root.scrollTop += g.scrollDy
        }
        if (g.primaryClick) {
          const { clientX, clientY } = usePointerStore.getState()
          cbRef.current.onSyntheticEvent?.('primary', clientX, clientY)
        }
        if (g.fistBack) {
          cbRef.current.onFistBack?.()
        }
      }

      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [stop, videoRef])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { start, stop, getLastResult: () => lastResultRef.current }
}

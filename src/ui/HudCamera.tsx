import { useEffect, useRef, useState } from 'react'
import { HAND_CONNECTIONS } from '../hand/handConnections'
import { useHandUiStore } from '../stores/handUiStore'
import { useHandPipeline, type HandHudPayload } from '../hand/useHandPipeline'

type Props = {
  onSynthetic: (type: 'move' | 'primary', x: number, y: number) => void
  onFistBack?: () => void
  /** Stops the webcam / hand pipeline (Normal Way). */
  onExitToNormalWay: () => void
}

export function HudCamera({ onSynthetic, onFistBack, onExitToNormalWay }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const showSkeleton = useHandUiStore((s) => s.showSkeleton)
  const setShowSkeleton = useHandUiStore((s) => s.setShowSkeleton)
  const setHandMode = useHandUiStore((s) => s.setHandMode)

  const hudRef = useRef<HandHudPayload | null>(null)

  const { start, stop } = useHandPipeline(videoRef, {
    onHud: (p) => {
      hudRef.current = p
    },
    onSyntheticEvent: (type, x, y) => onSynthetic(type, x, y),
    onFistBack,
  })

  useEffect(() => {
    const vid = videoRef.current
    const ol = overlayRef.current
    if (!vid || !ol) return

    let raf = 0
    const draw = () => {
      const payload = hudRef.current
      const w = vid.clientWidth || 160
      const h = vid.clientHeight || 120
      ol.width = w
      ol.height = h
      const ctx = ol.getContext('2d')
      if (!ctx) {
        raf = requestAnimationFrame(draw)
        return
      }
      ctx.clearRect(0, 0, w, h)
      if (showSkeleton && payload?.landmarks) {
        ctx.strokeStyle = 'rgba(125,211,252,0.85)'
        ctx.lineWidth = 2
        const lm = payload.landmarks
        for (const [a, b] of HAND_CONNECTIONS) {
          const pa = lm[a]
          const pb = lm[b]
          if (!pa || !pb) continue
          ctx.beginPath()
          ctx.moveTo((1 - pa.x) * w, pa.y * h)
          ctx.lineTo((1 - pb.x) * w, pb.y * h)
          ctx.stroke()
        }
        for (const p of lm) {
          ctx.fillStyle = 'rgba(250,250,255,0.9)'
          ctx.beginPath()
          ctx.arc((1 - p.x) * w, p.y * h, 2.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [showSkeleton])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await start()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Camera error')
          setHandMode(false)
        }
      }
    })()
    return () => {
      cancelled = true
      stop()
    }
  }, [start, stop, setHandMode])

  return (
    <div
      className="hud-camera-panel"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'stretch',
        padding: 10,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(12,14,22,0.88)',
        backdropFilter: 'blur(10px)',
        maxWidth: 360,
      }}
    >
      <div style={{ position: 'relative', width: 160, height: 120, borderRadius: 8, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
            background: '#111',
          }}
        />
        {/* No scaleX here: video is mirrored; skeleton uses (1-x) so it matches the preview once. */}
        <canvas
          ref={overlayRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 120, justifyContent: 'center' }}>
        <button
          type="button"
          className="hud-funway-btn clickable-hover"
          onClick={() => {
            setError(null)
            stop()
            onExitToNormalWay()
          }}
          title="Normal Way (mouse) — turn off camera"
        >
          Normal Way
        </button>
        <label
          className="clickable-hover"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c8d0e0' }}
        >
          <input
            type="checkbox"
            checked={showSkeleton}
            onChange={(e) => setShowSkeleton(e.target.checked)}
          />
          Detection lines
        </label>
        {error ? <span style={{ fontSize: 12, color: '#fca5a5' }}>{error}</span> : null}
      </div>
    </div>
  )
}

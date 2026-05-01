import { usePointerStore } from '../stores/pointerStore'
import { useHandUiStore } from '../stores/handUiStore'

export function VirtualCursor() {
  const handMode = useHandUiStore((s) => s.handMode)
  const { clientX, clientY, visible } = usePointerStore()

  if (!handMode || !visible) {
    return null
  }

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: clientX,
        top: clientY,
        width: 18,
        height: 18,
        marginLeft: -9,
        marginTop: -9,
        borderRadius: '50%',
        border: '2px solid rgba(125,211,252,0.95)',
        boxShadow: '0 0 18px rgba(56,189,248,0.45)',
        pointerEvents: 'none',
        zIndex: 9500,
        mixBlendMode: 'normal',
      }}
    />
  )
}

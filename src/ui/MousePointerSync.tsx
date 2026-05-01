import { useEffect } from 'react'
import { useHandUiStore } from '../stores/handUiStore'
import { usePointerStore } from '../stores/pointerStore'

export function MousePointerSync() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const handMode = useHandUiStore.getState().handMode
      if (handMode) return
      usePointerStore.getState().setFromClient(e.clientX, e.clientY, 'mouse')
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])
  return null
}

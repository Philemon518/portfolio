import { useCallback } from 'react'
import { useHandUiStore } from '../stores/handUiStore'

/** Mirrors `.clickable-hover:hover` — synthetic pointer does not move the OS cursor, so `:hover` never updates. */
const HAND_POINTER_HOVER_CLASS = 'hand-pointer-hover'

let lastHandHoverHost: Element | null = null

function pulseInteractiveTarget(el: Element | null) {
  const target = el?.closest('button, a, [role="button"], [role="radio"], .clickable-hover')
  if (!(target instanceof HTMLElement) || target.matches(':disabled, [aria-disabled="true"]')) {
    return
  }
  target.classList.remove('portfolio-click-pop')
  // Force a reflow so repeated hand clicks restart the animation.
  void target.offsetWidth
  target.classList.add('portfolio-click-pop')
  window.setTimeout(() => target.classList.remove('portfolio-click-pop'), 260)
}

export function clearHandPointerHover() {
  lastHandHoverHost?.classList.remove(HAND_POINTER_HOVER_CLASS)
  lastHandHoverHost = null
}

function syncHandPointerHoverFromElement(el: Element | null) {
  const host = el?.closest('.clickable-hover') ?? null
  if (host === lastHandHoverHost) {
    return
  }
  lastHandHoverHost?.classList.remove(HAND_POINTER_HOVER_CLASS)
  host?.classList.add(HAND_POINTER_HOVER_CLASS)
  lastHandHoverHost = host
}

function targetAt(x: number, y: number): Element | null {
  return document.elementFromPoint(x, y)
}

function dispatchMove(el: Element, x: number, y: number) {
  el.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      view: window,
    }),
  )
}

export function useSyntheticHandPointer() {
  return useCallback((type: 'move' | 'primary', x: number, y: number) => {
    const handMode = useHandUiStore.getState().handMode
    if (!handMode) {
      clearHandPointerHover()
      return
    }
    const el = targetAt(x, y)
    if (!el) {
      clearHandPointerHover()
      return
    }
    syncHandPointerHoverFromElement(el)

    if (type === 'move') {
      dispatchMove(el, x, y)
      return
    }
    dispatchMove(el, x, y)
    if (type === 'primary') {
      pulseInteractiveTarget(el)
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: 1,
          view: window,
        }),
      )
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: 0,
          view: window,
        }),
      )
      el.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          button: 0,
          view: window,
        }),
      )
    }
  }, [])
}

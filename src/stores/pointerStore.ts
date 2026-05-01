import { create } from 'zustand'

export type PointerSource = 'mouse' | 'hand' | 'none'

type PointerState = {
  clientX: number
  clientY: number
  /** Normalized device coords for Three.js (-1..1, y up) */
  ndcX: number
  ndcY: number
  source: PointerSource
  visible: boolean
  setFromClient: (x: number, y: number, source: PointerSource) => void
  setVisible: (v: boolean) => void
}

function toNdc(x: number, y: number): { ndcX: number; ndcY: number } {
  const w = window.innerWidth || 1
  const h = window.innerHeight || 1
  return {
    ndcX: (x / w) * 2 - 1,
    ndcY: -(y / h) * 2 + 1,
  }
}

export const usePointerStore = create<PointerState>((set) => ({
  clientX: window.innerWidth / 2,
  clientY: window.innerHeight / 2,
  ndcX: 0,
  ndcY: 0,
  source: 'none',
  visible: true,
  setFromClient: (x, y, source) => {
    const { ndcX, ndcY } = toNdc(x, y)
    set({ clientX: x, clientY: y, ndcX, ndcY, source })
  },
  setVisible: (v) => set({ visible: v }),
}))

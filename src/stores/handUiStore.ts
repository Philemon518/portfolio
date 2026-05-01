import { create } from 'zustand'

type HandUiState = {
  handMode: boolean
  showSkeleton: boolean
  setHandMode: (on: boolean) => void
  setShowSkeleton: (on: boolean) => void
}

export const useHandUiStore = create<HandUiState>((set) => ({
  handMode: false,
  showSkeleton: true,
  setHandMode: (on) => set({ handMode: on }),
  setShowSkeleton: (on) => set({ showSkeleton: on }),
}))

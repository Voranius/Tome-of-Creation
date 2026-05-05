import { create } from 'zustand'

export type Screen = 'writing' | 'codex' | 'planner' | 'loom' | 'notes' | 'search' | 'settings'

interface UIState {
  activeScreen: Screen
  navigate: (screen: Screen) => void
}

export const useUIStore = create<UIState>()((set) => ({
  activeScreen: 'writing',
  navigate: (screen) => set({ activeScreen: screen }),
}))

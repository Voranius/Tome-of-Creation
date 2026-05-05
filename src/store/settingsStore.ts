import { create } from 'zustand'
import { getAllSettings, setSetting } from '../lib/db/settings'

interface SettingsState {
  theme: 'dark'
  fontSize: number
  autosaveIntervalMs: number
  defaultProvider: string | null
  loadFromDb: () => Promise<void>
  update: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  theme: 'dark',
  fontSize: 16,
  autosaveIntervalMs: 1500,
  defaultProvider: null,

  loadFromDb: async () => {
    const all = await getAllSettings()
    set({
      theme: 'dark',
      fontSize: all.font_size ? parseInt(all.font_size, 10) : 16,
      autosaveIntervalMs: all.autosave_interval_ms
        ? parseInt(all.autosave_interval_ms, 10)
        : 1500,
      defaultProvider: all.default_ai_provider || null,
    })
  },

  update: async (key, value) => {
    // Optimistic update so controlled inputs respond immediately
    if (key === 'font_size') set({ fontSize: parseInt(value, 10) })
    else if (key === 'autosave_interval_ms') set({ autosaveIntervalMs: parseInt(value, 10) })
    else if (key === 'default_ai_provider') set({ defaultProvider: value || null })
    setSetting(key, value).catch(console.error)
  },
}))

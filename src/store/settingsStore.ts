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
    await setSetting(key, value)
    const all = await getAllSettings()
    set({
      fontSize: all.font_size ? parseInt(all.font_size, 10) : get().fontSize,
      autosaveIntervalMs: all.autosave_interval_ms
        ? parseInt(all.autosave_interval_ms, 10)
        : get().autosaveIntervalMs,
      defaultProvider: all.default_ai_provider ?? get().defaultProvider,
    })
  },
}))

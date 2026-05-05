import { create } from 'zustand'
import { getAllSettings, setSetting } from '../lib/db/settings'

interface SettingsState {
  theme: 'dark'
  autosaveIntervalMs: number
  defaultProvider: string | null
  editorFontFamily: string
  editorFontSize: number
  loadFromDb: () => Promise<void>
  update: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  theme: 'dark',
  autosaveIntervalMs: 1500,
  defaultProvider: null,
  editorFontFamily: 'default',
  editorFontSize: 16,

  loadFromDb: async () => {
    const all = await getAllSettings()
    set({
      theme: 'dark',
      autosaveIntervalMs: all.autosave_interval_ms
        ? parseInt(all.autosave_interval_ms, 10)
        : 1500,
      defaultProvider: all.default_ai_provider || null,
      editorFontFamily: all.editor_font_family || 'default',
      editorFontSize: all.editor_font_size ? parseInt(all.editor_font_size, 10) : 16,
    })
  },

  update: async (key, value) => {
    if (key === 'autosave_interval_ms') set({ autosaveIntervalMs: parseInt(value, 10) })
    else if (key === 'default_ai_provider') set({ defaultProvider: value || null })
    else if (key === 'editor_font_family') set({ editorFontFamily: value })
    else if (key === 'editor_font_size') set({ editorFontSize: parseInt(value, 10) })
    setSetting(key, value).catch(console.error)
  },
}))

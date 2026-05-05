import { create } from 'zustand'
import { getEntries, getArchivedEntries } from '../lib/db/codex'
import type { CodexEntry } from '../lib/db/types'

interface CodexState {
  entries: CodexEntry[]
  archivedEntries: CodexEntry[]
  selectedEntryId: number | null
  activeCategory: string | null
  searchQuery: string
  showArchived: boolean
  isLoading: boolean
  loadEntries: () => Promise<void>
  selectEntry: (id: number | null) => void
  setCategory: (cat: string | null) => void
  setSearchQuery: (q: string) => void
  setShowArchived: (show: boolean) => void
  addEntry: (entry: CodexEntry) => void
  updateEntryInStore: (id: number, data: Partial<CodexEntry>) => void
  archiveEntryInStore: (id: number) => void
}

export const useCodexStore = create<CodexState>()((set) => ({
  entries: [],
  archivedEntries: [],
  selectedEntryId: null,
  activeCategory: null,
  searchQuery: '',
  showArchived: false,
  isLoading: false,

  loadEntries: async () => {
    set({ isLoading: true })
    const [entries, archivedEntries] = await Promise.all([
      getEntries(),
      getArchivedEntries(),
    ])
    set({ entries, archivedEntries, isLoading: false })
  },

  selectEntry: (id) => set({ selectedEntryId: id }),

  setCategory: (cat) => set({ activeCategory: cat }),

  setSearchQuery: (q) => set({ searchQuery: q }),

  setShowArchived: (show) => set({ showArchived: show }),

  addEntry: (entry) => set(s => ({ entries: [...s.entries, entry] })),

  updateEntryInStore: (id, data) =>
    set(s => ({
      entries: s.entries.map(e => e.id === id ? { ...e, ...data } : e),
    })),

  archiveEntryInStore: (id) =>
    set(s => {
      const entry = s.entries.find(e => e.id === id)
      return {
        entries: s.entries.filter(e => e.id !== id),
        archivedEntries: entry
          ? [...s.archivedEntries, { ...entry, is_archived: 1 }]
          : s.archivedEntries,
        selectedEntryId: s.selectedEntryId === id ? null : s.selectedEntryId,
      }
    }),
}))

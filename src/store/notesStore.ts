import { create } from 'zustand'
import type { Note } from '../lib/db/types'

interface NotesState {
  notes: Note[]
  selectedNoteId: number | null
  setNotes: (notes: Note[]) => void
  selectNote: (id: number | null) => void
  addNote: (note: Note) => void
  updateNoteInStore: (id: number, data: Partial<Note>) => void
  archiveNoteInStore: (id: number) => void
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  selectedNoteId: null,

  setNotes: (notes) => set({ notes }),
  selectNote: (id) => set({ selectedNoteId: id }),
  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),
  updateNoteInStore: (id, data) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...data } : n)),
    })),
  archiveNoteInStore: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      selectedNoteId: s.selectedNoteId === id ? null : s.selectedNoteId,
    })),
}))

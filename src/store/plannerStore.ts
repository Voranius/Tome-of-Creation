import { create } from 'zustand'
import type { ChapterWithWC, SeriesBeat } from '../lib/db/types'
import type { StructurePresetKey } from '../lib/planner/structures'

interface PlannerState {
  selectedBookId: number | null
  chapters: ChapterWithWC[]
  beats: SeriesBeat[]
  selectedChapterId: number | null
  selectedBeatId: number | null
  activeStructure: StructurePresetKey

  selectBook: (id: number | null) => void
  setChapters: (chapters: ChapterWithWC[]) => void
  setBeats: (beats: SeriesBeat[]) => void
  selectChapter: (id: number | null) => void
  selectBeat: (id: number | null) => void
  addBeat: (beat: SeriesBeat) => void
  updateBeatInStore: (id: number, data: Partial<SeriesBeat>) => void
  deleteBeatFromStore: (id: number) => void
  setActiveStructure: (key: StructurePresetKey) => void
}

export const usePlannerStore = create<PlannerState>()((set) => ({
  selectedBookId: null,
  chapters: [],
  beats: [],
  selectedChapterId: null,
  selectedBeatId: null,
  activeStructure: 'save-the-cat',

  selectBook: (id) => set({ selectedBookId: id, selectedChapterId: null, selectedBeatId: null }),
  setChapters: (chapters) => set({ chapters }),
  setBeats: (beats) => set({ beats }),
  selectChapter: (id) => set({ selectedChapterId: id, selectedBeatId: null }),
  selectBeat: (id) => set({ selectedBeatId: id, selectedChapterId: null }),
  addBeat: (beat) => set((s) => ({ beats: [...s.beats, beat].sort((a, b) => a.position - b.position) })),
  updateBeatInStore: (id, data) =>
    set((s) => ({
      beats: s.beats
        .map((b) => (b.id === id ? { ...b, ...data } : b))
        .sort((a, b) => a.position - b.position),
    })),
  deleteBeatFromStore: (id) =>
    set((s) => ({
      beats: s.beats.filter((b) => b.id !== id),
      selectedBeatId: s.selectedBeatId === id ? null : s.selectedBeatId,
    })),
  setActiveStructure: (key) => set({ activeStructure: key }),
}))

import { create } from 'zustand'
import type { Book, Chapter, Scene } from '../lib/db/types'

interface WritingState {
  books: Book[]
  chapters: Chapter[]
  scenes: Scene[]
  selectedBookId: number | null
  selectedChapterId: number | null
  selectedSceneId: number | null
  isAIPanelOpen: boolean
  isOutlinePanelOpen: boolean

  setBooks: (books: Book[]) => void
  setChapters: (chapters: Chapter[]) => void
  setScenes: (scenes: Scene[]) => void
  selectBook: (id: number | null) => void
  selectChapter: (id: number | null) => void
  selectScene: (id: number | null) => void
  addBook: (book: Book) => void
  addChapter: (chapter: Chapter) => void
  addScene: (scene: Scene) => void
  updateChapterInStore: (id: number, data: Partial<Chapter>) => void
  updateSceneInStore: (id: number, data: Partial<Scene>) => void
  archiveChapterInStore: (id: number) => void
  archiveSceneInStore: (id: number) => void
  reorderChaptersInStore: (ids: number[]) => void
  reorderScenesInStore: (ids: number[]) => void
  toggleAIPanel: () => void
  toggleOutlinePanel: () => void
}

export const useWritingStore = create<WritingState>()((set) => ({
  books: [],
  chapters: [],
  scenes: [],
  selectedBookId: null,
  selectedChapterId: null,
  selectedSceneId: null,
  isAIPanelOpen: false,
  isOutlinePanelOpen: true,

  setBooks: (books) => set({ books }),
  setChapters: (chapters) => set({ chapters }),
  setScenes: (scenes) => set({ scenes }),

  selectBook: (id) => set({ selectedBookId: id, selectedChapterId: null, selectedSceneId: null }),
  selectChapter: (id) => set({ selectedChapterId: id, selectedSceneId: null }),
  selectScene: (id) => set({ selectedSceneId: id }),

  addBook: (book) => set(s => ({ books: [...s.books, book] })),
  addChapter: (chapter) => set(s => ({ chapters: [...s.chapters, chapter] })),
  addScene: (scene) => set(s => ({ scenes: [...s.scenes, scene] })),

  updateChapterInStore: (id, data) =>
    set(s => ({ chapters: s.chapters.map(c => c.id === id ? { ...c, ...data } : c) })),

  updateSceneInStore: (id, data) =>
    set(s => ({ scenes: s.scenes.map(sc => sc.id === id ? { ...sc, ...data } : sc) })),

  archiveChapterInStore: (id) =>
    set(s => ({
      chapters: s.chapters.filter(c => c.id !== id),
      scenes: s.scenes.filter(sc => sc.chapter_id !== id),
      selectedChapterId: s.selectedChapterId === id ? null : s.selectedChapterId,
      selectedSceneId: s.chapters.find(c => c.id === id)
        ? null
        : s.selectedSceneId,
    })),

  archiveSceneInStore: (id) =>
    set(s => ({
      scenes: s.scenes.filter(sc => sc.id !== id),
      selectedSceneId: s.selectedSceneId === id ? null : s.selectedSceneId,
    })),

  reorderChaptersInStore: (ids) =>
    set(s => ({
      chapters: ids.map((id, i) => {
        const ch = s.chapters.find(c => c.id === id)!
        return { ...ch, sort_order: i }
      }),
    })),

  reorderScenesInStore: (ids) =>
    set(s => ({
      scenes: s.scenes.map(sc => {
        const idx = ids.indexOf(sc.id)
        return idx >= 0 ? { ...sc, sort_order: idx } : sc
      }),
    })),

  toggleAIPanel: () => set(s => ({ isAIPanelOpen: !s.isAIPanelOpen })),
  toggleOutlinePanel: () => set(s => ({ isOutlinePanelOpen: !s.isOutlinePanelOpen })),
}))

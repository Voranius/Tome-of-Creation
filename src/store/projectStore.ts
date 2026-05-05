import { create } from 'zustand'
import type { ProjectData } from '../lib/db/types'

interface ProjectState {
  isOpen: boolean
  projectPath: string | null
  projectTitle: string
  projectId: number | null
  isDirty: boolean
  lastSaved: Date | null
  dbPath: string | null
  openProject: (data: ProjectData & { dbPath: string }) => void
  closeProject: () => void
  setDirty: (dirty: boolean) => void
  setLastSaved: (date: Date) => void
}

export const useProjectStore = create<ProjectState>()((set) => ({
  isOpen: false,
  projectPath: null,
  projectTitle: '',
  projectId: null,
  isDirty: false,
  lastSaved: null,
  dbPath: null,

  openProject: (data) =>
    set({
      isOpen: true,
      projectPath: data.path,
      projectTitle: data.title,
      projectId: data.project_id,
      dbPath: data.db_path,
      isDirty: false,
      lastSaved: null,
    }),

  closeProject: () =>
    set({
      isOpen: false,
      projectPath: null,
      projectTitle: '',
      projectId: null,
      dbPath: null,
      isDirty: false,
      lastSaved: null,
    }),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastSaved: (date) => set({ lastSaved: date, isDirty: false }),
}))

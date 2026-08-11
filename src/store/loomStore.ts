import { create } from 'zustand'
import type { LoomSessionWithCount, LoomMessage, CodexEntry } from '../lib/db/types'

interface LoomState {
  sessions: LoomSessionWithCount[]
  selectedSessionId: number | null
  messages: LoomMessage[]
  pinnedEntries: CodexEntry[]
  pinnedSessions: LoomSessionWithCount[]
  mentionedEntries: CodexEntry[]
  isGenerating: boolean
  searchQuery: string

  setSessions: (sessions: LoomSessionWithCount[]) => void
  selectSession: (id: number | null) => void
  setMessages: (msgs: LoomMessage[]) => void
  appendMessage: (msg: LoomMessage) => void
  setPinnedEntries: (entries: CodexEntry[]) => void
  setPinnedSessions: (sessions: LoomSessionWithCount[]) => void
  addMentionedEntry: (entry: CodexEntry) => void
  clearMentionedEntries: () => void
  setIsGenerating: (v: boolean) => void
  setSearchQuery: (q: string) => void
  updateSessionTitle: (id: number, title: string) => void
  archiveSessionInStore: (id: number) => void
  addSession: (session: LoomSessionWithCount) => void
}

export const useLoomStore = create<LoomState>()((set) => ({
  sessions: [],
  selectedSessionId: null,
  messages: [],
  pinnedEntries: [],
  pinnedSessions: [],
  mentionedEntries: [],
  isGenerating: false,
  searchQuery: '',

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),

  selectSession: (id) => set({
    selectedSessionId: id,
    messages: [],
    pinnedEntries: [],
    pinnedSessions: [],
    mentionedEntries: [],
  }),

  setMessages: (messages) => set({ messages }),

  appendMessage: (msg) => set((s) => ({
    messages: [...s.messages, msg],
    sessions: s.sessions.map((sess) =>
      sess.id === s.selectedSessionId
        ? { ...sess, message_count: sess.message_count + 1 }
        : sess
    ),
  })),

  setPinnedEntries: (pinnedEntries) => set({ pinnedEntries }),
  setPinnedSessions: (pinnedSessions) => set({ pinnedSessions }),

  addMentionedEntry: (entry) =>
    set((s) => {
      if (s.mentionedEntries.some((e) => e.id === entry.id)) return s
      return { mentionedEntries: [...s.mentionedEntries, entry] }
    }),

  clearMentionedEntries: () => set({ mentionedEntries: [] }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, title } : sess)),
    })),

  archiveSessionInStore: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      selectedSessionId: s.selectedSessionId === id ? null : s.selectedSessionId,
    })),
}))

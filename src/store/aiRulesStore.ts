import { create } from 'zustand'
import type { AIRule } from '../lib/db/types'

interface AIRulesState {
  writingStyle: string
  goodExamples: AIRule[]
  badExamples: AIRule[]
  worldSummary: string

  setWritingStyle: (text: string) => void
  setGoodExamples: (rules: AIRule[]) => void
  setBadExamples: (rules: AIRule[]) => void
  setWorldSummary: (text: string) => void
  addExample: (rule: AIRule) => void
  updateExampleInStore: (id: number, text: string) => void
  deleteExampleFromStore: (id: number) => void
}

export const useAIRulesStore = create<AIRulesState>()((set) => ({
  writingStyle: '',
  goodExamples: [],
  badExamples: [],
  worldSummary: '',

  setWritingStyle: (text) => set({ writingStyle: text }),
  setGoodExamples: (rules) => set({ goodExamples: rules }),
  setBadExamples: (rules) => set({ badExamples: rules }),
  setWorldSummary: (text) => set({ worldSummary: text }),

  addExample: (rule) =>
    set((s) =>
      rule.category === 'good-example'
        ? { goodExamples: [...s.goodExamples, rule] }
        : { badExamples: [...s.badExamples, rule] }
    ),

  updateExampleInStore: (id, text) =>
    set((s) => ({
      goodExamples: s.goodExamples.map((r) => (r.id === id ? { ...r, rule_text: text } : r)),
      badExamples: s.badExamples.map((r) => (r.id === id ? { ...r, rule_text: text } : r)),
    })),

  deleteExampleFromStore: (id) =>
    set((s) => ({
      goodExamples: s.goodExamples.filter((r) => r.id !== id),
      badExamples: s.badExamples.filter((r) => r.id !== id),
    })),
}))

import { create } from 'zustand'
import { getKey, setKey, removeKey, getStoredValue, setStoredValue } from '../lib/ai/keyStore'
import { DEFAULT_MODELS } from '../lib/ai/types'
import type { ProviderKey } from '../lib/ai/types'

interface AIState {
  connectedProviders: ProviderKey[]
  defaultProvider: ProviderKey | null
  selectedModels: Record<ProviderKey, string>
  ollamaModels: string[]
  loadFromStore: () => Promise<void>
  setConnected: (provider: ProviderKey, connected: boolean) => void
  setDefaultProvider: (provider: ProviderKey | null) => Promise<void>
  setSelectedModel: (provider: ProviderKey, model: string) => void
  setOllamaModels: (models: string[]) => void
  saveKey: (provider: ProviderKey, key: string) => Promise<void>
  deleteKey: (provider: ProviderKey) => Promise<void>
  getKey: (provider: ProviderKey) => Promise<string | null>
}

export const useAIStore = create<AIState>()((set, get) => ({
  connectedProviders: [],
  defaultProvider: null,
  selectedModels: { ...DEFAULT_MODELS },
  ollamaModels: [],

  loadFromStore: async () => {
    const defaultProvider = (await getStoredValue('default_provider')) as ProviderKey | null
    const selectedModels = { ...DEFAULT_MODELS }
    const providers: ProviderKey[] = ['openai', 'anthropic', 'gemini', 'ollama']
    for (const p of providers) {
      const model = await getStoredValue(`model_${p}`)
      if (model) selectedModels[p] = model
    }
    set({ defaultProvider, selectedModels })
  },

  setConnected: (provider, connected) =>
    set(s => ({
      connectedProviders: connected
        ? [...new Set([...s.connectedProviders, provider])]
        : s.connectedProviders.filter(p => p !== provider),
    })),

  setDefaultProvider: async (provider) => {
    await setStoredValue('default_provider', provider ?? '')
    set({ defaultProvider: provider })
  },

  setSelectedModel: (provider, model) => {
    setStoredValue(`model_${provider}`, model)
    set(s => ({ selectedModels: { ...s.selectedModels, [provider]: model } }))
  },

  setOllamaModels: (models) => set({ ollamaModels: models }),

  saveKey: async (provider, key) => {
    await setKey(provider, key)
    get().setConnected(provider, true)
  },

  deleteKey: async (provider) => {
    await removeKey(provider)
    get().setConnected(provider, false)
  },

  getKey: (provider) => getKey(provider),
}))

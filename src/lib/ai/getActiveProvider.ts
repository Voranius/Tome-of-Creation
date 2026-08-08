import { useAIStore } from '../../store/aiStore'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { OllamaProvider } from './providers/ollama'
import type { AIProvider, ProviderKey } from './types'

export interface ActiveProvider {
  provider: AIProvider
  model: string
  key: ProviderKey
}

export async function getActiveProvider(): Promise<ActiveProvider | null> {
  const { defaultProvider, connectedProviders, selectedModels, getKey } = useAIStore.getState()
  const providerKey = defaultProvider ?? connectedProviders[0] ?? null
  if (!providerKey) return null

  const model = selectedModels[providerKey]

  if (providerKey === 'ollama') {
    return { provider: new OllamaProvider(model), model, key: providerKey }
  }

  const apiKey = await getKey(providerKey)
  if (!apiKey) return null

  const provider: AIProvider =
    providerKey === 'openai'     ? new OpenAIProvider(apiKey) :
    providerKey === 'anthropic'  ? new AnthropicProvider(apiKey) :
                                   new GeminiProvider(apiKey)

  return { provider, model, key: providerKey }
}

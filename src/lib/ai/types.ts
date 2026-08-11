export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIProvider {
  sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string>
}

export type ProviderKey = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter'

export const PROVIDER_MODELS: Record<ProviderKey, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  ollama: [],
  openrouter: [
    'anthropic/claude-opus-4-5',
    'anthropic/claude-sonnet-4-5',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat',
    'mistralai/mistral-large',
  ],
}

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
  ollama: 'Ollama (Local)',
  openrouter: 'OpenRouter',
}

export const DEFAULT_MODELS: Record<ProviderKey, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash',
  ollama: '',
  openrouter: 'anthropic/claude-sonnet-4-5',
}

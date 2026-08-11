import type { AIProvider, Message } from '../types'

export async function testOpenRouter(apiKey: string): Promise<void> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
}

export class OpenRouterProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Tome of Creation',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter error: HTTP ${res.status}`)
    const data = await res.json() as { choices: { message: { content: string } }[] }
    const text = data.choices[0]?.message?.content
    if (!text) throw new Error('OpenRouter returned no content')
    return text
  }
}

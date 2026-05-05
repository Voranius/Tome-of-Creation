import type { AIProvider, Message } from '../types'

export async function testAnthropic(apiKey: string): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-requests': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
}

export class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-requests': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.filter(m => m.role !== 'system'),
      }),
    })
    if (!res.ok) throw new Error(`Anthropic error: HTTP ${res.status}`)
    const data = await res.json() as { content: { text: string }[] }
    return data.content[0].text
  }
}

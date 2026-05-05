import type { AIProvider, Message } from '../types'

export async function testOpenAI(apiKey: string): Promise<void> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
}

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI error: HTTP ${res.status}`)
    const data = await res.json() as { choices: { message: { content: string } }[] }
    return data.choices[0].message.content
  }
}

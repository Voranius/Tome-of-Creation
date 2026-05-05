import type { AIProvider, Message } from '../types'

export async function testGemini(apiKey: string): Promise<void> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
}

export class GeminiProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`)
    const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] }
    return data.candidates[0].content.parts[0].text
  }
}

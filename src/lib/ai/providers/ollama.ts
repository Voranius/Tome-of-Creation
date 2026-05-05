import type { AIProvider, Message } from '../types'

const OLLAMA_BASE = 'http://localhost:11434'

export async function testOllama(): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE}/api/tags`)
  if (!res.ok) throw new Error('Ollama not running')
  const data = await res.json() as { models: { name: string }[] }
  return data.models.map(m => m.name)
}

export class OllamaProvider implements AIProvider {
  constructor(_model: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`)
    const data = await res.json() as { message: { content: string } }
    return data.message.content
  }
}

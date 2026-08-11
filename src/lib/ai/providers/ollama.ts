import type { AIProvider, Message } from '../types'

const OLLAMA_BASE = 'http://localhost:11434'

export async function testOllama(): Promise<string[]> {
  let res: Response
  try {
    res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new Error('Ollama is not reachable at localhost:11434 — is Ollama running?')
  }
  if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`)
  const data = await res.json() as { models: { name: string }[] }
  return data.models.map(m => m.name)
}

export class OllamaProvider implements AIProvider {
  constructor(_model: string) {}

  async sendMessage(messages: Message[], model: string, systemPrompt: string): Promise<string> {
    let res: Response
    try {
      res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model,
          stream: false,
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
      })
    } catch {
      throw new Error('Ollama is not reachable at localhost:11434 — is Ollama running?')
    }
    if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}`)
    const data = await res.json() as { message: { content: string } }
    const text = data.message?.content
    if (!text) throw new Error('Ollama returned no content')
    return text
  }
}

import { getEntry } from '../db/codex'
import type { Scene } from '../db/types'

interface TipTapNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
}

export function extractMentionedEntryIds(contentJson: string): number[] {
  try {
    const doc = JSON.parse(contentJson) as TipTapNode
    const ids = new Set<number>()
    function walk(node: TipTapNode) {
      if (node.type === 'codexMention' && node.attrs?.entryId) {
        ids.add(node.attrs.entryId as number)
      }
      node.content?.forEach(walk)
    }
    walk(doc)
    return [...ids]
  } catch {
    return []
  }
}

function docToPlainText(contentJson: string): string {
  try {
    const doc = JSON.parse(contentJson) as TipTapNode
    const parts: string[] = []
    function walk(node: TipTapNode) {
      if (node.type === 'text') {
        parts.push(node.text ?? '')
      } else if (node.type === 'codexMention') {
        parts.push(`@${node.attrs?.label ?? ''}`)
      } else if (node.type === 'hardBreak') {
        parts.push('\n')
      } else {
        const isBlock = ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'codeBlock'].includes(node.type)
        if (isBlock && parts.length > 0) parts.push('\n')
        node.content?.forEach(walk)
        if (isBlock) parts.push('\n')
      }
    }
    walk(doc)
    return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
  } catch {
    return ''
  }
}

export async function assembleWritingSystemPrompt(scene: Scene): Promise<string> {
  const sceneText = scene.content ? docToPlainText(scene.content) : ''
  const entryIds = scene.content ? extractMentionedEntryIds(scene.content) : []

  let prompt = 'You are a creative writing assistant helping a fantasy fiction author.\nBe concise, match the author\'s style and voice, and write in their established tone.'

  if (scene.title || sceneText) {
    prompt += `\n\n[CURRENT SCENE${scene.title ? `: "${scene.title}"` : ''}]`
    if (sceneText) prompt += `\n${sceneText}`
  }

  if (entryIds.length > 0) {
    const entries = await Promise.all(entryIds.map(id => getEntry(id).catch(() => null)))
    const valid = entries.filter(Boolean)
    if (valid.length > 0) {
      prompt += '\n\n[CODEX ENTITIES IN THIS SCENE]'
      for (const entry of valid) {
        if (!entry) continue
        prompt += `\n• ${entry.title} (${entry.category})`
        if (entry.summary) prompt += `: ${entry.summary}`
      }
    }
  }

  return prompt
}

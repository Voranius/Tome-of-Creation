import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useCodexStore } from '../../store/codexStore'
import { useUIStore } from '../../store/uiStore'

type Category = 'characters' | 'locations' | 'factions' | 'magic' | 'events' | 'items'

export function CodexMentionChip({ node }: NodeViewProps) {
  const entryId = node.attrs.entryId as number
  const label = node.attrs.label as string
  const category = node.attrs.category as Category

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    useCodexStore.getState().selectEntry(entryId)
    useUIStore.getState().navigate('codex')
  }

  return (
    <NodeViewWrapper
      as="span"
      className={`codex-mention codex-mention--${category}`}
      onClick={handleClick}
      contentEditable={false}
    >
      @{label}
    </NodeViewWrapper>
  )
}

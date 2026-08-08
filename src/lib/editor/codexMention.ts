import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import { useCodexStore } from '../../store/codexStore'
import type { CodexEntry } from '../db/types'
import { CodexMentionChip } from '../../components/writing/CodexMentionChip'
import { MentionDropdown } from '../../components/writing/MentionDropdown'
import type { MentionDropdownRef } from '../../components/writing/MentionDropdown'

function positionContainer(
  el: HTMLElement,
  clientRect: (() => DOMRect | null) | null | undefined,
) {
  const rect = clientRect?.()
  if (!rect) return
  const spaceBelow = window.innerHeight - rect.bottom
  if (spaceBelow < 300 && rect.top > 300) {
    el.style.top = `${rect.top - 300}px`
  } else {
    el.style.top = `${rect.bottom + 4}px`
  }
  el.style.left = `${rect.left}px`
}

const CodexMention = Node.create({
  name: 'codexMention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,
  draggable: false,

  addAttributes() {
    return {
      entryId: {
        default: null,
        parseHTML: el => {
          const v = el.getAttribute('data-entry-id')
          return v ? Number(v) : null
        },
        renderHTML: attrs => ({ 'data-entry-id': String(attrs.entryId) }),
      },
      label: {
        default: '',
        parseHTML: el => el.getAttribute('data-label') ?? '',
        renderHTML: attrs => ({ 'data-label': attrs.label }),
      },
      category: {
        default: 'characters',
        parseHTML: el => el.getAttribute('data-category') ?? 'characters',
        renderHTML: attrs => ({ 'data-category': attrs.category }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-codex-mention]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-codex-mention': '',
        class: `codex-mention codex-mention--${HTMLAttributes['data-category'] ?? 'characters'}`,
      }),
      `@${HTMLAttributes['data-label'] ?? ''}`,
    ]
  },

  renderText({ node }) {
    return `@${node.attrs.label as string}`
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodexMentionChip, { as: 'span' })
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<CodexEntry>({
        editor: this.editor,
        char: '@',
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }) => {
          const entries = useCodexStore.getState().entries
          if (!query) return entries.slice(0, 8)
          const q = query.toLowerCase()
          return entries.filter(e => e.title.toLowerCase().includes(q)).slice(0, 8)
        },

        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'codexMention',
              attrs: {
                entryId: props.id,
                label: props.title,
                category: props.category,
              },
            })
            .insertContent({ type: 'text', text: ' ' })
            .run()
        },

        render: () => {
          let renderer: ReactRenderer<MentionDropdownRef>
          let container: HTMLElement

          function cleanup() {
            renderer?.destroy()
            container?.remove()
          }

          return {
            onStart(props: SuggestionProps<CodexEntry>) {
              container = document.createElement('div')
              container.style.cssText = 'position:fixed;z-index:9999;'
              document.body.appendChild(container)

              renderer = new ReactRenderer(MentionDropdown, {
                editor: props.editor,
                props: {
                  items: props.items,
                  command: (entry: CodexEntry) =>
                    props.command(entry),
                },
              })

              container.appendChild(renderer.element)
              positionContainer(container, props.clientRect)
            },

            onUpdate(props: SuggestionProps<CodexEntry>) {
              renderer.updateProps({
                items: props.items,
                command: (entry: CodexEntry) =>
                  props.command(entry),
              })
              positionContainer(container, props.clientRect)
            },

            onKeyDown(props: SuggestionKeyDownProps): boolean {
              if (props.event.key === 'Escape') {
                cleanup()
                return true
              }
              return renderer.ref?.onKeyDown(props.event) ?? false
            },

            onExit() {
              cleanup()
            },
          }
        },
      }),
    ]
  },
})

export default CodexMention

import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import {
  CURATED_FONT_OPTIONS,
  isCuratedFontId,
  type CuratedFontSelectValue,
} from '../../lib/editor/curatedFonts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

export const editorContentShellStyle: React.CSSProperties = {
  width: 'min(100%, var(--editor-content-max-width))',
  margin: '0 auto',
}

export const editorCanvasStyle: React.CSSProperties = {
  width: 'min(100%, var(--editor-canvas-max-width))',
  margin: '0 auto',
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24]
type FontSizeSelectValue = 'default' | `${number}` | 'mixed'

const selectStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  borderRadius: 4,
  color: 'var(--text-dim)',
  fontSize: 11,
  fontFamily: 'inherit',
  padding: '2px 4px',
  cursor: 'pointer',
  height: 24,
}

function normalizeTextStyleValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizeLinkValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function getSelectionTextStyleValue(
  editor: Editor,
  attribute: 'fontKey' | 'fontSize'
): string | null | 'mixed' {
  if (editor.state.selection.empty) {
    const attributes = editor.getAttributes('textStyle') as Record<string, unknown>
    return normalizeTextStyleValue(attributes[attribute])
  }

  const explicitValues = new Set<string>()
  let sawUnstyledText = false
  const { from, to } = editor.state.selection

  editor.state.doc.nodesBetween(from, to, node => {
    if (!node.isText || !node.text || node.text.length === 0) return
    const textStyleMark = node.marks.find(mark => mark.type.name === 'textStyle')
    const value = normalizeTextStyleValue(textStyleMark?.attrs?.[attribute])
    if (value === null) { sawUnstyledText = true; return }
    explicitValues.add(value)
  })

  if (explicitValues.size === 0) return null
  if (explicitValues.size === 1) return explicitValues.values().next().value ?? null
  if (sawUnstyledText) return 'mixed'
  return 'mixed'
}

function getFontFamilySelectValue(editor: Editor): CuratedFontSelectValue {
  const value = getSelectionTextStyleValue(editor, 'fontKey')
  if (value === 'mixed') return 'mixed'
  if (value === null) return 'default'
  return isCuratedFontId(value) ? value : 'mixed'
}

function getFontSizeSelectValue(editor: Editor): FontSizeSelectValue {
  const value = getSelectionTextStyleValue(editor, 'fontSize')
  if (value === 'mixed') return 'mixed'
  if (value === null) return 'default'
  const match = /^(\d+)px$/.exec(value)
  return match ? (match[1] as `${number}`) : 'mixed'
}

function isHeadingSelection(editor: Editor): boolean {
  const { selection } = editor.state
  if (selection.empty) return selection.$from.parent.type.name === 'heading'
  if (selection.$from.parent.type.name === 'heading' || selection.$to.parent.type.name === 'heading') return true
  let hasHeading = false
  editor.state.doc.nodesBetween(selection.from, selection.to, node => {
    if (node.type.name === 'heading') { hasHeading = true; return false }
    return undefined
  })
  return hasHeading
}

function getLinkHref(editor: Editor): string | null {
  const attributes = editor.getAttributes('link') as Record<string, unknown>
  const href = attributes.href
  return typeof href === 'string' && href.length > 0 ? href : null
}

function ToolbarBtn({
  onActivate,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onActivate: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); if (!disabled) onActivate() }}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 4, border: 'none', cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', fontSize: 13,
        background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
        color: disabled ? 'var(--text-muted)' : active ? 'var(--color-gold)' : 'var(--text-dim)',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 100ms, color 100ms, opacity 100ms',
      }}
    >
      {children}
    </button>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 1,
      padding: 4, borderRadius: 8,
      background: 'rgba(240,230,210,0.03)', border: '1px solid var(--border-subtle)',
      flexShrink: 0,
    }}>
      {children}
    </div>
  )
}

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [, setToolbarVersion] = useState(0)
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')

  useEffect(() => {
    if (!editor) return
    const refresh = () => setToolbarVersion(v => v + 1)
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    editor.on('focus', refresh)
    editor.on('blur', refresh)
    return () => {
      editor.off('selectionUpdate', refresh)
      editor.off('transaction', refresh)
      editor.off('focus', refresh)
      editor.off('blur', refresh)
    }
  }, [editor])

  if (!editor) return null

  const activeEditor = editor
  const fontFamilyValue = getFontFamilySelectValue(activeEditor)
  const fontSizeValue = getFontSizeSelectValue(activeEditor)
  const fontControlsDisabled = isHeadingSelection(activeEditor)
  const linkHref = getLinkHref(activeEditor)
  const linkSelectionDisabled = activeEditor.state.selection.empty && !activeEditor.isActive('link')
  const fontControlTitle = fontControlsDisabled
    ? 'Headings use fixed font styles'
    : fontFamilyValue === 'mixed' || fontSizeValue === 'mixed'
      ? 'Selection contains multiple font styles'
      : 'Applies to selected text or new typing'

  function handleLinkPopoverChange(nextOpen: boolean) {
    setIsLinkPopoverOpen(nextOpen)
    if (nextOpen) setLinkDraft(linkHref ?? '')
  }

  function handleFontFamilyChange(value: string) {
    if (value === 'mixed') return
    if (value === 'default') { activeEditor.chain().focus().unsetCuratedFontFamily().run(); return }
    if (isCuratedFontId(value)) activeEditor.chain().focus().setCuratedFontFamily(value).run()
  }

  function handleFontSizeChange(value: string) {
    if (value === 'mixed') return
    if (value === 'default') { activeEditor.chain().focus().unsetFontSize().run(); return }
    activeEditor.chain().focus().setFontSize(`${value}px`).run()
  }

  function handleApplyLink() {
    const normalized = normalizeLinkValue(linkDraft)
    if (!normalized) return
    activeEditor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
    setIsLinkPopoverOpen(false)
  }

  function handleRemoveLink() {
    activeEditor.chain().focus().extendMarkRange('link').unsetLink().run()
    setIsLinkPopoverOpen(false)
  }

  return (
    <div style={{ padding: '10px 48px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      <div style={{ ...editorContentShellStyle, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ToolbarGroup>
          <select
            value={fontFamilyValue}
            onChange={e => handleFontFamilyChange(e.target.value)}
            style={{
              ...selectStyle, width: 152,
              opacity: fontControlsDisabled ? 0.55 : 1,
              color: fontFamilyValue === 'mixed' ? 'var(--text-primary)' : 'var(--text-dim)',
              borderColor: fontFamilyValue === 'mixed' ? 'var(--color-gold-border)' : 'var(--border-subtle)',
            }}
            title={fontControlTitle}
            aria-label="Font family"
            disabled={fontControlsDisabled}
          >
            <option value="default">Default (base)</option>
            {fontFamilyValue === 'mixed' && <option value="mixed">Mixed</option>}
            {CURATED_FONT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={fontSizeValue}
            onChange={e => handleFontSizeChange(e.target.value)}
            style={{
              ...selectStyle, width: 96,
              opacity: fontControlsDisabled ? 0.55 : 1,
              color: fontSizeValue === 'mixed' ? 'var(--text-primary)' : 'var(--text-dim)',
              borderColor: fontSizeValue === 'mixed' ? 'var(--color-gold-border)' : 'var(--border-subtle)',
            }}
            title={fontControlTitle}
            aria-label="Font size"
            disabled={fontControlsDisabled}
          >
            <option value="default">Default</option>
            {fontSizeValue === 'mixed' && <option value="mixed">Mixed</option>}
            {FONT_SIZES.map(s => (
              <option key={s} value={String(s)}>{s}px</option>
            ))}
          </select>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn onActivate={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
            <span style={{ fontSize: 12 }}>¶</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <span style={{ fontWeight: 700, fontSize: 11 }}>H1</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <span style={{ fontWeight: 700, fontSize: 11 }}>H2</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <span style={{ fontWeight: 700, fontSize: 11 }}>H3</span>
          </ToolbarBtn>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (⌘B)">
            <span style={{ fontWeight: 700 }}>B</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (⌘I)">
            <span style={{ fontStyle: 'italic' }}>I</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (⌘U)">
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </ToolbarBtn>
          <Popover open={isLinkPopoverOpen} onOpenChange={handleLinkPopoverChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title={linkSelectionDisabled ? 'Select text to add a link' : 'Add or edit link'}
                disabled={linkSelectionDisabled}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 4, border: 'none',
                  cursor: linkSelectionDisabled ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                  background: activeEditor.isActive('link') || isLinkPopoverOpen ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: linkSelectionDisabled
                    ? 'var(--text-muted)'
                    : activeEditor.isActive('link') || isLinkPopoverOpen
                      ? 'var(--color-gold)'
                      : 'var(--text-dim)',
                  opacity: linkSelectionDisabled ? 0.45 : 1,
                  transition: 'background 100ms, color 100ms, opacity 100ms',
                }}
              >
                <span style={{ fontSize: 12 }}>↗</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={8}
              className="w-80 border-[var(--border-medium)] bg-[var(--color-panel)] p-3 text-[var(--text-primary)] shadow-xl"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)' }} htmlFor="editor-link-url">
                    Link URL
                  </label>
                  <Input
                    id="editor-link-url"
                    autoFocus
                    value={linkDraft}
                    onChange={e => setLinkDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleApplyLink() } }}
                    placeholder="https://example.com"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button type="button" size="sm" onClick={handleApplyLink}>Apply</Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleRemoveLink} disabled={!linkHref}>Remove</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
            <span style={{ fontSize: 14, lineHeight: 1 }}>❝</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <span style={{ fontSize: 12 }}>•≡</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
            <span style={{ fontSize: 11 }}>1.</span>
          </ToolbarBtn>
          <ToolbarBtn onActivate={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
            <span style={{ fontSize: 13 }}>◈</span>
          </ToolbarBtn>
        </ToolbarGroup>
      </div>
    </div>
  )
}

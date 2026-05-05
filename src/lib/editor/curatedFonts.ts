export type CuratedFontId = 'serif' | 'book-serif' | 'sans'
export type CuratedFontSelectValue = 'default' | CuratedFontId | 'mixed'

export interface CuratedFontOption {
  label: string
  value: CuratedFontId
}

export const CURATED_FONT_OPTIONS: CuratedFontOption[] = [
  { label: 'Serif', value: 'serif' },
  { label: 'Book Serif', value: 'book-serif' },
  { label: 'Sans', value: 'sans' },
]

const FONT_STACKS: Record<CuratedFontId, string> = {
  serif: "'Georgia', 'Times New Roman', serif",
  'book-serif': "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Georgia', serif",
  sans: "'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
}

export function isCuratedFontId(value: string | null | undefined): value is CuratedFontId {
  return value === 'serif' || value === 'book-serif' || value === 'sans'
}

export function getCuratedFontStack(fontId: CuratedFontId): string {
  return FONT_STACKS[fontId]
}

export function resolveEditorBaseFontFamily(value: string | null | undefined): string | undefined {
  if (!value || value === 'default') return undefined
  return isCuratedFontId(value) ? getCuratedFontStack(value) : value
}

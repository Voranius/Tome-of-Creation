import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import { Link } from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import CuratedFontFamily from './curatedFontFamily'
import FontSize from './fontSize'

export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  Highlight.configure({ multicolor: false }),
  Typography,
  CharacterCount,
  Link.configure({ openOnClick: false }),
  TextStyle,
  CuratedFontFamily,
  FontSize,
]

export const baseEditorProps = {
  attributes: {
    spellcheck: 'true',
    class: 'tiptap-editor',
  },
}

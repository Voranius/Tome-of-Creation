import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import { Link } from '@tiptap/extension-link'

export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  Highlight.configure({ multicolor: false }),
  Typography,
  CharacterCount,
  Link.configure({ openOnClick: false }),
]

export const baseEditorProps = {
  attributes: {
    spellcheck: 'true',
    class: 'tiptap-editor',
  },
}

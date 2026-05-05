import { Extension } from '@tiptap/core'
import type { CuratedFontId } from './curatedFonts'
import { getCuratedFontStack, isCuratedFontId } from './curatedFonts'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    curatedFontFamily: {
      setCuratedFontFamily: (fontId: CuratedFontId) => ReturnType
      unsetCuratedFontFamily: () => ReturnType
    }
  }
}

const CuratedFontFamily = Extension.create({
  name: 'curatedFontFamily',

  addOptions() {
    return {
      types: ['textStyle'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontKey: {
            default: null,
            parseHTML: element => {
              const value = element.getAttribute('data-font-key')
              return isCuratedFontId(value) ? value : null
            },
            renderHTML: attributes => {
              const fontId = attributes.fontKey

              if (!isCuratedFontId(fontId)) {
                return {}
              }

              return {
                'data-font-key': fontId,
                style: `font-family: ${getCuratedFontStack(fontId)}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setCuratedFontFamily:
        fontId =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontKey: fontId })
            .run(),

      unsetCuratedFontFamily:
        () =>
        ({ chain }) =>
          chain()
            .setMark('textStyle', { fontKey: null })
            .removeEmptyTextStyle()
            .run(),
    }
  },
})

export default CuratedFontFamily

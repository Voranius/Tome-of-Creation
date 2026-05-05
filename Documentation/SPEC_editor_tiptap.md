# TipTap Editor — Phase 6a–6h

## Overview

The TipTap rich text editor is built in 8 incremental sessions. Each session adds a specific layer of functionality. Do not skip ahead — each session builds on the previous.

Read this entire file before starting Session 6a.

---

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Editor framework | TipTap v2 | Most extensible ProseMirror wrapper, excellent TypeScript support |
| Content storage | TipTap JSON (stringified) | Lossless round-trips, easier to query than HTML |
| Shared config | `src/lib/editor/editorConfig.ts` | Writing Screen and Notes Screen share the same base config |
| Autosave | `useAutosave` hook (from Phase 3) | Consistent 1.5s debounce across all editors |
| Spell check v1.0 | Browser built-in (`spellcheck` attribute) | Zero effort, uses OS dictionary, no dependencies |
| Spell check post-v1.0 | LanguageTool | Grammar + style, custom dictionary for fantasy terms, official TipTap extension |
| Word count | `@tiptap/extension-character-count` | Accurate word count, available as `.words()` |

---

## Spell Check Implementation

### v1.0 (shipped)
Enable browser spell check via `editorProps`:

```typescript
const editor = useEditor({
  extensions: [...],
  editorProps: {
    attributes: {
      spellcheck: 'true',
    },
  },
})
```

This uses the OS dictionary. On macOS it underlines misspellings in red. Writers right-click to get suggestions. Zero configuration required.

### Post-v1.0 (planned)
LanguageTool via official TipTap extension:
- Grammar checking beyond spell check
- Style suggestions
- Custom dictionary for fantasy terms (character names, place names, invented words)
- Install: `@tiptap/extension-language-tool`
- Requires LanguageTool server (self-hosted or cloud)

---

## Shared Editor Config

`src/lib/editor/editorConfig.ts` exports the base extensions and props used by both Writing Screen and Notes Screen.

```ts
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Link } from '@tiptap/extension-link';

export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
  Highlight.configure({ multicolor: false }),
  Typography,
  CharacterCount,
  Link.configure({ openOnClick: false }),
];

export const baseEditorProps = {
  attributes: {
    spellcheck: 'true',
    class: 'tiptap-editor',
  },
};
```

Writing Screen adds: `Placeholder.configure({ placeholder: 'Begin your story…' })`  
Notes Screen adds: `Placeholder.configure({ placeholder: 'Start writing…' })`

---

## Session Breakdown

### Session 6a — Base Editor
- Integrate TipTap with `editorConfig.ts`
- Editor renders in Writing Screen content area
- Content loads from `scenes.content` (DB)
- Autosave on every change (1.5s debounce)
- Word count updates in real time
- Spell check enabled (browser built-in)
- Minimal styling: correct font, line height, cursor color (gold)

### Session 6b — Toolbar
- Floating or fixed toolbar (design decision: fixed below scene title input)
- Bold, Italic, Underline, Strikethrough
- Paragraph, H1, H2, H3
- Blockquote
- Bullet list, Ordered list
- Highlight
- All toolbar buttons use shadcn `Button` (ghost variant)
- Active state: gold background tint

### Session 6c — Link Support
- Highlight text → Link button → Popover with URL input
- Links render as gold underlined text
- Click link: opens in system browser (Tauri shell open)
- Remove link button in popover

### Session 6d — @Mention Codex Entities
- Type `@` → Command popover opens
- Fuzzy search codex entries by title
- Color-coded by category in dropdown
- Selected: renders as inline chip (category color, non-editable)
- Chip click: opens Codex entry detail in sidebar or modal
- @Mentions add entry to AI context Layer 3

### Session 6e — AI Suggestions
- "Suggest continuation" — AI generates next paragraph
- "Rephrase selection" — AI rephrases selected text
- All suggestions appear as ghost text or in a side panel
- Apply button: inserts at cursor or replaces selection
- Never auto-applies

### Session 6f — Focus Mode
- Toggle: hides Rail, Outline panel, AI panel
- Center column, max-width ~680px
- Subtle gradient fade at top and bottom of viewport
- Escape or button to exit focus mode

### Session 6g — Scene Notes / Metadata
- Sidebar or bottom panel for scene metadata:
  - POV character (select from Characters codex)
  - Scene summary (plain text, not TipTap)
  - Scene tags
- Data saved to `scenes` table

### Session 6h — Notes Screen Integration
- Apply `editorConfig.ts` to Notes Screen
- Notes screen editor matches Writing Screen editor
- Same toolbar, same extensions, same autosave
- Notes-specific: no POV, no chapter/scene hierarchy

---

## Editor Styling

```css
.tiptap-editor {
  outline: none;
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-primary);
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.tiptap-editor h1 { font-size: 1.8em; color: var(--text-primary); }
.tiptap-editor h2 { font-size: 1.4em; color: var(--text-primary); }
.tiptap-editor h3 { font-size: 1.2em; color: var(--text-dim); }

.tiptap-editor p { margin-bottom: 1em; }

.tiptap-editor blockquote {
  border-left: 3px solid var(--color-gold);
  padding-left: 1rem;
  color: var(--text-dim);
}

/* Gold cursor */
.tiptap-editor .ProseMirror-cursor {
  border-left: 2px solid var(--color-gold);
}

/* Highlighted text */
.tiptap-editor mark {
  background: rgba(201, 168, 76, 0.25);
  color: var(--text-primary);
  border-radius: 2px;
}
```

---

## Content Round-Trips

Content is stored as stringified TipTap JSON:

```ts
// Save
const json = JSON.stringify(editor.getJSON());
await updateScene(sceneId, { content: json });

// Load
const parsed = JSON.parse(scene.content || '{}');
editor.commands.setContent(parsed);
```

If `content` is empty or invalid, `editor.commands.setContent('')` gracefully starts an empty document.

---

## Word Count

```ts
const wordCount = editor.storage.characterCount.words();
```

Displayed in the footer: `{wordCount} words`

Project total word count = sum of `word_count` across all scenes, maintained per-scene in DB.

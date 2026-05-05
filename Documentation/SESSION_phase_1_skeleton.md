# Phase 1 — Project Skeleton: Claude Code Session Prompt

Paste this entire prompt into Claude Code to start Phase 1.

---

## Session Prompt

Read `CLAUDE.md` at the project root before doing anything else. That file contains the full project context, design tokens, tech stack, and critical rules. Do not skip this step.

We are building **Tome of Creation** — an offline-first desktop app for Mac + Windows for fantasy fiction writers. This is Phase 1: Project Skeleton. The Tauri scaffold has already been created (`npm create tauri-app@latest .` was already run). Your job is to wire everything up properly.

### What already exists
- Tauri scaffold (React + TypeScript + Vite) in the project root
- `.git` is initialized
- `CLAUDE.md` at the project root
- `Documentation/` and `Mockups/` folders with spec and mockup files

### Step 1 — Read CLAUDE.md
Read `CLAUDE.md` now. Do not proceed until you have read it.

### Step 2 — Connect GitHub and create .gitignore
The GitHub repo is: `https://github.com/Voranius/Tome-of-Creation`

Run:
```bash
git remote add origin https://github.com/Voranius/Tome-of-Creation.git
git branch -M main
```

Create or update `.gitignore` at the project root. It must include at minimum:
```
node_modules/
dist/
src-tauri/target/
.env
*.env.local
.DS_Store
```

Run `git status` and show me the output. Then **stop and ask me before making any commit**. Do not run `git commit` or `git push` without my explicit confirmation.

### Step 3 — Set up folder structure
Create the following folders (empty, with `.gitkeep` if needed):
```
src/
  components/
    ui/
    layout/
    codex/
    writing/
    planner/
    ai/
  screens/
  store/
  hooks/
  lib/
    ai/
      providers/
    editor/
  styles/
src-tauri/
  src/
    commands/
```

### Step 4 — Install frontend dependencies
```bash
npm install zustand
npm install @tauri-apps/plugin-sql
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-highlight @tiptap/extension-typography @tiptap/extension-placeholder @tiptap/extension-character-count @tiptap/extension-heading @tiptap/extension-blockquote @tiptap/extension-bullet-list @tiptap/extension-ordered-list @tiptap/extension-link
```

Do NOT install `better-sqlite3`. We use `@tauri-apps/plugin-sql` for SQLite access through Tauri.

Do NOT install any icon library (no `lucide-react`, no `heroicons`, no `react-icons`).
Do NOT install any component library other than shadcn/ui (which we set up next).

### Step 5 — Set up Tailwind CSS
Tailwind should already be in the scaffold. Verify it is installed and configured in `vite.config.ts` and `tailwind.config.ts` (or `tailwind.config.js`).

If `tailwind.config.ts` does not exist, create it. The content directive must include:
```js
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]
```

### Step 6 — Set up shadcn/ui
Run the shadcn init:
```bash
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Stone (closest to our warm dark palette)
- CSS variables: Yes

After init, add these components:
```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add tabs
npx shadcn@latest add scroll-area
npx shadcn@latest add select
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add badge
```

### Step 7 — Tauri SQL plugin (Rust side)
Add the plugin to `src-tauri/Cargo.toml`:
```toml
[dependencies]
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

In `src-tauri/src/lib.rs` (or `main.rs`), register the plugin:
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

### Step 8 — Design tokens: `src/styles/tokens.css`
Create `src/styles/tokens.css` with all CSS custom properties from CLAUDE.md:

```css
:root {
  /* Surfaces */
  --color-rail: #141210;
  --color-main: #1c1a16;
  --color-panel: #211e19;

  /* Accent & Borders */
  --color-gold: #c9a84c;
  --border-subtle: rgba(240, 230, 210, 0.08);
  --border-medium: rgba(240, 230, 210, 0.14);

  /* Text */
  --text-primary: rgba(240, 230, 210, 0.9);
  --text-dim: rgba(240, 230, 210, 0.65);
  --text-muted: rgba(240, 230, 210, 0.45);

  /* Category Colors */
  --color-characters: #c9a84c;
  --color-locations: #3d9e8a;
  --color-factions: #4ab3d4;
  --color-magic: #7b5ea7;
  --color-events: #c47a8a;
  --color-items: #c4824a;
  --color-manuscript: #6a9e5a;
}
```

### Step 9 — Design tokens: `src/styles/tokens.ts`
Create `src/styles/tokens.ts` mirroring the CSS variables as TypeScript constants:

```ts
export const tokens = {
  colors: {
    rail: '#141210',
    main: '#1c1a16',
    panel: '#211e19',
    gold: '#c9a84c',
    characters: '#c9a84c',
    locations: '#3d9e8a',
    factions: '#4ab3d4',
    magic: '#7b5ea7',
    events: '#c47a8a',
    items: '#c4824a',
    manuscript: '#6a9e5a',
  },
  borders: {
    subtle: 'rgba(240, 230, 210, 0.08)',
    medium: 'rgba(240, 230, 210, 0.14)',
  },
  text: {
    primary: 'rgba(240, 230, 210, 0.9)',
    dim: 'rgba(240, 230, 210, 0.65)',
    muted: 'rgba(240, 230, 210, 0.45)',
  },
} as const;
```

### Step 10 — Global styles: `src/styles/globals.css`
Create `src/styles/globals.css`. It must:
- Import `tokens.css`
- Set `body` background to `var(--color-main)`
- Set `body` color to `var(--text-primary)`
- Set `font-family` to a system serif stack: `'Georgia', 'Times New Roman', serif` (or a warm system sans-serif — we decide in Phase 2)
- Map shadcn CSS variables to our token values so shadcn components inherit the warm dark palette automatically

```css
@import './tokens.css';
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

:root {
  --background: var(--color-main);
  --foreground: var(--text-primary);
  --primary: var(--color-gold);
  --border: var(--border-subtle);
  --ring: var(--color-gold);
}

body {
  background-color: var(--color-main);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
```

### Step 11 — Wire up `src/main.tsx`
Update `src/main.tsx` to import globals.css:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/globals.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### Step 12 — Blank `src/App.tsx`
Replace the default App.tsx with a minimal placeholder that confirms the app boots:

```tsx
function App() {
  return (
    <div style={{ padding: '2rem', color: 'var(--text-primary)' }}>
      <h1 style={{ color: 'var(--color-gold)' }}>Tome of Creation</h1>
      <p>Phase 1 skeleton running.</p>
    </div>
  );
}

export default App;
```

---

## Verification Checklist

Before reporting done, verify each item:

- [ ] `npm run tauri dev` launches without errors
- [ ] App window opens and shows the Phase 1 placeholder (gold heading + text)
- [ ] `src/styles/tokens.css` exists with all token values
- [ ] `src/styles/tokens.ts` exists with matching TS constants
- [ ] `src/styles/globals.css` exists and is imported in `main.tsx`
- [ ] shadcn components are in `src/components/ui/`
- [ ] All folder structure from Step 3 exists
- [ ] `@tauri-apps/plugin-sql` is in `package.json`
- [ ] `tauri-plugin-sql` is in `src-tauri/Cargo.toml`
- [ ] `.gitignore` includes `src-tauri/target/`
- [ ] No raw hex values in any component file
- [ ] No icon library installed
- [ ] No component library other than shadcn installed

---

## Hard Rules (do not break these)

1. **No icon library.** No `lucide-react`, no `heroicons`, no `react-icons`. We draw icons as inline SVG or use Unicode when needed.
2. **No component library other than shadcn.** No MUI, no Chakra, no Ant Design.
3. **No raw hex values in component files.** Always use CSS variables (`var(--color-gold)`) or token constants from `tokens.ts`.
4. **No UI screens in this phase.** Phase 1 is skeleton only.
5. **No commits without my explicit confirmation.** Show `git status` and propose a commit message, then wait for me to say yes.

---

## Report When Done

When Phase 1 is complete, give me:
1. Confirmation that `npm run tauri dev` runs successfully
2. List of all files created or modified
3. Any decisions you made that weren't specified above
4. Any warnings or issues to address before Phase 2

# Phase 2 — Design System + Component Library: Claude Code Session Prompt

Paste this entire prompt into Claude Code to start Phase 2.

---

## Session Prompt

Read `CLAUDE.md` at the project root before doing anything else. Also open `Mockups/tome_of_creation_full_desktop_mockup.html` in a browser for the visual target — this is what the app should look like when Phase 2 is done.

We are building Phase 2: Design System + Component Library. The goal is the Rail, the app shell, all custom UI atoms, and shadcn components restyled to match the warm dark tokens. No screens, no data, no business logic — just the visual building blocks.

---

## Step 1 — Install shadcn components

Run these one at a time:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add tabs
npx shadcn@latest add scroll-area
npx shadcn@latest add select
```

After installing, verify every component file landed in `src/components/ui/`.

---

## Step 2 — Create the folder structure

Create these folders and placeholder screen files:

```
src/
  components/
    ui/          ← shadcn + custom atoms live here together
    layout/      ← Rail, Panel, TopBar
    codex/       ← empty for now
    writing/     ← empty for now
    planner/     ← empty for now
    ai/          ← empty for now
  screens/
    WritingScreen.tsx
    CodexScreen.tsx
    SeriesPlannerScreen.tsx
    LoomScreen.tsx
    NotesScreen.tsx
    SearchScreen.tsx
    SettingsScreen.tsx
  store/
  hooks/
  lib/
    ai/
      providers/
    editor/
```

Each placeholder screen returns a single `<div>` showing its name in `var(--text-primary)` — nothing else.

---

## Step 3 — Build `Rail` (`src/components/layout/Rail.tsx`)

The Rail is the 52px-wide left navigation strip. Always visible.

```
width: 52px
background: var(--color-rail)
border-right: 1px solid var(--border-subtle)
display: flex, flex-direction: column, align-items: center
padding: 12px 0
```

Props: `activeScreen: Screen`, `onNavigate: (screen: Screen) => void`

**Top group (writing tools):**
- Writing — quill/pen icon
- Codex — open book icon
- Series Planner — calendar/grid icon

**Bottom group (pushed down with `flex: 1` spacer):**
- The Loom — chat bubble icon
- Notes — document icon
- Search — magnifier icon
- Settings — gear icon

Each button:
```
width: 36px, height: 36px
border-radius: 8px
background: transparent (default) → rgba(201,168,76,0.1) (active)
color: var(--text-dim) (default) → var(--color-gold) (active)
border: none
transition: background 150ms
```

**All icons are inline SVG only — no icon library.** Use 18×18 SVG, `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`. Add a `title` attribute to each button.

---

## Step 4 — Build `Panel` (`src/components/layout/Panel.tsx`)

Generic side panel wrapper. Props: `width?: number` (default 260), `children`, `className?`.

```tsx
<aside style={{
  width,
  background: 'var(--color-panel)',
  borderRight: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%'
}}>
  {children}
</aside>
```

---

## Step 5 — Build `TopBar` (`src/components/layout/TopBar.tsx`)

Optional top bar. Props: `title?: string`, `actions?: React.ReactNode`.

```
height: 48px
border-bottom: 1px solid var(--border-subtle)
padding: 0 20px
display: flex, align-items: center, justify-content: space-between
```

---

## Step 6 — Build `CategoryChip` (`src/components/ui/CategoryChip.tsx`)

```tsx
type Category = 'characters' | 'locations' | 'factions' | 'magic' | 'events' | 'items' | 'manuscript'

interface CategoryChipProps {
  category: Category
  label: string
  size?: 'sm' | 'md'
}
```

Visual: 6px colored dot + label, pill shape. Background is a 8% tint of the category color, border is 20% tint.

Use `var(--color-characters)` etc. — never raw hex. Build a `CATEGORY_CSS_VAR` map:

```ts
const CATEGORY_CSS_VAR: Record<Category, string> = {
  characters: 'var(--color-characters)',
  locations:  'var(--color-locations)',
  factions:   'var(--color-factions)',
  magic:      'var(--color-magic)',
  events:     'var(--color-events)',
  items:      'var(--color-items)',
  manuscript: 'var(--color-manuscript)',
}
```

Since CSS variables can't be used inside `rgba()` directly, use inline style with the `color` property set to the CSS variable, and derive background/border as semi-transparent versions using `currentColor` tricks or a small helper that maps category → its known RGB for tint calculation. The dot itself should use the CSS variable directly as `backgroundColor`.

---

## Step 7 — Build `Avatar` (`src/components/ui/Avatar.tsx`)

Initials-based avatar. Props: `name: string`, `size?: number` (default 28), `colorVar?: string` (CSS variable, default `'var(--color-gold)'`).

Extract first letter of first and last word of `name`. Render a circle.

```
border-radius: 50%
font-size: ~40% of size
font-weight: 600
background: rgba version of the color at 15% opacity
border: 1px solid rgba version at 30%
```

---

## Step 8 — Build `AIButton` (`src/components/ui/AIButton.tsx`)

Props: `onClick: () => void`, `isOpen?: boolean`, `disabled?: boolean`

Inline SVG lightning bolt icon + "AI" label.

Default state:
```
border: 1px solid var(--border-medium)
color: var(--text-dim)
background: transparent
border-radius: 6px
padding: 5px 10px
font-size: 12px
```

Active (`isOpen = true`):
```
border-color: var(--color-gold)
color: var(--color-gold)
background: var(--color-gold-bg)
```

Disabled: `color: var(--text-muted)`, no pointer events, shows native `title` tooltip: `"AI features need an API key — Set up in Settings →"`

---

## Step 9 — Restyle shadcn components

Edit each shadcn file in `src/components/ui/` to use our tokens. **No raw hex values.**

**Button:**
- Primary: `bg-gold text-rail` (using Tailwind token classes), hover: 85% opacity
- Ghost: transparent, `color: var(--text-dim)`, hover: `rgba(240,230,210,0.08)`
- Outline: `border: var(--border-medium)`, `color: var(--text-dim)`

**Input:**
- `background: rgba(240,230,210,0.05)`
- `border: 1px solid var(--border-subtle)`
- Focus: `border-color: var(--color-gold-border-focus)`, no box-shadow ring

**Dialog:**
- Overlay: `background: rgba(0,0,0,0.65)`, `backdrop-filter: blur(2px)`
- Content: `background: var(--color-panel)`, `border: 1px solid var(--border-medium)`, `border-radius: 12px`

**Tooltip:**
- `background: var(--color-panel)`, `border: 1px solid var(--border-medium)`, `color: var(--text-primary)`

**DropdownMenu:**
- Content: `background: var(--color-panel)`, `border: 1px solid var(--border-medium)`
- Item hover: `background: rgba(240,230,210,0.06)`, `color: var(--text-primary)`

---

## Step 10 — Build `AppShell` and wire `App.tsx`

Create `src/components/layout/AppShell.tsx`:

```tsx
import { useState } from 'react'
import { Rail } from './Rail'
import { WritingScreen } from '../../screens/WritingScreen'
// ... import all placeholder screens

type Screen = 'writing' | 'codex' | 'planner' | 'loom' | 'notes' | 'search' | 'settings'

export function AppShell() {
  const [activeScreen, setActiveScreen] = useState<Screen>('writing')

  const screens: Record<Screen, React.ReactNode> = {
    writing: <WritingScreen />,
    codex: <CodexScreen />,
    planner: <SeriesPlannerScreen />,
    loom: <LoomScreen />,
    notes: <NotesScreen />,
    search: <SearchScreen />,
    settings: <SettingsScreen />,
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Rail activeScreen={activeScreen} onNavigate={setActiveScreen} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', background: 'var(--color-main)' }}>
        {screens[activeScreen]}
      </main>
    </div>
  )
}
```

Update `App.tsx` to render only `<AppShell />`.

---

## Step 11 — Component gallery (dev only)

Add a temporary component gallery somewhere visible (a floating panel, or a toggle in one of the placeholder screens) showing:

- All 7 CategoryChip variants with labels
- Avatar with "Aria Voss"
- AIButton in default + active state
- Button: primary, ghost, outline variants
- One Tooltip example

Label it clearly as "Phase 2 Dev Gallery — remove before Phase 3". This is for visual verification only.

---

## Verification checklist

Before reporting done, confirm:

- [ ] `npm run tauri dev` launches without errors or console warnings
- [ ] Rail renders at 52px wide with all 7 icons
- [ ] Clicking each rail icon switches the active placeholder screen
- [ ] Active icon is gold, inactive icons are dim
- [ ] CategoryChip renders in all 7 category colors
- [ ] shadcn components use warm dark palette (no white backgrounds, no blue focus rings)
- [ ] No raw hex values in any component file
- [ ] No icon library imported anywhere (`lucide-react`, `heroicons`, etc.)
- [ ] TypeScript strict mode — no `any` types introduced
- [ ] `AppShell` is the only thing rendered in `App.tsx`

---

## Hard rules

1. **No icon library.** Inline SVG only.
2. **No raw hex values in component files.** CSS variables or token constants only.
3. **No actual screen content.** Placeholder divs only.
4. **No commits without my confirmation.** Show `git diff --stat` and propose a message, then wait.

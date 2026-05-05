# Design System — Tome of Creation

---

## Design Language

Tome of Creation uses a **warm dark** aesthetic. Think aged parchment, candlelight, and dark wood — not a cold developer tool. Every design decision should reinforce that writers are working in a literary space.

---

## Color Tokens

Defined once in `src/styles/tokens.css`. Never use raw hex values in components.

### Surface Colors

| Token | Value | Usage |
|---|---|---|
| `--color-rail` | `#141210` | Left navigation rail |
| `--color-main` | `#1c1a16` | Main content area background |
| `--color-panel` | `#211e19` | Side panels, secondary areas |

### Accent & Borders

| Token | Value | Usage |
|---|---|---|
| `--color-gold` | `#c9a84c` | Primary accent, active states, headings |
| `--border-subtle` | `rgba(240,230,210,0.08)` | Dividers, non-interactive borders |
| `--border-medium` | `rgba(240,230,210,0.14)` | Panel borders, active area outlines |

### Text

| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `rgba(240,230,210,0.9)` | Body text, headings |
| `--text-dim` | `rgba(240,230,210,0.65)` | Secondary text, labels |
| `--text-muted` | `rgba(240,230,210,0.45)` | Placeholder text, timestamps |

### Category Colors (color-blind safe — never swap)

| Token | Value | Category |
|---|---|---|
| `--color-characters` | `#c9a84c` | Gold |
| `--color-locations` | `#3d9e8a` | Teal |
| `--color-factions` | `#4ab3d4` | Sky cyan |
| `--color-magic` | `#7b5ea7` | Dark violet |
| `--color-events` | `#c47a8a` | Rose |
| `--color-items` | `#c4824a` | Burnt orange |
| `--color-manuscript` | `#6a9e5a` | Green |

---

## Typography

| Use | Size | Weight | Color |
|---|---|---|---|
| Screen headings | 18px | 600 | `--text-primary` |
| Section labels | 11px | 600 uppercase | `--text-muted` |
| Body text | 14px | 400 | `--text-primary` |
| Secondary text | 13px | 400 | `--text-dim` |
| Timestamps / meta | 11px | 400 | `--text-muted` |
| Manuscript title input | 22px | 400 | `--text-primary` |
| Manuscript body | 16px | 400 | `--text-primary` |

Font stack: `system-ui, -apple-system, sans-serif` for UI.  
Manuscript body can use a serif stack for immersion (Phase 6 decision).

---

## Layout

### Rail Navigation
- Width: 52px
- Background: `--color-rail`
- Contains icon-only buttons for screen navigation
- Active screen: gold accent indicator (left border or dot)
- Icons: inline SVG, 20×20px, `--text-dim` default, `--color-gold` active

### Panel Layout Pattern
Most screens follow: `Rail | Panel (fixed width) | Main Content (flex 1)` or `Rail | Main Content | AI Panel`

Standard panel widths:
- Codex list panel: 260px
- Writing outline panel: 240px
- Notes list panel: 256px
- Loom sessions panel: 220px
- Loom context panel: 248px
- AI panel (Writing): 248px
- Settings nav panel: 200px

---

## Component Inventory

### Use shadcn (complex interactive, already installed)
- `Dialog` — modals
- `DropdownMenu` — model selector, action menus
- `Tooltip` — hover labels, no-key tooltip
- `Popover` — inline pickers
- `Command` (cmdk) — Global Search overlay (Cmd+K)
- `Tabs` — Settings nav, filter tabs
- `ScrollArea` — custom scrollbars in panels
- `Select` — dropdowns
- `Button` — standard buttons
- `Input` — text inputs
- `Badge` — count badges

### Build from scratch (too custom for shadcn)
- **Rail** — left navigation strip
- **CategoryChip** — colored chip with category dot + label
- **ChatBubble** — AI message bubble with action buttons
- **AIButton** — the AI activation button
- **Avatar** — initials-based avatar circle
- **BeatTimelineRow** — Series Planner timeline row
- **BookCoverShelf** — book cover grid
- **NoteRow** — note list item with title, meta, excerpt, archive button
- **CodexEntryCard** — codex list item
- **SceneRow** — scene list item in Writing outline

---

## Interaction Patterns

### Hover states
- Background: `rgba(240,230,210,0.04)` (very subtle warm tint)
- Transition: `150ms ease`

### Active / Selected states
- Background: `rgba(240,230,210,0.08)`
- Left border accent (gold, 2px) for list rows
- Or gold text color change for buttons

### Focus states
- Outline: `2px solid var(--color-gold)`
- Offset: `2px`

### Scrollbars (shadcn ScrollArea)
- Track: transparent
- Thumb: `rgba(240,230,210,0.15)`
- Thumb hover: `rgba(240,230,210,0.25)`

---

## CategoryChip Component

Used throughout the app to label Codex entries by category.

```tsx
<CategoryChip category="characters" label="Aria Voss" />
<CategoryChip category="locations" label="The Ashwood" />
```

Visual: colored dot (category color, 6px) + label text, pill shape, subtle category-colored background at 10% opacity.

---

## shadcn Theming

All shadcn CSS variables are mapped to our tokens in `globals.css`:

```css
:root {
  --background: var(--color-main);
  --foreground: var(--text-primary);
  --primary: var(--color-gold);
  --primary-foreground: var(--color-main);
  --border: var(--border-subtle);
  --ring: var(--color-gold);
  --muted: var(--color-panel);
  --muted-foreground: var(--text-muted);
}
```

Never override shadcn defaults with raw hex values — always update the token mapping.

---

## Tailwind Config

`tailwind.config.ts` must map all tokens to Tailwind utilities:

```ts
theme: {
  extend: {
    colors: {
      rail: 'var(--color-rail)',
      main: 'var(--color-main)',
      panel: 'var(--color-panel)',
      gold: 'var(--color-gold)',
      characters: 'var(--color-characters)',
      locations: 'var(--color-locations)',
      factions: 'var(--color-factions)',
      magic: 'var(--color-magic)',
      events: 'var(--color-events)',
      items: 'var(--color-items)',
      manuscript: 'var(--color-manuscript)',
    },
  },
}
```

This enables classes like `bg-gold`, `text-locations`, `border-panel` without arbitrary values.

---

## Icons

No icon library. All icons are inline SVG.  
Size standard: 20×20px for navigation, 16×16px for inline/UI actions.  
Color: inherit from parent or explicit CSS variable.

---

## Animation

Keep animations minimal and purposeful.

| Interaction | Duration | Easing |
|---|---|---|
| Panel slide | 200ms | ease-out |
| Hover state | 150ms | ease |
| Modal open | 150ms | ease-out |
| Tooltip appear | 100ms | ease |
| Loading pulse | 1.5s | ease-in-out infinite |

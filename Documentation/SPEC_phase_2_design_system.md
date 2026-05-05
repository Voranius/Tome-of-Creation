# Phase 2 — Design System + Component Library

## Goal

Build all reusable UI atoms, layout components, and the Rail navigation. After this phase, every screen in the app can be assembled from these building blocks.

## Success Criteria

- Rail renders on screen with navigation icons
- All custom components render correctly with warm dark tokens
- shadcn components are restyled to match the design system
- CategoryChip renders in all 6 category colors
- Storybook-style test page shows all components (or simple dev test page)

## Components to Build

### Layout
- **Rail** (`src/components/layout/Rail.tsx`) — 52px left navigation, icon buttons, active gold indicator
- **TopBar** (`src/components/layout/TopBar.tsx`) — optional top bar for screen title + actions
- **Panel** (`src/components/layout/Panel.tsx`) — generic side panel wrapper with scroll

### Atoms (custom)
- **CategoryChip** (`src/components/ui/CategoryChip.tsx`) — colored dot + label, pill shape
- **Avatar** (`src/components/ui/Avatar.tsx`) — initials circle, configurable size + color
- **AIButton** (`src/components/ui/AIButton.tsx`) — AI activation button with sparkle icon

### Restyled shadcn
All installed shadcn components must be restyled to match tokens. Verify:
- `Button` — primary variant uses gold, ghost variant is subtle
- `Input` — dark background, gold focus ring
- `Dialog` — dark overlay, panel background
- `DropdownMenu` — panel background, gold hover
- `Tooltip` — dark tooltip, readable text
- `Badge` — category-colored variants

## App Shell

Build the outer app shell:
- `src/App.tsx` updated to render `<AppShell>`
- `AppShell` contains: Rail (left) + content area (flex 1)
- Content area renders the active screen (placeholder for now)
- Screens can be toggled via Rail navigation icons

## Rail Navigation Items

| Icon | Screen | Rail position |
|---|---|---|
| Quill/pen | Writing | Top |
| Book/codex | Codex | Top |
| Map/planner | Series Planner | Top |
| Chat/loom | The Loom | Bottom |
| Note | Notes | Bottom |
| Search | Global Search | Bottom |
| Gear | Settings | Bottom |

## Feeds Into

Phase 3: Database schema + `.tome` file layer

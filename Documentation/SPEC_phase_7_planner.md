# Phase 7 — Series Planner

## Goal

Build the Series Planner screen — a visual arc planner where writers map out multi-book story structures with beats on a timeline.

## Reference Mockup

`Mockups/tome_series_planner_v2.html`

## Screen Layout

```
Rail (52px) | Planner Content (flex 1)
```

No side panel — the planner is full-width to give the timeline room.

## Core Concepts

### Books
Each book in the series gets a horizontal row on the timeline.  
A "Series" row at the top spans all books for series-wide beats.

### Beats
A beat is a story event positioned on the timeline.  
Position: `0.0` (start of book) to `1.0` (end of book).  
Color: assigned per beat (or defaults to category color).  
Beat types: Inciting Incident, Plot Point 1, Midpoint, Plot Point 2, Dark Night, Climax, Resolution, Custom.

## Timeline Area

Horizontal timeline per book row:
- Book title label (left, fixed width ~120px)
- Timeline track (flex 1)
- Beat markers on the track at their `position` value
- Beat markers are draggable along the track
- Beat markers show title on hover (Tooltip)
- Click beat to open beat detail panel

### Beat Marker
- Colored circle (16px) with beat type icon or number
- Tooltip: beat title + beat type
- Drag to reposition (updates `position` in DB)
- Right-click or ⋮ button: edit / delete

### Add Beat
- Click anywhere on a track → "Add beat here" popover
- Beat type selector + title input
- Creates beat at clicked position

## Beat Detail Panel

Right panel (300px) slides in when a beat is selected:
- Beat title (editable)
- Beat type (Select)
- Description (plain textarea)
- Color picker
- "Link to scene" — connect beat to a specific scene in the manuscript
- Delete button

## Book Header Controls

Above each book row:
- Book title (click to rename)
- Add beat (+) button
- Book color accent

## Series Row

Top row, spans all book timelines.  
Shows series-wide beats (book_id = NULL in DB).  
Useful for: series arc midpoint, series climax, recurring villain appearances.

## Zoom + Pan

Horizontal zoom slider: compress or expand the timeline.  
Pan by scrolling horizontally.

## Connections (Future / Phase 7)

Optional: draw lines between beats across books to show cause-and-effect or recurring character arcs.  
Not required for v1.0 — use placeholder for now.

## Zustand Store

`plannerStore` (`src/store/plannerStore.ts`):
```ts
interface PlannerState {
  beats: SeriesBeat[];
  selectedBeatId: number | null;
  isDetailPanelOpen: boolean;
  zoom: number;  // 1.0 = default
}
```

## DB Queries

From `src/lib/db/planner.ts`:
- `getBeats(bookId?: number): Promise<SeriesBeat[]>`
- `createBeat(data: NewSeriesBeat): Promise<SeriesBeat>`
- `updateBeat(id: number, data: Partial<SeriesBeat>): Promise<void>`
- `deleteBeat(id: number): Promise<void>`
- `reorderBeat(id: number, position: number): Promise<void>`

## Feeds Into

Phase 8: AI Rules screen (independent — can be built in any order after Phase 5)

# Phase 8 — AI Rules Screen

## Goal

Build the AI Rules screen where writers define the rules that govern AI behavior across their entire project. These rules are always included in every AI interaction as Layer 1 context.

## Reference Mockup

`Mockups/tome_ai_rules_mockup.html`

## Screen Layout

```
Rail (52px) | AI Rules Content (flex 1, two columns)
```

Left column: World Summary  
Right column: Category Rules

## World Summary (Left Column)

A large plain text area where the writer summarizes their world for the AI.  
No TipTap — just a `<textarea>` or simple contenteditable.  
Saved to `world_summary` table (single row).  
Autosaves on change (1.5s debounce).

Label: "World Summary"  
Placeholder: "Describe your world — its tone, rules, history, and anything the AI should always know…"

Helper text below: "This text is always included at the start of every AI conversation."

## Category Rules (Right Column)

One expandable section per Codex category + a "Global" section.

Categories: Global | Characters | Locations | Factions | Magic | Events | Items

Each section:
- Header: category name + color chip + expand/collapse
- List of rule rows (from `ai_rules` table for this category)
- "Add rule" button at bottom of section

### Rule Row
- Rule text (editable inline — click to edit)
- Drag handle (left) for reordering
- Delete button (right, hover to reveal)
- Saves to `ai_rules` table on blur

### Add Rule
Clicking "Add rule" appends a new empty rule row in edit mode.  
Tab or Enter to confirm.  
Escape to cancel (removes if empty).

## Global Rules Section

Same structure as category rules.  
These apply to every AI interaction regardless of what category is being worked on.

Example global rules a writer might add:
- "Always write in third person limited"
- "Avoid anachronistic language"
- "The magic system has hard rules — never invent new magic without asking"

## AI Rules in Context (How They're Used)

When building the AI system prompt in `contextAssembler.ts`:

```ts
// Fetch rules grouped by category
const rules = await getRulesGroupedByCategory();
const worldSummary = await getWorldSummary();

let systemPrompt = '[WORLD RULES]\n';
for (const [category, categoryRules] of Object.entries(rules)) {
  if (categoryRules.length > 0) {
    systemPrompt += `\n${category.toUpperCase()}:\n`;
    categoryRules.forEach(rule => {
      systemPrompt += `- ${rule.rule_text}\n`;
    });
  }
}

systemPrompt += `\n[WORLD SUMMARY]\n${worldSummary}`;
```

## Zustand Store

`aiStore` gains rules state:
```ts
interface AIState {
  rules: AIRule[];
  worldSummary: string;
  isLoadingRules: boolean;
}
```

## DB Queries

From `src/lib/db/aiRules.ts`:
- `getRules(category?: string): Promise<AIRule[]>`
- `getRulesGroupedByCategory(): Promise<Record<string, AIRule[]>>`
- `createRule(category: string, text: string): Promise<AIRule>`
- `updateRule(id: number, text: string): Promise<void>`
- `deleteRule(id: number): Promise<void>`
- `reorderRules(ruleIds: number[]): Promise<void>`
- `getWorldSummary(): Promise<string>`
- `updateWorldSummary(content: string): Promise<void>`

## Feeds Into

Phase 9: The Loom (uses AI Rules as Layer 1 context)

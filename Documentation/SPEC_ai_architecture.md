# AI Architecture — Tome of Creation

---

## Core Principle

AI is an assistant, never an author. Every AI-generated suggestion must be explicitly accepted by the writer via an **Apply** button. The AI never auto-inserts content.

The app must be fully functional without any AI key configured. AI-gated features show a tooltip: `"AI features need an API key — Set up in Settings →"` when clicked without a key. The app never crashes or shows a broken state.

---

## Unified Provider Interface

All AI providers implement a single TypeScript interface:

```ts
interface AIProvider {
  sendMessage(
    messages: Message[],
    model: string,
    systemPrompt: string
  ): Promise<string>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
```

Provider implementations live in `src/lib/ai/providers/`:
- `openai.ts` — OpenAI (GPT-4o, etc.)
- `anthropic.ts` — Anthropic (Claude)
- `gemini.ts` — Google Gemini
- `ollama.ts` — Ollama (local models)

---

## API Key Storage

API keys are stored in **Tauri's secure local storage only**.

- Never stored in `.tome` files
- Never logged to console
- Never sent anywhere except the target provider's API
- Retrieved via Tauri's `@tauri-apps/plugin-store` or OS keychain integration

---

## Three-Layer Context System

Every AI call assembles context in three layers, from most global to most specific:

### Layer 1 — Global Context (always included)
- **AI Rules:** All rules defined in the AI Rules screen, grouped by category
- **World Summary:** The writer's freeform world summary from the AI Rules screen

This layer is never omitted. It ensures every AI response is grounded in the writer's world.

### Layer 2 — Current Document Context
- For Writing Screen: the current chapter title + all scene content in the chapter (or just the current scene, configurable)
- For The Loom: the current session's full message history
- For Notes: the current note content

### Layer 3 — Entity Context (dynamic)
- **Pinned Codex entries:** Entries the writer has pinned to the current context
- **@mentioned entities:** Any Codex entry the writer types `@EntityName` in their message
- **Auto-surfaced entries:** Codex entries whose titles appear in the current scene (optional, configurable)

---

## Context Assembly

Context is assembled in `src/lib/ai/contextAssembler.ts`:

```ts
interface AssembledContext {
  systemPrompt: string;
  messages: Message[];
}

async function assembleContext(params: {
  layer2: string;
  pinnedEntries: CodexEntry[];
  mentionedEntries: CodexEntry[];
  conversationHistory?: Message[];
}): Promise<AssembledContext>
```

The system prompt is built as:

```
[WORLD RULES]
{ai_rules grouped by category}

[WORLD SUMMARY]
{world_summary.content}

[CODEX — RELEVANT ENTRIES]
{each pinned/mentioned entry: title, category, summary}

[CURRENT CONTEXT]
{layer2 content}
```

---

## @Mention System

In any AI input field, typing `@` opens a Codex entry picker (Command-style popover).

- Fuzzy-searches `codex_entries` by title
- Filtered by category with color-coded chips
- Selected entries are added to Layer 3 context for that message
- @Mentioned entries appear as color-coded chips in the input and context panel

---

## The Loom Context Panel

The Loom's context panel shows the writer *what* is in context, without technical implementation details like token counts.

Sections:
1. **Always in context** — A single compact gold-tinted tag: "AI Rules · World Summary"
2. **Pinned conversations** — Other Loom sessions pinned for reference (session icon + title + remove button)
3. **Pinned Codex entries** — Chips color-coded by category with a remove button
4. **Mentioned this session** — Auto-populated chips from @mentions in the current session

Footer hint: *"Pinned entries and conversations stay in the AI's memory for this session."*

No token meter. No token counts. This is a deliberate design decision — token budgets are an implementation detail, not a writer concern.

---

## Writing Screen AI Panel

Right panel (248px) that slides open when the writer activates AI mode.

Components:
- **AI Button (AIButton):** Opens the AI panel, shows current model
- **Chat area:** Scrollable message history (ChatBubble components)
- **Input bar:** Text input + Send button
- **Apply Button:** Appears on AI response bubbles — inserts content at cursor, never auto-applies
- **Context chips:** Shows which Codex entries are in context

---

## Model Selector

`DropdownMenu` in the AI panel header. Shows available models for the configured provider.

Model list is fetched from the provider at runtime (not hardcoded) where the provider's API supports it. For Ollama, fetches locally installed models.

---

## No-Key State

When an AI button is clicked and no API key is configured:
1. Show a `Tooltip` (shadcn) with message: `"AI features need an API key — Set up in Settings →"`
2. The tooltip appears anchored to the clicked button
3. Clicking "Settings →" navigates to the Settings screen
4. The app never shows a broken/loading/error state for missing keys — only this tooltip

---

## Streaming

AI responses stream token by token where the provider supports it. The ChatBubble component renders content incrementally. A subtle blinking cursor shows the stream is in progress.

Streaming is implemented via provider-specific streaming APIs. The `AIProvider` interface may be extended with an optional `streamMessage()` method.

---

## Error Handling

- Network errors: Show inline error in the chat bubble with a Retry button
- Invalid API key: Show clear error message with link to Settings
- Rate limiting: Show message with estimated wait time if available
- Context too long: Show warning — never silently truncate (truncation would produce bad results without the writer knowing why)

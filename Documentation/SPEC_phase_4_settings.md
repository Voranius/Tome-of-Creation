# Phase 4 — Settings Screen + AI Provider Connections

## Goal

Build the Settings screen where writers configure their AI providers and app preferences. After this phase, API keys can be entered and validated, and the app knows which AI provider to use.

## Reference Mockup

`Mockups/tome_settings_mockup.html`

## Screen Layout

```
Rail (52px) | Settings Nav Panel (200px) | Settings Content (flex 1)
```

Settings Nav Panel: vertical list of sections using shadcn `Tabs` (vertical orientation):
- AI Providers
- Appearance
- Editor
- About

## AI Providers Section

The most important section. Allows connecting one or more AI providers.

### Provider Cards

Each supported provider has a card:
- **OpenAI** (GPT-4o, GPT-4o mini, etc.)
- **Anthropic** (Claude Opus, Claude Sonnet, etc.)
- **Google Gemini** (Gemini Pro, etc.)
- **Ollama** (local, shows locally installed models)

Each card shows:
- Provider logo/name
- Status: "Connected" (green dot) / "Not connected" (muted)
- API key input (masked, `type="password"`) with Show/Hide toggle
- "Test connection" button
- Model selector (shadcn `Select`) — shown only when connected

### API Key Storage

Keys are stored via Tauri secure store:
```ts
import { Store } from '@tauri-apps/plugin-store';

const store = new Store('.settings.dat');
await store.set('openai_key', apiKey);
await store.save();
```

Keys are NEVER stored in `project.db` or `.tome` files.  
Keys are NEVER logged to console.

### Test Connection

"Test connection" button sends a minimal API request to verify the key works. Shows:
- Loading spinner while testing
- "✓ Connected" on success
- "✗ Invalid key" or error message on failure

### Default Provider

A `Select` at the top of AI Providers section: "Default AI provider". This is what the AI panel and Loom will use by default.

## Appearance Section

- Font size: slider (12px – 20px, default 16px)
- (Future: theme selection — only dark mode for v1.0)

## Editor Section

- Autosave interval: `Select` with options (500ms / 1s / 2s / 5s), default 1.5s
- Spell check: toggle (on by default, uses browser built-in)
- (Future: LanguageTool integration)

## About Section

- App version
- GitHub link
- "Open project folder" button (reveals `.tome` file in Finder/Explorer)

## Zustand Store Updates

`settingsStore` gains:
```ts
interface SettingsState {
  defaultProvider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | null;
  connectedProviders: string[];
  fontSize: number;
  spellCheck: boolean;
  autosaveIntervalMs: number;
}
```

## No-Key Tooltip

Implemented in Phase 4 (so it's ready before Phase 5 needs it):

```tsx
<NoAIKeyTooltip>
  <AIButton onClick={handleAIClick} />
</NoAIKeyTooltip>
```

When no provider is connected, `NoAIKeyTooltip` wraps AI buttons and shows:
`"AI features need an API key — Set up in Settings →"`

The "Settings →" text is a clickable link that navigates to the Settings screen.

## Feeds Into

Phase 5: Codex screen (needs AI button + no-key tooltip)

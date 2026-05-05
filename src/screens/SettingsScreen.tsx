import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAIStore } from '../store/aiStore'
import { useSettingsStore } from '../store/settingsStore'
import { testOpenAI } from '../lib/ai/providers/openai'
import { testAnthropic } from '../lib/ai/providers/anthropic'
import { testGemini } from '../lib/ai/providers/gemini'
import { testOllama } from '../lib/ai/providers/ollama'
import { PROVIDER_LABELS, PROVIDER_MODELS } from '../lib/ai/types'
import type { ProviderKey } from '../lib/ai/types'

type Section = 'ai' | 'appearance' | 'editor' | 'about'
type TestStatus = 'idle' | 'testing' | 'success' | 'error'

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'ai', label: 'AI Providers' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'editor', label: 'Editor' },
  { id: 'about', label: 'About' },
]

const PROVIDERS: ProviderKey[] = ['openai', 'anthropic', 'gemini', 'ollama']

const PROVIDER_COLORS: Record<ProviderKey, { bg: string; fg: string; letter: string }> = {
  openai:    { bg: 'rgba(16,163,127,0.15)',  fg: '#10a37f', letter: 'O' },
  anthropic: { bg: 'rgba(210,125,75,0.15)',  fg: '#d27d4b', letter: 'A' },
  gemini:    { bg: 'rgba(66,133,244,0.15)',  fg: '#4285f4', letter: 'G' },
  ollama:    { bg: 'rgba(240,230,210,0.08)', fg: 'var(--text-dim)', letter: 'O' },
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function ProviderCard({ provider }: { provider: ProviderKey }) {
  const {
    connectedProviders, selectedModels, ollamaModels,
    setConnected, setSelectedModel, setOllamaModels,
    saveKey, getKey: storeGetKey,
  } = useAIStore()
  const isConnected = connectedProviders.includes(provider)
  const colors = PROVIDER_COLORS[provider]
  const label = PROVIDER_LABELS[provider]

  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(false)

  useEffect(() => {
    storeGetKey(provider).then(k => {
      if (k) {
        setHasSavedKey(true)
        setConnected(provider, true)
      }
    })
  }, [provider])

  async function handleTest() {
    const key = keyInput || (await storeGetKey(provider)) || ''
    setTestStatus('testing')
    setErrorMsg('')
    try {
      if (provider === 'openai') {
        await testOpenAI(key)
      } else if (provider === 'anthropic') {
        await testAnthropic(key)
      } else if (provider === 'gemini') {
        await testGemini(key)
      } else {
        const models = await testOllama()
        setOllamaModels(models)
        if (models.length > 0 && !selectedModels.ollama) {
          setSelectedModel('ollama', models[0])
        }
      }

      if (keyInput && provider !== 'ollama') {
        await saveKey(provider, keyInput)
        setHasSavedKey(true)
        setKeyInput('')
      } else {
        setConnected(provider, true)
      }

      setTestStatus('success')
    } catch (e) {
      setTestStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Connection failed')
      if (provider !== 'ollama') setConnected(provider, false)
    }
  }

  const models = provider === 'ollama' ? ollamaModels : PROVIDER_MODELS[provider]
  const currentModel = selectedModels[provider]

  const displayValue = (): string => {
    if (showKey) return keyInput
    if (keyInput) return keyInput
    if (hasSavedKey) return '•'.repeat(32)
    return ''
  }

  return (
    <div style={{
      background: 'var(--color-panel)',
      border: `1px solid ${isConnected ? 'rgba(106,158,90,0.25)' : 'var(--border-subtle)'}`,
      borderRadius: 10,
      padding: '16px 18px',
      marginBottom: 12,
      transition: 'border-color 150ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: colors.bg, color: colors.fg,
            fontSize: 13, fontWeight: 700,
          }}>
            {colors.letter}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isConnected ? '#6a9e5a' : 'var(--text-muted)',
          }} />
          <span style={{ color: isConnected ? '#6a9e5a' : 'var(--text-muted)' }}>
            {provider === 'ollama'
              ? (isConnected ? 'Running' : 'Not running')
              : (isConnected ? 'Connected' : 'Not connected')}
          </span>
        </div>
      </div>

      {provider === 'ollama' ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          Run Ollama locally and Tome will detect it automatically at localhost:11434.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={displayValue()}
            onChange={e => setKeyInput(e.target.value)}
            placeholder={
              provider === 'openai' ? 'sk-proj-…'
              : provider === 'anthropic' ? 'sk-ant-api03-…'
              : 'AIzaSy…'
            }
            onFocus={() => { if (hasSavedKey && !keyInput) setKeyInput('') }}
            style={{
              flex: 1,
              background: 'rgba(240,230,210,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 13,
              padding: '7px 10px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 6,
              color: 'var(--text-muted)',
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            <EyeIcon open={showKey} />
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isConnected && models.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
            <span>Default model:</span>
            <select
              value={currentModel}
              onChange={e => setSelectedModel(provider, e.target.value)}
              style={{
                background: 'rgba(240,230,210,0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
                padding: '5px 8px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : <div />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {testStatus === 'error' && (
            <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{errorMsg}</span>
          )}
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            style={{
              background: 'transparent',
              border: `1px solid ${testStatus === 'success' ? 'rgba(106,158,90,0.5)' : 'var(--border-medium)'}`,
              borderRadius: 6,
              color: testStatus === 'success' ? '#6a9e5a'
                : testStatus === 'testing' ? 'var(--text-muted)'
                : 'var(--text-dim)',
              fontSize: 12,
              padding: '6px 12px',
              cursor: testStatus === 'testing' ? 'default' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            {testStatus === 'testing' ? 'Testing…'
              : testStatus === 'success' ? '✓ Connected'
              : provider === 'ollama' ? 'Detect Ollama'
              : 'Test connection'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AIProvidersSection() {
  const { connectedProviders, defaultProvider, selectedModels, setDefaultProvider } = useAIStore()

  const defaultOptions = connectedProviders.map(p => ({
    value: p,
    label: `${PROVIDER_LABELS[p]} — ${selectedModels[p] || 'default'}`,
  }))

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        AI Providers
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Connect your AI providers to enable writing assistance, worldbuilding chat, and Codex generation.
      </div>

      {PROVIDERS.map(p => <ProviderCard key={p} provider={p} />)}

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '24px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Default AI provider</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Used for writing assistance and The Loom
          </div>
        </div>
        <select
          value={defaultProvider ?? ''}
          onChange={e => setDefaultProvider((e.target.value as ProviderKey) || null)}
          disabled={defaultOptions.length === 0}
          style={{
            background: 'rgba(240,230,210,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            color: defaultOptions.length === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
            fontSize: 13,
            padding: '6px 10px',
            cursor: defaultOptions.length === 0 ? 'default' : 'pointer',
            fontFamily: 'inherit',
            minWidth: 200,
          }}
        >
          {defaultOptions.length === 0
            ? <option value="">No providers connected</option>
            : <>
                <option value="">— Select —</option>
                {defaultOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </>
          }
        </select>
      </div>
    </div>
  )
}

function AppearanceSection() {
  const { fontSize, update } = useSettingsStore()

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        Appearance
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Customize how the app looks.
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Editor font size</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fontSize}px</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>12</span>
          <input
            type="range" min={12} max={20} value={fontSize}
            onChange={e => update('font_size', e.target.value)}
            style={{ width: 120, accentColor: 'var(--color-gold)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>20</span>
        </div>
      </div>

      <div style={{ padding: '12px 0' }}>
        <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Theme</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          Dark mode — additional themes coming in a future update.
        </div>
      </div>
    </div>
  )
}

function EditorSection() {
  const { autosaveIntervalMs, update } = useSettingsStore()
  const [spellCheck, setSpellCheck] = useState(true)

  const AUTOSAVE_OPTIONS = [
    { label: '500ms', value: '500' },
    { label: '1 second', value: '1000' },
    { label: '1.5 seconds', value: '1500' },
    { label: '2 seconds', value: '2000' },
    { label: '5 seconds', value: '5000' },
  ]

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        Editor
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Configure writing editor behavior.
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Autosave interval</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            How often unsaved changes are written to disk
          </div>
        </div>
        <select
          value={String(autosaveIntervalMs)}
          onChange={e => update('autosave_interval_ms', e.target.value)}
          style={{
            background: 'rgba(240,230,210,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '6px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {AUTOSAVE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0',
      }}>
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Spell check</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Uses browser built-in spell check
          </div>
        </div>
        <button
          onClick={() => setSpellCheck(v => !v)}
          role="switch"
          aria-checked={spellCheck}
          style={{
            width: 40, height: 22, borderRadius: 11,
            background: spellCheck ? 'var(--color-gold)' : 'rgba(240,230,210,0.14)',
            border: 'none', cursor: 'pointer', padding: 0,
            position: 'relative', transition: 'background 150ms', flexShrink: 0,
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 3,
            left: spellCheck ? 21 : 3,
            transition: 'left 150ms',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
    </div>
  )
}

function AboutSection() {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
        About
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
        Tome of Creation
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Version</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>0.1.0</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Source code</span>
          <a
            href="https://github.com/Voranius/Tome-of-Creation"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: 'var(--color-gold)', textDecoration: 'none' }}
          >
            GitHub →
          </a>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>Open project folder</span>
          <button
            onClick={() => invoke('save_project').catch(() => {})}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-medium)',
              borderRadius: 6,
              color: 'var(--text-dim)',
              fontSize: 12,
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reveal in Finder
          </button>
        </div>
      </div>
    </div>
  )
}

export function SettingsScreen() {
  const [activeSection, setActiveSection] = useState<Section>('ai')

  const content: Record<Section, React.ReactNode> = {
    ai:         <AIProvidersSection />,
    appearance: <AppearanceSection />,
    editor:     <EditorSection />,
    about:      <AboutSection />,
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <aside style={{
        width: 200,
        background: 'var(--color-panel)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '20px 0',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          padding: '0 16px 12px',
        }}>
          Settings
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: activeSection === item.id ? 'rgba(240,230,210,0.06)' : 'transparent',
              border: 'none',
              borderLeft: `2px solid ${activeSection === item.id ? 'var(--color-gold)' : 'transparent'}`,
              color: activeSection === item.id ? 'var(--color-gold)' : 'var(--text-dim)',
              fontSize: 14, fontFamily: 'inherit',
              padding: '9px 16px', cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {item.label}
          </button>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 700 }}>
        {content[activeSection]}
      </main>
    </div>
  )
}

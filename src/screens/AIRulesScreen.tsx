import { useState, useEffect, useRef, useCallback } from 'react'
import { useAIRulesStore } from '../store/aiRulesStore'
import { useProjectStore } from '../store/projectStore'
import { useAutosave } from '../hooks/useAutosave'
import {
  getWritingStyle,
  saveWritingStyle,
  getExamples,
  createExample,
  updateExample,
  deleteExample,
  getWorldSummary,
  saveWorldSummary,
} from '../lib/db/ai_rules'
import type { AIRule } from '../lib/db/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'writing-style' | 'good-examples' | 'bad-examples' | 'world-rules'

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'writing-style', label: 'Writing Style' },
  { key: 'good-examples', label: 'Good Examples' },
  { key: 'bad-examples', label: 'Bad Examples' },
  { key: 'world-rules', label: 'World Rules' },
]

const TOKEN_CAP = 4000

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

// ─── Section Nav ──────────────────────────────────────────────────────────────

interface SectionNavProps {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  tokensBySection: Record<SectionKey, number>
  totalTokens: number
}

function SectionNav({ active, onSelect, tokensBySection, totalTokens }: SectionNavProps) {
  const pct = Math.min(100, (totalTokens / TOKEN_CAP) * 100)
  const barColor = pct > 80 ? '#c47a8a' : pct > 60 ? '#c9a84c' : '#6a9e5a'

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0 16px',
    }}>
      <div style={{ flex: 1 }}>
        {SECTIONS.map(s => {
          const isActive = s.key === active
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                borderLeft: isActive ? '2px solid var(--color-gold)' : '2px solid transparent',
                padding: '9px 16px 9px 14px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: isActive ? 'var(--text-primary)' : 'var(--text-dim)',
                fontSize: 13,
                fontFamily: 'inherit',
                transition: 'color 100ms',
              }}
            >
              <span>{s.label}</span>
              {tokensBySection[s.key] > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  ~{tokensBySection[s.key]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Context usage */}
      <div style={{
        margin: '12px 12px 0',
        padding: '12px',
        background: 'rgba(240,230,210,0.04)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Context usage
        </div>
        {SECTIONS.map(s => (
          <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{s.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tokensBySection[s.key]}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, height: 4, background: 'rgba(240,230,210,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 300ms' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{totalTokens.toLocaleString()} tokens</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{TOKEN_CAP.toLocaleString()} cap</span>
        </div>
      </div>
    </div>
  )
}

// ─── Example Card ─────────────────────────────────────────────────────────────

function ExampleCard({
  rule,
  accentColor,
  onSave,
  onDelete,
}: {
  rule: AIRule
  accentColor: string
  onSave: (id: number, text: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(rule.rule_text)
  const [hovered, setHovered] = useState(false)

  async function handleBlur() {
    setEditing(false)
    const trimmed = text.trim()
    if (!trimmed || trimmed === rule.rule_text) {
      setText(rule.rule_text)
      return
    }
    try { await onSave(rule.id, trimmed) } catch (err) { console.error(err) }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: 'rgba(240,230,210,0.03)',
        border: '1px solid var(--border-subtle)',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 6,
        padding: '12px 14px',
        marginBottom: 8,
      }}
    >
      {editing ? (
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Escape') { setText(rule.rule_text); setEditing(false) } }}
          style={{
            width: '100%',
            minHeight: 80,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 13,
            lineHeight: 1.6,
            fontStyle: 'italic',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <p style={{
          margin: 0,
          color: 'var(--text-dim)',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 13,
          lineHeight: 1.6,
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
        }}>
          {rule.rule_text}
        </p>
      )}

      {hovered && !editing && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
          <button
            onClick={() => setEditing(true)}
            title="Edit"
            style={{
              width: 24, height: 24, borderRadius: 4, border: 'none',
              background: 'rgba(240,230,210,0.08)', color: 'var(--text-dim)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9l6-6 1.5 1.5-6 6H2V9z" />
              <path d="M7.5 2.5l1.5-1.5 1.5 1.5-1.5 1.5-1.5-1.5z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            title="Delete"
            style={{
              width: 24, height: 24, borderRadius: 4, border: 'none',
              background: 'rgba(196,74,74,0.08)', color: '#c44a4a',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── New Example Input ────────────────────────────────────────────────────────

function NewExampleInput({
  accentColor,
  onSave,
  onCancel,
}: {
  accentColor: string
  onSave: (text: string) => Promise<void>
  onCancel: () => void
}) {
  const [text, setText] = useState('')

  async function handleBlur() {
    const trimmed = text.trim()
    if (!trimmed) { onCancel(); return }
    try { await onSave(trimmed) } catch (err) { console.error(err) }
  }

  return (
    <div style={{
      background: 'rgba(240,230,210,0.03)',
      border: '1px solid var(--border-subtle)',
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 6,
      padding: '12px 14px',
      marginBottom: 8,
    }}>
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === 'Escape') { onCancel() }
          if ((e.key === 'Enter') && (e.metaKey || e.ctrlKey)) { (e.target as HTMLTextAreaElement).blur() }
        }}
        placeholder="Write your example here…"
        style={{
          width: '100%',
          minHeight: 80,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 13,
          lineHeight: 1.6,
          fontStyle: 'italic',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
        Blur or ⌘↵ to save · Escape to cancel
      </div>
    </div>
  )
}

// ─── Example Section ──────────────────────────────────────────────────────────

function ExampleSection({
  type,
  examples,
  accentColor,
  label,
  sectionRef,
}: {
  type: 'good-example' | 'bad-example'
  examples: AIRule[]
  accentColor: string
  label: string
  sectionRef: React.RefObject<HTMLElement | null>
}) {
  const { addExample, updateExampleInStore, deleteExampleFromStore } = useAIRulesStore()
  const [addingNew, setAddingNew] = useState(false)

  async function handleSaveNew(text: string) {
    const rule = await createExample(type, text)
    addExample(rule)
    setAddingNew(false)
  }

  async function handleSave(id: number, text: string) {
    await updateExample(id, text)
    updateExampleInStore(id, text)
  }

  async function handleDelete(id: number) {
    await deleteExample(id)
    deleteExampleFromStore(id)
  }

  const description = type === 'good-example'
    ? 'Prose the AI should emulate — lean on, stylistically.'
    : 'Prose the AI should avoid — patterns to stay away from.'

  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</h2>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', paddingLeft: 18 }}>{description}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        {examples.map(rule => (
          <ExampleCard
            key={rule.id}
            rule={rule}
            accentColor={accentColor}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}

        {addingNew && (
          <NewExampleInput
            accentColor={accentColor}
            onSave={handleSaveNew}
            onCancel={() => setAddingNew(false)}
          />
        )}

        {!addingNew && (
          <button
            onClick={() => setAddingNew(true)}
            style={{
              width: '100%',
              padding: '10px 0',
              border: `1px dashed ${accentColor}33`,
              borderRadius: 6,
              background: 'none',
              color: accentColor,
              fontSize: 12,
              fontFamily: 'inherit',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            + Add {type === 'good-example' ? 'good' : 'bad'} example
          </button>
        )}
      </div>
    </section>
  )
}

// ─── Textarea Section ─────────────────────────────────────────────────────────

function TextareaSection({
  title,
  description,
  placeholder,
  value,
  onChange,
  sectionRef,
  saveStatus,
}: {
  title: string
  description: string
  placeholder: string
  value: string
  onChange: (text: string) => void
  sectionRef: React.RefObject<HTMLElement | null>
  saveStatus: string
}) {
  return (
    <section ref={sectionRef as React.RefObject<HTMLElement>} style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h2>
        {saveStatus === 'saving' && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Saving…</span>
        )}
        {saveStatus === 'saved' && (
          <span style={{ fontSize: 10, color: '#6a9e5a' }}>Saved</span>
        )}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-muted)' }}>{description}</p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight: 160,
          background: 'rgba(240,230,210,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 8,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          fontSize: 13,
          lineHeight: 1.7,
          padding: '14px 16px',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      />
    </section>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function AIRulesScreen() {
  const {
    writingStyle, goodExamples, badExamples, worldSummary,
    setWritingStyle, setGoodExamples, setBadExamples, setWorldSummary,
  } = useAIRulesStore()
  const projectId = useProjectStore(s => s.projectId)
  const [activeSection, setActiveSection] = useState<SectionKey>('writing-style')

  const sectionRefs = {
    'writing-style': useRef<HTMLElement | null>(null),
    'good-examples': useRef<HTMLElement | null>(null),
    'bad-examples': useRef<HTMLElement | null>(null),
    'world-rules': useRef<HTMLElement | null>(null),
  }

  useEffect(() => {
    if (!projectId) return
    Promise.all([
      getWritingStyle(),
      getExamples('good-example'),
      getExamples('bad-example'),
      getWorldSummary(),
    ]).then(([style, good, bad, summary]) => {
      setWritingStyle(style)
      setGoodExamples(good)
      setBadExamples(bad)
      setWorldSummary(summary)
    }).catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const { status: styleStatus } = useAutosave(writingStyle, saveWritingStyle, 1500)
  const { status: summaryStatus } = useAutosave(worldSummary, saveWorldSummary, 1500)

  const handleNavSelect = useCallback((key: SectionKey) => {
    setActiveSection(key)
    sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tokensBySection: Record<SectionKey, number> = {
    'writing-style': estimateTokens(writingStyle),
    'good-examples': goodExamples.reduce((n, r) => n + estimateTokens(r.rule_text), 0),
    'bad-examples': badExamples.reduce((n, r) => n + estimateTokens(r.rule_text), 0),
    'world-rules': estimateTokens(worldSummary),
  }
  const totalTokens = Object.values(tokensBySection).reduce((a, b) => a + b, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-main)' }}>
      {/* Top bar */}
      <div style={{
        height: 44,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        flexShrink: 0,
        gap: 10,
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>AI Rules</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sent with every AI request · Layer 1 context</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <SectionNav
          active={activeSection}
          onSelect={handleNavSelect}
          tokensBySection={tokensBySection}
          totalTokens={totalTokens}
        />

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <TextareaSection
              title="Writing Style"
              description="Tell the AI how to write — tone, pacing, voice, what to avoid."
              placeholder="Prose should be lean and kinetic. Avoid purple passages. Favour short sentences under tension. Show, don't tell — except when interiority reveals character."
              value={writingStyle}
              onChange={setWritingStyle}
              sectionRef={sectionRefs['writing-style']}
              saveStatus={styleStatus}
            />

            <ExampleSection
              type="good-example"
              examples={goodExamples}
              accentColor="#6a9e5a"
              label="Good Examples"
              sectionRef={sectionRefs['good-examples']}
            />

            <ExampleSection
              type="bad-example"
              examples={badExamples}
              accentColor="#c47a8a"
              label="Bad Examples"
              sectionRef={sectionRefs['bad-examples']}
            />

            <TextareaSection
              title="World Rules"
              description="Hard facts the AI must never contradict — magic systems, history, geography, lore."
              placeholder="Ember-binding requires physical contact with an ash source. The Accord of Seven Fires forbids crossing the Ashen Reach during the Dark Month."
              value={worldSummary}
              onChange={setWorldSummary}
              sectionRef={sectionRefs['world-rules']}
              saveStatus={summaryStatus}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { CodexEntry } from '../../lib/db/types'

export interface MentionDropdownRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface MentionDropdownProps {
  items: CodexEntry[]
  command: (entry: CodexEntry) => void
}

const CATEGORY_LABELS: Record<CodexEntry['category'], string> = {
  characters: 'Character',
  locations:  'Location',
  factions:   'Faction',
  magic:      'Magic',
  events:     'Event',
  items:      'Item',
}

export const MentionDropdown = forwardRef<MentionDropdownRef, MentionDropdownProps>(
  function MentionDropdown({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => { setSelectedIndex(0) }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown(event: KeyboardEvent): boolean {
        const len = Math.max(items.length, 1)
        if (event.key === 'ArrowDown') {
          setSelectedIndex(i => (i + 1) % len)
          return true
        }
        if (event.key === 'ArrowUp') {
          setSelectedIndex(i => (i - 1 + len) % len)
          return true
        }
        if (event.key === 'Enter') {
          const entry = items[selectedIndex]
          if (entry) command(entry)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="mention-dropdown">
          <div className="mention-dropdown-empty">No entries found</div>
        </div>
      )
    }

    return (
      <div className="mention-dropdown">
        {items.map((entry, index) => (
          <button
            key={entry.id}
            className={`mention-dropdown-item${index === selectedIndex ? ' mention-dropdown-item--active' : ''}`}
            onMouseDown={e => {
              e.preventDefault() // prevent editor blur before command fires
              command(entry)
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span
              className="mention-dropdown-item__dot"
              style={{ background: `var(--color-${entry.category})` }}
            />
            <span className="mention-dropdown-item__title">{entry.title}</span>
            <span
              className="mention-dropdown-item__category"
              style={{ color: `var(--color-${entry.category})` }}
            >
              {CATEGORY_LABELS[entry.category]}
            </span>
          </button>
        ))}
      </div>
    )
  }
)

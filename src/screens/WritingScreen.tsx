// Phase 2 Dev Gallery — remove before Phase 3
import { CategoryChip, type Category } from '../components/ui/CategoryChip'
import { Avatar } from '../components/ui/Avatar'
import { AIButton } from '../components/ui/AIButton'
import { Button } from '../components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'

const CATEGORIES: { category: Category; label: string }[] = [
  { category: 'characters', label: 'Character' },
  { category: 'locations', label: 'Location' },
  { category: 'factions', label: 'Faction' },
  { category: 'magic', label: 'Magic System' },
  { category: 'events', label: 'Event' },
  { category: 'items', label: 'Item' },
  { category: 'manuscript', label: 'Manuscript' },
]

const CATEGORY_VARS: Record<Category, string> = {
  characters: 'var(--color-characters)',
  locations:  'var(--color-locations)',
  factions:   'var(--color-factions)',
  magic:      'var(--color-magic)',
  events:     'var(--color-events)',
  items:      'var(--color-items)',
  manuscript: 'var(--color-manuscript)',
}

export function WritingScreen() {
  return (
    <TooltipProvider>
      <div style={{ padding: 32, color: 'var(--text-primary)', overflowY: 'auto', height: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 24 }}>
          Phase 2 Dev Gallery — remove before Phase 3
        </div>

        <Section title="CategoryChip — all 7 variants">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(({ category, label }) => (
              <CategoryChip key={category} category={category} label={label} />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {CATEGORIES.map(({ category, label }) => (
              <CategoryChip key={category} category={category} label={label} size="sm" />
            ))}
          </div>
        </Section>

        <Section title="Avatar">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {CATEGORIES.map(({ category }) => (
              <Avatar key={category} name="Aria Voss" size={32} colorVar={CATEGORY_VARS[category]} />
            ))}
            <Avatar name="Aria Voss" size={28} />
            <Avatar name="Aria Voss" size={40} />
            <Avatar name="Single" size={28} />
          </div>
        </Section>

        <Section title="AIButton">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <AIButton onClick={() => {}} />
            <AIButton onClick={() => {}} isOpen />
            <AIButton onClick={() => {}} disabled />
          </div>
        </Section>

        <Section title="Button variants">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Tooltip">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>This is a tooltip</TooltipContent>
          </Tooltip>
        </Section>
      </div>
    </TooltipProvider>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

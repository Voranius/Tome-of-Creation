import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { useAIStore } from '../../store/aiStore'
import { useUIStore } from '../../store/uiStore'

interface NoAIKeyTooltipProps {
  children: React.ReactNode
}

export function NoAIKeyTooltip({ children }: NoAIKeyTooltipProps) {
  const connectedProviders = useAIStore(s => s.connectedProviders)
  const navigate = useUIStore(s => s.navigate)
  const hasKey = connectedProviders.length > 0

  if (hasKey) return <>{children}</>

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span style={{ display: 'inline-flex' }}>{children}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--text-dim)' }}>AI features need an API key —</span>
          <button
            onClick={() => navigate('settings')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'var(--color-gold)',
              cursor: 'pointer',
              fontSize: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            Set up in Settings →
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rail:            'var(--color-rail)',
        main:            'var(--color-main)',
        panel:           'var(--color-panel)',
        gold:            'var(--color-gold)',
        'text-primary':  'var(--text-primary)',
        'text-dim':      'var(--text-dim)',
        'text-muted':    'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-medium': 'var(--border-medium)',
        success:         'var(--color-success)',
        error:           'var(--color-error)',
        character:       'var(--color-character)',
        location:        'var(--color-location)',
        faction:         'var(--color-faction)',
        magic:           'var(--color-magic)',
        event:           'var(--color-event)',
        item:            'var(--color-item)',
        manuscript:      'var(--color-manuscript)',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

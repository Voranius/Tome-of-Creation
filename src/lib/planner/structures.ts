export type StructurePresetKey = 'none' | 'save-the-cat' | 'three-act' | 'heros-journey'

export interface StructureBeat {
  name: string
  position: number
  major: boolean
}

export const STRUCTURE_PRESETS: Record<StructurePresetKey, StructureBeat[]> = {
  none: [],
  'save-the-cat': [
    { name: 'Opening Image',      position: 0.01, major: false },
    { name: 'Theme Stated',       position: 0.05, major: false },
    { name: 'Catalyst',           position: 0.12, major: true  },
    { name: 'B Story',            position: 0.30, major: false },
    { name: 'Midpoint',           position: 0.50, major: true  },
    { name: 'Bad Guys Close In',  position: 0.63, major: false },
    { name: 'All is Lost',        position: 0.75, major: true  },
    { name: 'Dark Night',         position: 0.80, major: false },
    { name: 'Finale',             position: 0.88, major: false },
    { name: 'Final Image',        position: 0.99, major: false },
  ],
  'three-act': [
    { name: 'Inciting Incident',  position: 0.12, major: true  },
    { name: 'Act 1 Turn',         position: 0.25, major: true  },
    { name: 'Midpoint',           position: 0.50, major: true  },
    { name: 'Act 2 Turn',         position: 0.75, major: true  },
    { name: 'Climax',             position: 0.90, major: true  },
    { name: 'Resolution',         position: 0.99, major: false },
  ],
  'heros-journey': [
    { name: 'Ordinary World',     position: 0.01, major: false },
    { name: 'Call to Adventure',  position: 0.12, major: true  },
    { name: 'Threshold',          position: 0.25, major: true  },
    { name: 'Ordeal',             position: 0.50, major: true  },
    { name: 'Road Back',          position: 0.75, major: true  },
    { name: 'Resurrection',       position: 0.90, major: true  },
  ],
}

export const STRUCTURE_PRESET_LABELS: Record<StructurePresetKey, string> = {
  'none':          'No structure',
  'save-the-cat':  'Save the Cat',
  'three-act':     'Three Act',
  'heros-journey': "Hero's Journey",
}

export const BEAT_TYPES = [
  'Inciting Incident',
  'Plot Point',
  'Midpoint',
  'Dark Night',
  'Climax',
  'Resolution',
  'Custom',
] as const

export type BeatType = typeof BEAT_TYPES[number]

export const BEAT_COLORS: Record<BeatType, string> = {
  'Inciting Incident': '#c9a84c',
  'Plot Point':        '#4ab3d4',
  'Midpoint':          '#7b5ea7',
  'Dark Night':        '#c47a8a',
  'Climax':            '#c4824a',
  'Resolution':        '#6a9e5a',
  'Custom':            '#3d9e8a',
}

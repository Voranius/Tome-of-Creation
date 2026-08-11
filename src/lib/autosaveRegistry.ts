type AutosaveFlusher = () => Promise<void>

const autosaveFlushers = new Set<AutosaveFlusher>()

export function registerAutosaveFlusher(flusher: AutosaveFlusher): () => void {
  autosaveFlushers.add(flusher)

  return () => {
    autosaveFlushers.delete(flusher)
  }
}

export async function flushAutosaves(): Promise<void> {
  const results = await Promise.allSettled(Array.from(autosaveFlushers, flusher => flusher()))
  for (const r of results) {
    if (r.status === 'rejected') console.error('Autosave flush failed:', r.reason)
  }
}

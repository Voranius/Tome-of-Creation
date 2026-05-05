type AutosaveFlusher = () => Promise<void>

const autosaveFlushers = new Set<AutosaveFlusher>()

export function registerAutosaveFlusher(flusher: AutosaveFlusher): () => void {
  autosaveFlushers.add(flusher)

  return () => {
    autosaveFlushers.delete(flusher)
  }
}

export async function flushAutosaves(): Promise<void> {
  await Promise.all(Array.from(autosaveFlushers, flusher => flusher()))
}

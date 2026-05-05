import { useCallback, useEffect, useRef, useState } from 'react'
import { registerAutosaveFlusher } from '../lib/autosaveRegistry'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutosaveController {
  status: SaveStatus
  flush: () => Promise<void>
}

export function useAutosave(
  value: string,
  saveFn: (value: string) => Promise<void>,
  delayMs = 1500
): AutosaveController {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValue = useRef(value)
  const latestSaveFn = useRef(saveFn)
  const hasInitialized = useRef(false)
  const isDirty = useRef(false)
  const inFlightSave = useRef<Promise<void> | null>(null)

  useEffect(() => {
    latestSaveFn.current = saveFn
  }, [saveFn])

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (inFlightSave.current) {
      await inFlightSave.current
    }

    if (!isDirty.current) return

    const currentValue = latestValue.current
    isDirty.current = false
    setStatus('saving')

    const savePromise = latestSaveFn.current(currentValue)
      .then(() => {
        setStatus('saved')
      })
      .catch(error => {
        isDirty.current = true
        setStatus('error')
        throw error
      })

    inFlightSave.current = savePromise

    try {
      await savePromise
    } finally {
      if (inFlightSave.current === savePromise) {
        inFlightSave.current = null
      }
    }
  }, [])

  useEffect(() => {
    latestValue.current = value

    if (!hasInitialized.current) {
      hasInitialized.current = true
      return
    }

    isDirty.current = true

    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')

    timerRef.current = setTimeout(() => {
      void flush()
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delayMs, flush])

  useEffect(() => registerAutosaveFlusher(flush), [flush])

  return { status, flush }
}

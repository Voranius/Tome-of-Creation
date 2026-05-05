import { useEffect, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosave(
  value: string,
  saveFn: (value: string) => Promise<void>,
  delayMs = 1500
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValue = useRef(value)

  useEffect(() => {
    latestValue.current = value
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')

    timerRef.current = setTimeout(async () => {
      try {
        await saveFn(latestValue.current)
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delayMs])

  return status
}

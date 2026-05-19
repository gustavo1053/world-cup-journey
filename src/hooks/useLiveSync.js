import { useEffect, useRef } from 'react'
import { syncLiveMatches, syncUpcomingMatches } from '../utils/apiFootball'

const INTERVAL_MS = 2 * 60 * 1000 // 2 minutos

export function useLiveSync() {
  const intervalRef = useRef(null)

  useEffect(() => {
    // Sincronización inicial
    const sync = async () => {
      await syncUpcomingMatches()
      await syncLiveMatches()
    }

    sync()

    // Repetir cada 2 minutos
    intervalRef.current = setInterval(sync, INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
}

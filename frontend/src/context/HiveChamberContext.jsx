import { createContext, useContext, useMemo } from 'react'
import { getChamberTheme } from '../lib/chamberThemes.js'

const HiveChamberContext = createContext(null)

export function HiveChamberProvider({ theme = 'hub', children }) {
  const value = useMemo(() => {
    const meta = getChamberTheme(theme)
    return { theme, meta }
  }, [theme])

  return <HiveChamberContext.Provider value={value}>{children}</HiveChamberContext.Provider>
}

export function useHiveChamber() {
  const ctx = useContext(HiveChamberContext)
  if (!ctx) {
    return { theme: 'hub', meta: getChamberTheme('hub') }
  }
  return ctx
}

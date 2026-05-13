import { createContext, ReactNode, useContext } from 'react'

type Ctx = Record<string, never>
const SettingsContext = createContext<Ctx>({})

export const SettingsProvider = ({ children }: { children: ReactNode }) => (
  <SettingsContext.Provider value={{}}>{children}</SettingsContext.Provider>
)

export const useSettings = () => useContext(SettingsContext)

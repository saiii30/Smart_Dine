import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'
type MenuColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'

interface ThemeContextType {
  theme: Theme
  menuColor: MenuColor
  toggleTheme: () => void
  setMenuColor: (color: MenuColor) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'light'
  })
  
  const [menuColor, setMenuColorState] = useState<MenuColor>(() => {
    const saved = localStorage.getItem('menuColor')
    return (saved as MenuColor) || 'blue'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('menuColor', menuColor)
  }, [menuColor])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const setMenuColor = (color: MenuColor) => {
    setMenuColorState(color)
  }

  return (
    <ThemeContext.Provider value={{ theme, menuColor, toggleTheme, setMenuColor }}>
      {children}
    </ThemeContext.Provider>
  )
}


import { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = {
  'dark-ocean': {
    name: 'Dark Ocean', icon: '🌊',
    bg: '#0f172a', surface: '#1e293b', surfaceDeep: '#0a1120',
    border: '#334155', text: '#e2e8f0', muted: '#64748b', accent: '#3b82f6',
  },
  'rose-garden': {
    name: 'Rose Garden', icon: '🌹',
    bg: '#1a0a10', surface: '#2d1520', surfaceDeep: '#120608',
    border: '#4a2535', text: '#fce7f3', muted: '#9d6070', accent: '#f472b6',
  },
  'midnight': {
    name: 'Midnight', icon: '🌙',
    bg: '#0d0d1a', surface: '#1a1a3a', surfaceDeep: '#080812',
    border: '#2d2d5a', text: '#e0e0f0', muted: '#7070a0', accent: '#818cf8',
  },
  'forest': {
    name: 'Forest', icon: '🌿',
    bg: '#060e06', surface: '#0f1e0f', surfaceDeep: '#060e06',
    border: '#1a3a1a', text: '#dcfce7', muted: '#5a8a5a', accent: '#4ade80',
  },
  'light': {
    name: 'Light', icon: '☀️',
    bg: '#f1f5f9', surface: '#ffffff', surfaceDeep: '#f8fafc',
    border: '#e2e8f0', text: '#1e293b', muted: '#64748b', accent: '#3b82f6',
  },
}

const ThemeContext = createContext({
  themeKey: 'dark-ocean',
  theme: THEMES['dark-ocean'],
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKey] = useState(
    () => localStorage.getItem('app-theme') || 'dark-ocean'
  )

  function applyThemeToDom(key) {
    const t = THEMES[key] || THEMES['dark-ocean']
    const root = document.documentElement
    root.style.setProperty('--app-bg', t.bg)
    root.style.setProperty('--app-surface', t.surface)
    root.style.setProperty('--app-surface-deep', t.surfaceDeep)
    root.style.setProperty('--app-border', t.border)
    root.style.setProperty('--app-text', t.text)
    root.style.setProperty('--app-muted', t.muted)
    root.style.setProperty('--app-accent', t.accent)
    document.body.style.background = t.bg
    document.body.style.color = t.text
  }

  useEffect(() => { applyThemeToDom(themeKey) }, [themeKey])

  function setTheme(key) {
    if (!THEMES[key]) return
    setThemeKey(key)
    localStorage.setItem('app-theme', key)
    applyThemeToDom(key)
    // Persist to Firestore lazily
    import('../hooks/useAppSettings').then(({ loadSettings, saveSettings }) => {
      loadSettings().then(s => saveSettings({ ...s, theme: key })).catch(() => {})
    })
  }

  return (
    <ThemeContext.Provider value={{ themeKey, theme: THEMES[themeKey], setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

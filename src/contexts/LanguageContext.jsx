import { createContext, useContext, useState } from 'react'
import en from '../locales/en'
import ta from '../locales/ta'

const LOCALES = { en, ta }

export const LANGUAGES = {
  en: { label: 'English', native: 'English', flag: '🇬🇧', dateLocale: 'en-IN' },
  ta: { label: 'Tamil',   native: 'தமிழ்',   flag: '🇮🇳', dateLocale: 'ta-IN' },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('app-lang') || 'en')

  function setLang(l) {
    setLangState(l)
    localStorage.setItem('app-lang', l)
  }

  // t(key) — returns the translated string, falling back to English, then the key itself.
  // t(key, { var: value }) — replaces {var} placeholders in the string.
  function t(key, vars) {
    const str = LOCALES[lang]?.[key] ?? LOCALES.en[key] ?? key
    if (!vars) return str
    return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`))
  }

  const dateLocale = LANGUAGES[lang]?.dateLocale || 'en-IN'

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dateLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export const DEFAULT_SETTINGS = {
  shopName: 'My Shop',
  shopStartTime: '09:00',
  shopEndTime: '21:00',
  theme: 'dark-ocean',
  backupReminderDays: 7,
  lastBackupDate: null,
  imageMaxWidth: 800,
  imageMaxHeight: 600,
  imageQuality: 0.75,
  imageMaxSizeKB: 200,
  dailyTasks: [
    { en: 'Morning store opening check', ta: '' },
    { en: 'Stock level verification', ta: '' },
    { en: 'Equipment / POS system check', ta: '' },
    { en: 'Cleanliness & hygiene inspection', ta: '' },
    { en: 'Team briefing completed', ta: '' },
    { en: 'Customer area setup', ta: '' },
    { en: 'Safety checklist', ta: '' },
  ],
  closureTasks: [
    { en: 'All cash counted & secured', ta: '' },
    { en: 'POS system closed & reports printed', ta: '' },
    { en: 'Stock doors locked', ta: '' },
    { en: 'Lights & AC turned off', ta: '' },
    { en: 'Cleaning completed', ta: '' },
    { en: 'Alarm system armed', ta: '' },
    { en: 'Exit doors locked & verified', ta: '' },
  ],
}

// Normalize tasks: old string[] → { en, ta }[] for backward compatibility
export function normalizeTasks(arr) {
  return (arr || []).map(t => (typeof t === 'string' ? { en: t, ta: '' } : t))
}

export async function loadSettings() {
  const snap = await getDoc(doc(db, 'settings', 'app'))
  const raw = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS
  return {
    ...raw,
    dailyTasks: normalizeTasks(raw.dailyTasks),
    closureTasks: normalizeTasks(raw.closureTasks),
  }
}

export async function saveSettings(data) {
  await setDoc(doc(db, 'settings', 'app'), data)
}

export function useAppSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then(s => { setSettings(s); setLoading(false) })
  }, [])

  return { settings, loading, reload: () => loadSettings().then(setSettings) }
}

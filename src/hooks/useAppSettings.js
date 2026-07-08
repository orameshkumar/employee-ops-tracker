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
    'Morning store opening check',
    'Stock level verification',
    'Equipment / POS system check',
    'Cleanliness & hygiene inspection',
    'Team briefing completed',
    'Customer area setup',
    'Safety checklist',
  ],
  closureTasks: [
    'All cash counted & secured',
    'POS system closed & reports printed',
    'Stock doors locked',
    'Lights & AC turned off',
    'Cleaning completed',
    'Alarm system armed',
    'Exit doors locked & verified',
  ],
}

// Normalize tasks: old string[] → { en, ta }[] for backward compatibility
function normalizeTasks(arr) {
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

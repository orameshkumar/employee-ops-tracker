import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'

export const DEFAULT_SETTINGS = {
  shopName: 'My Shop',
  imageMaxWidth: 1280,
  imageMaxHeight: 960,
  imageQuality: 0.8,
  imageMaxSizeKB: 500,
}

export async function loadSettings() {
  const snap = await getDoc(doc(db, 'settings', 'app'))
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS
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

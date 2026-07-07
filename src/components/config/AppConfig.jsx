import { useState, useEffect } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../hooks/useAppSettings'

const s = {
  wrap: { padding: 24, maxWidth: 600, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 24 },
  section: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 16 },
  sectionTitle: { color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' },
  field: { marginBottom: 14 },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  hint: { color: '#475569', fontSize: '0.72rem', marginTop: 3 },
  btn: { width: '100%', padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', background: '#3b82f6', color: '#fff', marginTop: 4 },
  success: { background: '#14532d', border: '1px solid #16a34a', borderRadius: 8, padding: '10px 14px', color: '#4ade80', fontSize: '0.85rem', marginBottom: 14 },
  range: { width: '100%', accentColor: '#3b82f6', marginTop: 4 },
  rangeVal: { color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', float: 'right' },
}

export default function AppConfig() {
  const [form, setForm] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings().then(setForm)
  }, [])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await saveSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>⚙️ App Configuration</div>
      <div style={s.sub}>Manage shop settings and image upload preferences</div>
      {saved && <div style={s.success}>✅ Settings saved successfully!</div>}
      <form onSubmit={handleSubmit}>

        <div style={s.section}>
          <div style={s.sectionTitle}>🏪 Shop Identity</div>
          <div style={s.field}>
            <label style={s.label}>Shop Name</label>
            <input style={s.input} value={form.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Enter your shop name" />
            <div style={s.hint}>Displayed in the app header and reports</div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>📷 Image Upload Settings</div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Max Width (px)</label>
              <input style={s.input} type="number" min="320" max="3840" step="80"
                value={form.imageMaxWidth} onChange={e => set('imageMaxWidth', parseInt(e.target.value))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Max Height (px)</label>
              <input style={s.input} type="number" min="240" max="2160" step="60"
                value={form.imageMaxHeight} onChange={e => set('imageMaxHeight', parseInt(e.target.value))} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>
              Max File Size (KB) <span style={s.rangeVal}>{form.imageMaxSizeKB} KB</span>
            </label>
            <input style={s.range} type="range" min="100" max="2000" step="50"
              value={form.imageMaxSizeKB} onChange={e => set('imageMaxSizeKB', parseInt(e.target.value))} />
            <div style={s.hint}>Images above this size will be compressed automatically</div>
          </div>
          <div style={s.field}>
            <label style={s.label}>
              JPEG Quality <span style={s.rangeVal}>{Math.round(form.imageQuality * 100)}%</span>
            </label>
            <input style={s.range} type="range" min="0.3" max="1.0" step="0.05"
              value={form.imageQuality} onChange={e => set('imageQuality', parseFloat(e.target.value))} />
            <div style={s.hint}>Lower = smaller file, higher = better quality</div>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 10, marginTop: 4 }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Preview: photos will be saved at max <strong style={{ color: '#38bdf8' }}>{form.imageMaxWidth}×{form.imageMaxHeight}px</strong>, ≤<strong style={{ color: '#38bdf8' }}>{form.imageMaxSizeKB}KB</strong>, quality <strong style={{ color: '#38bdf8' }}>{Math.round(form.imageQuality * 100)}%</strong></div>
          </div>
        </div>

        <button style={s.btn} type="submit" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Settings'}
        </button>
      </form>
    </div>
  )
}

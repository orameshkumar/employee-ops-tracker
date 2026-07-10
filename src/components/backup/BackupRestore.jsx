import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { loadSettings, saveSettings } from '../../hooks/useAppSettings'
import { fmtDate } from '../../utils/dateUtils'

const EXPORT_COLLECTIONS = ['attendance', 'sales', 'expenses', 'dailyTasks', 'closureTasks', 'users']

const s = {
  wrap: { padding: 24, maxWidth: 660, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: 'var(--app-muted, #64748b)', fontSize: '0.85rem', marginBottom: 24 },
  section: { background: 'var(--app-surface, #1e293b)', borderRadius: 12, padding: 20, border: '1px solid var(--app-border, #334155)', marginBottom: 16 },
  sectionTitle: { color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  btn: (c) => ({
    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.88rem',
    background: c === 'blue' ? '#3b82f6' : c === 'green' ? '#16a34a' : c === 'red' ? '#b91c1c' : '#475569',
    color: '#fff',
  }),
  msg: (ok) => ({
    padding: '10px 14px', borderRadius: 8, fontSize: '0.85rem', marginTop: 14,
    background: ok ? '#14532d' : '#450a0a',
    color: ok ? '#4ade80' : '#fca5a5',
    border: `1px solid ${ok ? '#16a34a' : '#ef4444'}`,
  }),
  info: { background: 'var(--app-surface-deep, #0f172a)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--app-muted, #64748b)', marginTop: 12, lineHeight: 1.6 },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: 6 },
  select: { padding: '8px 12px', borderRadius: 6, border: '1px solid var(--app-border, #334155)', background: 'var(--app-surface-deep, #0f172a)', color: 'var(--app-text, #e2e8f0)', fontSize: '0.9rem', outline: 'none' },
  lastBackup: (overdue) => ({ fontSize: '0.82rem', color: overdue ? '#fca5a5' : '#4ade80', fontWeight: 600 }),
  progress: { color: '#38bdf8', fontSize: '0.82rem', marginTop: 8 },
  colList: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  colTag: { padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600, background: '#1e3a5f', color: '#60a5fa' },
}

function serializeVal(val) {
  if (val === null || val === undefined) return val
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return { _ts: val.seconds, _ns: val.nanoseconds || 0 }
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    const out = {}
    for (const k of Object.keys(val)) out[k] = serializeVal(val[k])
    return out
  }
  if (Array.isArray(val)) return val.map(serializeVal)
  return val
}

function deserializeVal(val) {
  if (val === null || val === undefined) return val
  if (typeof val === 'object' && '_ts' in val && '_ns' in val) {
    return new Timestamp(val._ts, val._ns)
  }
  if (Array.isArray(val)) return val.map(deserializeVal)
  if (typeof val === 'object') {
    const out = {}
    for (const k of Object.keys(val)) out[k] = deserializeVal(val[k])
    return out
  }
  return val
}

export default function BackupRestore() {
  const [lastBackup, setLastBackup] = useState(null)
  const [reminderDays, setReminderDays] = useState(7)
  const [exporting, setExporting] = useState(false)
  const [exportStep, setExportStep] = useState('')
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    loadSettings().then(cfg => {
      setLastBackup(cfg.lastBackupDate || null)
      setReminderDays(cfg.backupReminderDays ?? 7)
    })
  }, [])

  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null
  const isOverdue = reminderDays > 0 && (daysSinceBackup === null || daysSinceBackup >= reminderDays)

  async function handleExport() {
    setExporting(true)
    setMsg(null)
    try {
      const backup = {
        version: 2,
        exportedAt: new Date().toISOString(),
        collections: {},
      }
      for (const colName of EXPORT_COLLECTIONS) {
        setExportStep(`Reading ${colName}…`)
        const snap = await getDocs(collection(db, colName))
        backup.collections[colName] = {}
        snap.docs.forEach(d => {
          backup.collections[colName][d.id] = serializeVal(d.data())
        })
      }
      setExportStep('Reading settings…')
      backup.settings = await loadSettings()

      setExportStep('Generating file…')
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ops-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      const today = new Date().toISOString().split('T')[0]
      const cfg = await loadSettings()
      await saveSettings({ ...cfg, lastBackupDate: today })
      setLastBackup(today)
      setMsg({ ok: true, text: '✅ Backup downloaded! Keep it somewhere safe.' })
    } catch (err) {
      setMsg({ ok: false, text: '❌ Backup failed: ' + err.message })
    } finally {
      setExporting(false)
      setExportStep('')
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!window.confirm(`Restore from "${file.name}"?\n\nThis will OVERWRITE existing data. Make sure you have a current backup first.`)) return

    setImporting(true)
    setMsg(null)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.version || !backup.collections) throw new Error('Invalid backup file format.')

      let count = 0
      for (const [colName, docs] of Object.entries(backup.collections)) {
        for (const [docId, data] of Object.entries(docs)) {
          await setDoc(doc(db, colName, docId), deserializeVal(data))
          count++
        }
      }
      if (backup.settings) {
        await saveSettings(backup.settings)
      }
      setMsg({ ok: true, text: `✅ Restore complete! ${count} documents restored from ${fmtDate(backup.exportedAt?.split('T')[0]) || 'backup'}.` })
    } catch (err) {
      setMsg({ ok: false, text: '❌ Restore failed: ' + err.message })
    } finally {
      setImporting(false)
    }
  }

  async function saveReminderSettings() {
    try {
      const cfg = await loadSettings()
      await saveSettings({ ...cfg, backupReminderDays: reminderDays })
      setMsg({ ok: true, text: '✅ Reminder settings saved!' })
    } catch (err) {
      setMsg({ ok: false, text: '❌ ' + err.message })
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>🗄️ Backup &amp; Restore</div>
      <div style={s.sub}>Export all shop data for safe-keeping, or restore from a previous backup</div>

      {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}

      {/* Status */}
      <div style={s.section}>
        <div style={s.sectionTitle}>📅 Backup Status</div>
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Last backup: </span>
          {lastBackup
            ? <span style={s.lastBackup(isOverdue)}>{fmtDate(lastBackup)} ({daysSinceBackup === 0 ? 'today' : `${daysSinceBackup}d ago`})</span>
            : <span style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>Never backed up</span>
          }
        </div>
        {isOverdue && (
          <div style={{ background: '#2d1b00', border: '1px solid #d97706', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: '#fcd34d', marginTop: 8 }}>
            ⚠️ Backup overdue! It's been {daysSinceBackup ?? '∞'} day{daysSinceBackup !== 1 ? 's' : ''} since your last backup.
          </div>
        )}
        <div style={s.colList}>
          {EXPORT_COLLECTIONS.map(c => <span key={c} style={s.colTag}>{c}</span>)}
          <span style={s.colTag}>settings</span>
        </div>
      </div>

      {/* Export */}
      <div style={s.section}>
        <div style={s.sectionTitle}>⬇️ Export Backup</div>
        <div style={{ color: 'var(--app-muted, #64748b)', fontSize: '0.82rem', marginBottom: 14 }}>
          Downloads all attendance, sales, expenses, tasks, employees and settings as a JSON file.
        </div>
        <div style={s.row}>
          <button style={s.btn('blue')} onClick={handleExport} disabled={exporting}>
            {exporting ? '⏳ Exporting…' : '⬇️ Download Backup'}
          </button>
        </div>
        {exportStep && <div style={s.progress}>{exportStep}</div>}
        <div style={s.info}>
          File name: <strong>ops-backup-YYYY-MM-DD.json</strong><br />
          Store it in Google Drive, email it to yourself, or keep it on your device.
        </div>
      </div>

      {/* Import */}
      <div style={s.section}>
        <div style={s.sectionTitle}>⬆️ Restore Backup</div>
        <div style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: 14 }}>
          ⚠️ Restoring will overwrite existing data. Only do this if you're sure.
        </div>
        <div style={s.row}>
          <button style={s.btn('red')} onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? '⏳ Restoring…' : '⬆️ Restore from File'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        <div style={s.info}>
          Select an <strong>ops-backup-*.json</strong> file previously exported from this app.
        </div>
      </div>

      {/* Reminder settings */}
      <div style={s.section}>
        <div style={s.sectionTitle}>🔔 Backup Reminder</div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="backup-reminder-days" style={s.label}>Remind me every</label>
          <div style={s.row}>
            <select id="backup-reminder-days" style={s.select} value={reminderDays} onChange={e => setReminderDays(parseInt(e.target.value))}>
              <option value={1}>Every day</option>
              <option value={3}>Every 3 days</option>
              <option value={7}>Every week</option>
              <option value={14}>Every 2 weeks</option>
              <option value={30}>Every month</option>
              <option value={0}>Never</option>
            </select>
            <button style={s.btn('green')} onClick={saveReminderSettings}>Save</button>
          </div>
        </div>
        <div style={s.info}>
          A reminder banner will appear on the dashboard when a backup is overdue.
        </div>
      </div>
    </div>
  )
}

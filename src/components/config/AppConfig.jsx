import { useState, useEffect } from 'react'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../../hooks/useAppSettings'
import { useTheme, THEMES } from '../../contexts/ThemeContext'
import QRGenerator from '../attendance/QRGenerator'

const s = {
  wrap: { padding: 24, maxWidth: 660, margin: '0 auto' },
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
  taskRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  taskInput: { flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  iconBtn: (c) => ({ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: c === 'red' ? '#7f1d1d' : c === 'up' ? '#1e3a5f' : '#1e3a5f', color: c === 'red' ? '#fca5a5' : '#60a5fa', flexShrink: 0 }),
  addRow: { display: 'flex', gap: 8, marginTop: 8 },
  addInput: { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px dashed #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  addBtn: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#166534', color: '#4ade80', fontSize: '0.85rem', flexShrink: 0 },
  taskCount: { color: '#475569', fontSize: '0.75rem', marginBottom: 10 },
  themeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 4 },
  themeCard: (active, accent) => ({ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: active ? `2px solid ${accent}` : '2px solid transparent', background: 'var(--app-surface-deep, #0f172a)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'border-color 0.15s' }),
  themeDot: (color) => ({ width: 20, height: 20, borderRadius: '50%', background: color }),
  themeLabel: (active) => ({ fontSize: '0.78rem', fontWeight: active ? 700 : 400, color: active ? 'var(--app-text, #e2e8f0)' : 'var(--app-muted, #64748b)', textAlign: 'center' }),
}

function TaskListEditor({ tasks, onChange, accentColor = '#3b82f6' }) {
  const [newTask, setNewTask] = useState('')

  function update(i, val) {
    const updated = [...tasks]
    updated[i] = val
    onChange(updated)
  }

  function remove(i) {
    onChange(tasks.filter((_, idx) => idx !== i))
  }

  function moveUp(i) {
    if (i === 0) return
    const updated = [...tasks]
    ;[updated[i - 1], updated[i]] = [updated[i], updated[i - 1]]
    onChange(updated)
  }

  function moveDown(i) {
    if (i === tasks.length - 1) return
    const updated = [...tasks]
    ;[updated[i], updated[i + 1]] = [updated[i + 1], updated[i]]
    onChange(updated)
  }

  function addTask() {
    const trimmed = newTask.trim()
    if (!trimmed) return
    onChange([...tasks, trimmed])
    setNewTask('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addTask() }
  }

  return (
    <div>
      <div style={s.taskCount}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</div>
      {tasks.map((task, i) => (
        <div key={i} style={s.taskRow}>
          <span style={{ color: '#475569', fontSize: '0.75rem', width: 20, flexShrink: 0 }}>{i + 1}</span>
          <input
            style={s.taskInput}
            value={task}
            onChange={e => update(i, e.target.value)}
          />
          <button style={s.iconBtn('up')} onClick={() => moveUp(i)} title="Move up" disabled={i === 0}>↑</button>
          <button style={s.iconBtn('down')} onClick={() => moveDown(i)} title="Move down" disabled={i === tasks.length - 1}>↓</button>
          <button style={s.iconBtn('red')} onClick={() => remove(i)} title="Remove">✕</button>
        </div>
      ))}
      <div style={s.addRow}>
        <input
          style={s.addInput}
          placeholder="+ Add new task…"
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={s.addBtn} onClick={addTask}>Add</button>
      </div>
    </div>
  )
}

export default function AppConfig() {
  const [form, setForm] = useState(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { themeKey, setTheme } = useTheme()

  useEffect(() => {
    loadSettings().then(setForm)
  }, [])

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.dailyTasks.length === 0) return alert('Daily tasks cannot be empty.')
    if (form.closureTasks.length === 0) return alert('Closure tasks cannot be empty.')
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
      <div style={s.sub}>Manage shop settings, task lists, and image upload preferences</div>
      {saved && <div style={s.success}>✅ Settings saved successfully!</div>}
      <form onSubmit={handleSubmit}>

        <div style={s.section}>
          <div style={s.sectionTitle}>🎨 App Theme</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 12 }}>
            Choose your preferred color scheme — changes apply instantly
          </div>
          <div style={s.themeGrid}>
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                style={s.themeCard(themeKey === key, t.accent)}
                onClick={() => setTheme(key)}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={s.themeDot(t.bg)} />
                  <div style={s.themeDot(t.surface)} />
                  <div style={s.themeDot(t.accent)} />
                </div>
                <div style={{ fontSize: '1rem' }}>{t.icon}</div>
                <div style={s.themeLabel(themeKey === key)}>{t.name}</div>
                {themeKey === key && <div style={{ fontSize: '0.65rem', color: t.accent, fontWeight: 700 }}>Active</div>}
              </button>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>🏪 Shop Identity</div>
          <div style={s.field}>
            <label style={s.label}>Shop Name</label>
            <input style={s.input} value={form.shopName} onChange={e => set('shopName', e.target.value)} placeholder="Enter your shop name" />
            <div style={s.hint}>Displayed in the app header and reports</div>
          </div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Shop Opening Time</label>
              <input style={s.input} type="time" value={form.shopStartTime} onChange={e => set('shopStartTime', e.target.value)} />
              <div style={s.hint}>First check-in expected from this time</div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Shop Closing Time</label>
              <input style={s.input} type="time" value={form.shopEndTime} onChange={e => set('shopEndTime', e.target.value)} />
              <div style={s.hint}>Closure tasks required for sign-out after this time</div>
            </div>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>✅ Daily Routine Tasks</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 12 }}>
            Tasks employees must complete each morning with photo proof
          </div>
          <TaskListEditor
            tasks={form.dailyTasks}
            onChange={val => set('dailyTasks', val)}
          />
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>🔒 Closure Tasks</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 12 }}>
            Tasks employees must complete before scanning out — gates the QR sign-out
          </div>
          <TaskListEditor
            tasks={form.closureTasks}
            onChange={val => set('closureTasks', val)}
          />
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
          </div>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 10, marginTop: 4 }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
              Photos saved at max <strong style={{ color: '#38bdf8' }}>{form.imageMaxWidth}×{form.imageMaxHeight}px</strong>,
              ≤<strong style={{ color: '#38bdf8' }}>{form.imageMaxSizeKB}KB</strong>,
              quality <strong style={{ color: '#38bdf8' }}>{Math.round(form.imageQuality * 100)}%</strong>
            </div>
          </div>
        </div>

        <button style={s.btn} type="submit" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save All Settings'}
        </button>
      </form>

      <div style={{ ...s.section, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
          <div style={s.sectionTitle}>🔑 QR Codes</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Generate and print shop QR codes for check-in / check-out</div>
        </div>
        <QRGenerator />
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { getAllEmployees } from '../../firebase/firestore'
import { useAppSettings } from '../../hooks/useAppSettings'
import DateInput from '../shared/DateInput'
import { fmtDate, todayISO, daysAgoISO } from '../../utils/dateUtils'

async function fetchTasksForRange(fromDate, toDate) {
  const [dailySnap, closureSnap] = await Promise.all([
    getDocs(query(collection(db, 'dailyTasks'),  where('date', '>=', fromDate), where('date', '<=', toDate))),
    getDocs(query(collection(db, 'closureTasks'), where('date', '>=', fromDate), where('date', '<=', toDate))),
  ])
  const daily   = dailySnap.docs.map(d   => ({ id: d.id, type: 'daily',   ...d.data() }))
  const closure = closureSnap.docs.map(d => ({ id: d.id, type: 'closure', ...d.data() }))
  return [...daily, ...closure].sort((a, b) => b.date.localeCompare(a.date))
}

function estKB(photoUrl) {
  if (!photoUrl) return 0
  return Math.round(photoUrl.length * 0.75 / 1024)
}

const s = {
  wrap:        { padding: '20px 16px', maxWidth: 900, margin: '0 auto' },
  title:       { color: '#8b5cf6', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub:         { color: 'var(--app-muted,#64748b)', fontSize: '0.85rem', marginBottom: 20 },
  filterCard:  { background: 'var(--app-surface,#1e293b)', borderRadius: 12, padding: '16px', border: '1px solid var(--app-border,#334155)', marginBottom: 20 },
  filterRow:   { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', marginBottom: 12 },
  field:       { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  label:       { color: '#94a3b8', fontSize: '0.78rem' },
  input:       { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border,#334155)', background: 'var(--app-surface-deep,#0f172a)', color: 'var(--app-text,#e2e8f0)', fontSize: '0.88rem', width: 140, boxSizing: 'border-box' },
  select:      { padding: '8px 10px', borderRadius: 6, border: '1px solid var(--app-border,#334155)', background: 'var(--app-surface-deep,#0f172a)', color: 'var(--app-text,#e2e8f0)', fontSize: '0.88rem', minWidth: 160, boxSizing: 'border-box' },
  chipRow:     { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip:        (on) => ({ padding: '4px 11px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? '#8b5cf6' : '#334155'}`, background: on ? '#3b1f6e' : 'transparent', color: on ? '#c4b5fd' : '#64748b', userSelect: 'none' }),
  runBtn:      { padding: '9px 22px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', background: '#8b5cf6', color: '#fff' },
  printBtn:    { padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', background: '#475569', color: '#fff' },
  emptyMsg:    { color: '#475569', padding: '32px 0', textAlign: 'center', fontSize: '0.9rem' },

  // Report output
  dayBlock:    { marginBottom: 24 },
  dayHeader:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--app-surface,#1e293b)', borderRadius: '10px 10px 0 0', borderBottom: '2px solid #8b5cf6' },
  dayTitle:    { color: '#c4b5fd', fontWeight: 800, fontSize: '0.95rem' },
  daySub:      { color: '#64748b', fontSize: '0.75rem' },

  empBlock:    { background: 'var(--app-surface,#1e293b)', border: '1px solid var(--app-border,#334155)', borderTop: 'none', padding: '14px 16px', marginBottom: 2 },
  empName:     { color: '#e2e8f0', fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },

  thumbGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 },
  thumbCard:   (type, selected, clickable) => ({
    background: 'var(--app-surface-deep,#0f172a)', borderRadius: 8, overflow: 'hidden',
    border: selected ? '2px solid #ef4444' : `1px solid ${type === 'daily' ? '#1d4ed8' : '#d97706'}`,
    cursor: clickable ? 'zoom-in' : 'default', position: 'relative',
  }),
  thumbImg:    { width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' },
  thumbNoImg:  { width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: '#0f172a' },
  thumbMeta:   { padding: '6px 8px' },
  thumbName:   { color: 'var(--app-text,#e2e8f0)', fontSize: '0.72rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 3 },
  thumbBadge:  (type) => ({ display: 'inline-block', fontSize: '0.62rem', fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: type === 'daily' ? '#1e3a8a' : '#3b2a00', color: type === 'daily' ? '#93c5fd' : '#fcd34d' }),
  thumbTime:   { color: '#475569', fontSize: '0.65rem', marginTop: 2 },

  divider:     { borderColor: 'var(--app-border,#334155)', margin: '4px 0' },
  summaryBox:  { background: 'var(--app-surface,#1e293b)', borderRadius: 10, padding: '12px 16px', border: '1px solid #334155', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' },
  statItem:    { fontSize: '0.82rem' },
  statVal:     { color: '#c4b5fd', fontWeight: 800, fontSize: '1.1rem' },
  statLbl:     { color: '#64748b' },

  // Storage management bar
  storageBar:  { background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  selCount:    { color: '#fca5a5', fontWeight: 700, fontSize: '0.88rem', flex: 1 },
  delBtn:      (disabled) => ({ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem', background: disabled ? '#374151' : '#b91c1c', color: disabled ? '#6b7280' : '#fff' }),
  selAllBtn:   { padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer' },
  checkMark:   (on) => ({
    position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
    background: on ? '#ef4444' : 'rgba(0,0,0,0.5)', border: `2px solid ${on ? '#ef4444' : '#94a3b8'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', fontWeight: 800,
  }),
}

export default function TaskVerificationReport() {
  const { settings } = useAppSettings()
  const [fromDate,    setFromDate]    = useState(daysAgoISO(7))
  const [toDate,      setToDate]      = useState(todayISO())
  const [selEmployee, setSelEmployee] = useState('all')
  const [selTypes,    setSelTypes]    = useState(['daily', 'closure'])
  const [selTasks,    setSelTasks]    = useState([])
  const [employees,   setEmployees]   = useState([])
  const [allTasks,    setAllTasks]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [ranOnce,     setRanOnce]     = useState(false)

  // Storage management state
  const [manageMode,  setManageMode]  = useState(false)
  const [selected,    setSelected]    = useState(new Set()) // Set of task IDs
  const [deleting,    setDeleting]    = useState(false)

  // Lightbox state
  const [lightbox, setLightbox] = useState(null) // { src, taskName, type, userName, date, time }

  const taskNamesInData = [...new Set(allTasks.map(t => t.taskName))].sort()
  const settingsDailyNames   = (settings.dailyTasks   || []).map(t => typeof t === 'string' ? t : t.en)
  const settingsClosureNames = (settings.closureTasks || []).map(t => typeof t === 'string' ? t : t.en)
  const allKnownNames = [...new Set([...settingsDailyNames, ...settingsClosureNames, ...taskNamesInData])].sort()

  useEffect(() => { getAllEmployees().then(setEmployees).catch(() => {}) }, [])

  async function runReport() {
    setLoading(true)
    setSelected(new Set())
    try {
      const tasks = await fetchTasksForRange(fromDate, toDate)
      setAllTasks(tasks)
      setRanOnce(true)
    } catch (err) {
      alert('Error loading tasks: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleType(t) {
    setSelTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleTask(name) {
    setSelTasks(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  const filtered = allTasks.filter(t => {
    if (selEmployee !== 'all' && t.uid !== selEmployee) return false
    if (!selTypes.includes(t.type)) return false
    if (selTasks.length > 0 && !selTasks.includes(t.taskName)) return false
    return true
  })

  // Only tasks in filtered view that have a photo
  const filteredWithPhoto = filtered.filter(t => t.photoUrl)

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filteredWithPhoto.map(t => t.id)))
  }
  function deselectAll() {
    setSelected(new Set())
  }

  async function deleteSelectedPhotos() {
    if (selected.size === 0) return
    const totalKB = [...selected].reduce((sum, id) => {
      const t = allTasks.find(t => t.id === id)
      return sum + estKB(t?.photoUrl)
    }, 0)
    const confirm = window.confirm(
      `Delete photos for ${selected.size} task record${selected.size !== 1 ? 's' : ''}?\n\nThis will free ~${totalKB < 1024 ? totalKB + ' KB' : (totalKB / 1024).toFixed(1) + ' MB'} from Firestore.\n\nThe task completion records are kept — only the photos are removed. This cannot be undone.`
    )
    if (!confirm) return

    setDeleting(true)
    try {
      await Promise.all([...selected].map(id => {
        const task = allTasks.find(t => t.id === id)
        if (!task) return Promise.resolve()
        const colName = task.type === 'daily' ? 'dailyTasks' : 'closureTasks'
        return updateDoc(doc(db, colName, id), { photoUrl: deleteField() })
      }))
      // Remove photoUrl from local state so UI updates immediately
      setAllTasks(prev => prev.map(t =>
        selected.has(t.id) ? { ...t, photoUrl: null } : t
      ))
      setSelected(new Set())
      setManageMode(false)
      alert(`✅ Deleted photos from ${selected.size} records.`)
    } catch (err) {
      alert('Error deleting photos: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Group: date → uid → tasks[]
  const byDate = {}
  filtered.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = {}
    if (!byDate[t.date][t.uid]) byDate[t.date][t.uid] = { userName: t.userName, tasks: [] }
    byDate[t.date][t.uid].tasks.push(t)
  })
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const totalDays  = sortedDates.length
  const totalTasks = filtered.length
  const totalEmps  = new Set(filtered.map(t => t.uid)).size

  // Total estimated photo storage in filtered view
  const totalPhotoKB = filtered.reduce((sum, t) => sum + estKB(t.photoUrl), 0)
  const selectedKB   = [...selected].reduce((sum, id) => {
    const t = allTasks.find(t => t.id === id)
    return sum + estKB(t?.photoUrl)
  }, 0)

  function fmtSize(kb) {
    return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`
  }

  return (
    <div style={s.wrap}>
      <style>{`
        @media print {
          body { background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; max-width: 100% !important; }
          .day-header { background: #e9e3ff !important; -webkit-print-color-adjust: exact; }
          .emp-block { border: 1px solid #ccc !important; }
          .thumb-card { border: 1px solid #ccc !important; break-inside: avoid; }
          .thumb-img { -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="print-root" style={s.wrap}>
        <div className="no-print">
          <div style={s.title}>✅ Task Verification Report</div>
          <div style={s.sub}>Review completed tasks with photo proof for any date range and employee</div>
        </div>

        {/* Filters */}
        <div className="no-print" style={s.filterCard}>
          <div style={s.filterRow}>
            <div style={s.field}>
              <label htmlFor="tvr-from-date" style={s.label}>From Date</label>
              <DateInput id="tvr-from-date" style={s.input} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div style={s.field}>
              <label htmlFor="tvr-to-date" style={s.label}>To Date</label>
              <DateInput id="tvr-to-date" style={s.input} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div style={s.field}>
              <label htmlFor="tvr-employee" style={s.label}>Employee</label>
              <select id="tvr-employee" style={s.select} value={selEmployee} onChange={e => setSelEmployee(e.target.value)}>
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.uid} value={emp.uid}>{emp.name || emp.email}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <span style={s.label}>Task Type</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={s.chip(selTypes.includes('daily'))}   onClick={() => toggleType('daily')}>Daily</span>
                <span style={s.chip(selTypes.includes('closure'))} onClick={() => toggleType('closure')}>Closure</span>
              </div>
            </div>
          </div>

          {allKnownNames.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ ...s.label, marginBottom: 6 }}>
                Filter by Task {selTasks.length > 0 ? `(${selTasks.length} selected)` : '(all)'}
              </div>
              <div style={s.chipRow}>
                {allKnownNames.map(name => (
                  <span key={name} style={s.chip(selTasks.includes(name))} onClick={() => toggleTask(name)}>
                    {name}
                  </span>
                ))}
                {selTasks.length > 0 && (
                  <span style={{ ...s.chip(false), borderColor: '#ef4444', color: '#f87171' }} onClick={() => setSelTasks([])}>
                    ✕ Clear
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.runBtn} onClick={runReport} disabled={loading}>
              {loading ? '⏳ Loading…' : '🔍 Run Report'}
            </button>
          </div>
        </div>

        {/* Results */}
        {ranOnce && (
          <>
            {/* Summary bar */}
            <div style={s.summaryBox}>
              <div style={s.statItem}><div style={s.statVal}>{totalTasks}</div><div style={s.statLbl}>Tasks verified</div></div>
              <div style={s.statItem}><div style={s.statVal}>{totalEmps}</div><div style={s.statLbl}>Employees</div></div>
              <div style={s.statItem}><div style={s.statVal}>{totalDays}</div><div style={s.statLbl}>Days covered</div></div>
              {totalPhotoKB > 0 && (
                <div style={s.statItem}>
                  <div style={{ ...s.statVal, color: '#f97316' }}>{fmtSize(totalPhotoKB)}</div>
                  <div style={s.statLbl}>Photo storage</div>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', gap: 8, alignSelf: 'center', flexWrap: 'wrap' }}>
                {filteredWithPhoto.length > 0 && (
                  <button
                    style={{ ...s.printBtn, background: manageMode ? '#7f1d1d' : '#475569' }}
                    className="no-print"
                    onClick={() => { setManageMode(m => !m); setSelected(new Set()) }}
                  >
                    {manageMode ? '✕ Cancel' : '🗑️ Manage Storage'}
                  </button>
                )}
                <button style={s.printBtn} className="no-print" onClick={() => window.print()}>
                  🖨️ Print / Save PDF
                </button>
              </div>
            </div>

            {/* Storage management toolbar */}
            {manageMode && (
              <div style={s.storageBar} className="no-print">
                <div style={s.selCount}>
                  {selected.size === 0
                    ? `Tap photos to select for deletion · ${filteredWithPhoto.length} photo${filteredWithPhoto.length !== 1 ? 's' : ''} (${fmtSize(totalPhotoKB)})`
                    : `${selected.size} selected · ${fmtSize(selectedKB)} will be freed`}
                </div>
                <button style={s.selAllBtn} onClick={selected.size === filteredWithPhoto.length ? deselectAll : selectAll}>
                  {selected.size === filteredWithPhoto.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  style={s.delBtn(selected.size === 0 || deleting)}
                  disabled={selected.size === 0 || deleting}
                  onClick={deleteSelectedPhotos}
                >
                  {deleting ? '⏳ Deleting…' : `🗑️ Delete ${selected.size > 0 ? selected.size + ' Photo' + (selected.size !== 1 ? 's' : '') : 'Photos'}`}
                </button>
              </div>
            )}

            {sortedDates.length === 0 && (
              <div style={s.emptyMsg}>No tasks found for the selected filters.</div>
            )}

            {sortedDates.map(date => {
              const empMap = byDate[date]
              const dayCount = Object.values(empMap).reduce((s, e) => s + e.tasks.length, 0)
              return (
                <div key={date} style={s.dayBlock} className="day-block">
                  <div style={s.dayHeader} className="day-header">
                    <div style={s.dayTitle}>📅 {fmtDate(date)}</div>
                    <div style={s.daySub}>{dayCount} task{dayCount !== 1 ? 's' : ''} · {Object.keys(empMap).length} employee{Object.keys(empMap).length !== 1 ? 's' : ''}</div>
                  </div>

                  {Object.entries(empMap).map(([uid, { userName, tasks }]) => (
                    <div key={uid} style={s.empBlock} className="emp-block">
                      <div style={s.empName}>
                        👤 {userName}
                        <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.78rem' }}>
                          — {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div style={s.thumbGrid}>
                        {tasks.map(task => {
                          const isSel = selected.has(task.id)
                          const selectable = manageMode && !!task.photoUrl
                          const viewable = !manageMode && !!task.photoUrl
                          return (
                            <div
                              key={task.id}
                              style={s.thumbCard(task.type, isSel, selectable || viewable)}
                              className="thumb-card"
                              onClick={selectable ? () => toggleSelect(task.id) : (task.photoUrl && !manageMode ? () => setLightbox({ src: task.photoUrl, taskName: task.taskName, type: task.type, userName, date, time: task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null }) : undefined)}
                            >
                              {manageMode && task.photoUrl && (
                                <div style={s.checkMark(isSel)}>{isSel ? '✓' : ''}</div>
                              )}
                              {task.photoUrl
                                ? <img src={task.photoUrl} alt={task.taskName} style={s.thumbImg} className="thumb-img" />
                                : <div style={s.thumbNoImg}>📷</div>
                              }
                              <div style={s.thumbMeta}>
                                <div style={s.thumbName}>{task.taskName}</div>
                                <span style={s.thumbBadge(task.type)}>
                                  {task.type === 'daily' ? 'DAILY' : 'CLOSURE'}
                                </span>
                                {task.photoUrl && (
                                  <div style={{ ...s.thumbTime, color: '#64748b' }}>{fmtSize(estKB(task.photoUrl))}</div>
                                )}
                                {task.createdAt?.seconds && (
                                  <div style={s.thumbTime}>
                                    {new Date(task.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}

        {!ranOnce && (
          <div style={s.emptyMsg}>Set your filters and click <strong>Run Report</strong> to view task verification.</div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 14, right: 16,
              background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%',
              color: '#fff', fontSize: '1.3rem', width: 38, height: 38,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >✕</button>

          {/* Image */}
          <img
            src={lightbox.src}
            alt={lightbox.taskName}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: 'calc(100dvh - 120px)',
              objectFit: 'contain', borderRadius: 10,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              display: 'block',
            }}
          />

          {/* Caption */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ marginTop: 14, textAlign: 'center', maxWidth: 480 }}
          >
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>
              {lightbox.taskName}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...s.thumbBadge(lightbox.type), fontSize: '0.72rem' }}>
                {lightbox.type === 'daily' ? 'DAILY' : 'CLOSURE'}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>👤 {lightbox.userName}</span>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>📅 {lightbox.date}{lightbox.time ? ` · ${lightbox.time}` : ''}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

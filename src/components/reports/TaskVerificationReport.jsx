import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
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
  const daily   = dailySnap.docs.map(d   => ({ id: d.id,   type: 'daily',   ...d.data() }))
  const closure = closureSnap.docs.map(d => ({ id: d.id,   type: 'closure', ...d.data() }))
  return [...daily, ...closure].sort((a, b) => b.date.localeCompare(a.date))
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
  thumbCard:   (type) => ({ background: 'var(--app-surface-deep,#0f172a)', borderRadius: 8, overflow: 'hidden', border: `1px solid ${type === 'daily' ? '#1d4ed8' : '#d97706'}` }),
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
}

export default function TaskVerificationReport() {
  const { settings } = useAppSettings()
  const [fromDate,       setFromDate]       = useState(daysAgoISO(7))
  const [toDate,         setToDate]         = useState(todayISO())
  const [selEmployee,    setSelEmployee]    = useState('all')
  const [selTypes,       setSelTypes]       = useState(['daily', 'closure'])
  const [selTasks,       setSelTasks]       = useState([])   // empty = all
  const [employees,      setEmployees]      = useState([])
  const [allTasks,       setAllTasks]       = useState([])   // raw fetched
  const [loading,        setLoading]        = useState(false)
  const [ranOnce,        setRanOnce]        = useState(false)

  // Unique task names available in fetched data
  const taskNamesInData = [...new Set(allTasks.map(t => t.taskName))].sort()

  // All task names from settings (for filter chips even before running)
  const settingsDailyNames   = settings.dailyTasks   || []
  const settingsClosureNames = settings.closureTasks || []
  const allKnownNames = [...new Set([...settingsDailyNames, ...settingsClosureNames, ...taskNamesInData])].sort()

  useEffect(() => {
    getAllEmployees().then(setEmployees).catch(() => {})
  }, [])

  async function runReport() {
    setLoading(true)
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

  // Apply filters
  const filtered = allTasks.filter(t => {
    if (selEmployee !== 'all' && t.uid !== selEmployee) return false
    if (!selTypes.includes(t.type)) return false
    if (selTasks.length > 0 && !selTasks.includes(t.taskName)) return false
    return true
  })

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

  function handlePrint() {
    window.print()
  }

  return (
    <div style={s.wrap}>
      {/* Print-only styles injected inline */}
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
              <span style={s.label}>From Date</span>
              <DateInput style={s.input} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div style={s.field}>
              <span style={s.label}>To Date</span>
              <DateInput style={s.input} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div style={s.field}>
              <span style={s.label}>Employee</span>
              <select style={s.select} value={selEmployee} onChange={e => setSelEmployee(e.target.value)}>
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

          {/* Task name filter — shown after first run or from settings */}
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
              <div style={{ flex: 1 }} />
              <button style={{ ...s.printBtn, alignSelf: 'center' }} className="no-print" onClick={handlePrint}>
                🖨️ Print / Save PDF
              </button>
            </div>

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
                        {tasks.map(task => (
                          <div key={task.id} style={s.thumbCard(task.type)} className="thumb-card">
                            {task.photoUrl
                              ? <img src={task.photoUrl} alt={task.taskName} style={s.thumbImg} className="thumb-img" />
                              : <div style={s.thumbNoImg}>📷</div>
                            }
                            <div style={s.thumbMeta}>
                              <div style={s.thumbName}>{task.taskName}</div>
                              <span style={s.thumbBadge(task.type)}>
                                {task.type === 'daily' ? 'DAILY' : 'CLOSURE'}
                              </span>
                              {task.createdAt?.seconds && (
                                <div style={s.thumbTime}>
                                  {new Date(task.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
    </div>
  )
}

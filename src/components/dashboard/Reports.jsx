import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/config'
import DateInput from '../shared/DateInput'
import { fmtDate, todayISO, daysAgoISO } from '../../utils/dateUtils'
import TaskVerificationReport from '../reports/TaskVerificationReport'
import { loadSettings, DEFAULT_SETTINGS } from '../../hooks/useAppSettings'

const CATEGORIES = ['Travel', 'Food & Beverages', 'Office Supplies', 'Utilities', 'Maintenance', 'Marketing', 'Other']

const s = {
  wrap: { padding: 24, maxWidth: 900, margin: '0 auto' },
  title: { color: '#f97316', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  filterBar: { background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: '#94a3b8', fontSize: '0.75rem' },
  input: { padding: '7px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  btn: { padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: '#f97316', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 20 },
  stat: (c) => ({ background: '#1e293b', borderRadius: 12, padding: 16, border: `1px solid ${c}` }),
  statVal: { fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 2 },
  statLabel: { color: '#64748b', fontSize: '0.75rem' },
  section: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', marginBottom: 16, overflow: 'hidden' },
  sectionHead: { padding: '12px 18px', background: '#0f172a', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid #334155' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', borderBottom: '1px solid #1e293b', background: '#162032' },
  td: { padding: '9px 14px', fontSize: '0.82rem', color: '#e2e8f0', borderBottom: '1px solid #1e293b' },
  barWrap: { background: '#0f172a', borderRadius: 4, height: 8, flex: 1, overflow: 'hidden' },
  bar: (pct, c) => ({ height: 8, borderRadius: 4, background: c, width: `${Math.min(pct, 100)}%`, minWidth: 4 }),
  error: { background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 14 },
  loading: { color: '#475569', padding: 20 },
  noData: { color: '#475569', padding: '14px 18px', fontSize: '0.85rem' },
}

function fmtHours(h) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function firstDayOfMonth() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}

function dateRange(from, to) {
  const dates = []; const cur = new Date(from)
  while (cur <= new Date(to)) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  return dates
}

const tabBtn = (active) => ({
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 700, fontSize: '0.85rem',
  background: active ? '#f97316' : '#1e293b',
  color: active ? '#fff' : '#64748b',
  transition: 'background 0.15s',
})

export default function Reports() {
  const [tab, setTab] = useState('reports')
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(todayISO())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [attendance, sales, expenses, settings] = await Promise.all([
        fetchCollection('attendance', from, to),
        fetchCollection('sales', from, to),
        fetchExpensesInRange(from, to),
        loadSettings(),
      ])
      setData(buildReport(attendance, sales, expenses, from, to, settings))
    } catch (err) {
      console.error('Reports fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>📊 Reports</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={tabBtn(tab === 'reports')} onClick={() => setTab('reports')}>📊 Analytics</button>
        <button style={tabBtn(tab === 'tasks')} onClick={() => setTab('tasks')}>✅ Task Report</button>
      </div>

      {tab === 'tasks' && <TaskVerificationReport />}

      {tab === 'reports' && <div>
      <div style={s.filterBar}>
        <div style={s.field}>
          <label style={s.label}>From Date</label>
          <DateInput style={s.input} value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>To Date</label>
          <DateInput style={s.input} value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button style={s.btn} onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : '🔍 Run Report'}
        </button>
      </div>

      {error && <div style={s.error}>⚠️ {error}</div>}
      {loading && <div style={s.loading}>Loading report data…</div>}

      {data && !loading && (
        <>
          <div style={s.grid}>
            <div style={s.stat('#3b82f6')}><div style={s.statVal}>{data.totalDays}</div><div style={s.statLabel}>Days in Range</div></div>
            <div style={s.stat('#22c55e')}><div style={s.statVal}>{data.totalCheckIns}</div><div style={s.statLabel}>Total Check-Ins</div></div>
            <div style={s.stat('#f97316')}><div style={s.statVal}>₹{data.totalSales.toFixed(0)}</div><div style={s.statLabel}>Total Sales</div></div>
            <div style={s.stat('#22c55e')}><div style={s.statVal}>₹{data.totalOnline.toFixed(0)}</div><div style={s.statLabel}>Online Sales</div></div>
            <div style={s.stat('#fbbf24')}><div style={s.statVal}>₹{data.totalCash.toFixed(0)}</div><div style={s.statLabel}>Cash Sales</div></div>
            <div style={s.stat('#ec4899')}><div style={s.statVal}>₹{data.totalExpenses.toFixed(0)}</div><div style={s.statLabel}>Approved Expenses</div></div>
          </div>

          {/* Sales: Online vs Cash */}
          <div style={s.section}>
            <div style={s.sectionHead}>💰 Sales Collection — Online vs Cash</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Date</th><th style={s.th}>Online (₹)</th><th style={s.th}>Cash (₹)</th><th style={s.th}>Total (₹)</th><th style={s.th}>Online %</th>
              </tr></thead>
              <tbody>
                {data.salesByDate.length === 0 && <tr><td colSpan={5} style={s.noData}>No sales in this range</td></tr>}
                {data.salesByDate.map(row => (
                  <tr key={row.date}>
                    <td style={s.td}>{fmtDate(row.date)}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>₹{row.online.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#fbbf24' }}>₹{row.cash.toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{row.total.toFixed(2)}</td>
                    <td style={{ ...s.td, minWidth: 140 }}>
                      {row.total > 0 && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={s.barWrap}><div style={s.bar(row.online / row.total * 100, '#22c55e')} /></div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', width: 32 }}>{Math.round(row.online / row.total * 100)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.salesByDate.length > 0 && (
                  <tr style={{ background: '#162032' }}>
                    <td style={{ ...s.td, fontWeight: 700, color: '#94a3b8' }}>TOTAL</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#4ade80' }}>₹{data.totalOnline.toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#fbbf24' }}>₹{data.totalCash.toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 800, color: '#e2e8f0' }}>₹{data.totalSales.toFixed(2)}</td>
                    <td style={s.td} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expenses by category */}
          <div style={s.section}>
            <div style={s.sectionHead}>🧾 Expenses by Category</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Category</th><th style={s.th}>Approved (₹)</th><th style={s.th}>Pending (₹)</th><th style={s.th}>Rejected (₹)</th><th style={s.th}>Claims</th><th style={s.th}>Split</th>
              </tr></thead>
              <tbody>
                {data.expenseByCategory.length === 0 && <tr><td colSpan={6} style={s.noData}>No expenses in this range</td></tr>}
                {data.expenseByCategory.map(row => (
                  <tr key={row.category}>
                    <td style={s.td}>{row.category}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>₹{row.approved.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#fbbf24' }}>₹{row.pending.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#f87171' }}>₹{row.rejected.toFixed(2)}</td>
                    <td style={s.td}>{row.count}</td>
                    <td style={s.td}>
                      {row.total > 0 && (
                        <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', width: 80 }}>
                          <div style={{ flex: row.approved, background: '#22c55e', minWidth: row.approved > 0 ? 2 : 0 }} />
                          <div style={{ flex: row.pending, background: '#fbbf24', minWidth: row.pending > 0 ? 2 : 0 }} />
                          <div style={{ flex: row.rejected, background: '#ef4444', minWidth: row.rejected > 0 ? 2 : 0 }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {data.expenseByCategory.length > 0 && (
                  <tr style={{ background: '#162032' }}>
                    <td style={{ ...s.td, fontWeight: 700, color: '#94a3b8' }}>TOTAL</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#4ade80' }}>₹{data.expenseByCategory.reduce((a, r) => a + r.approved, 0).toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#fbbf24' }}>₹{data.expenseByCategory.reduce((a, r) => a + r.pending, 0).toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: '#f87171' }}>₹{data.expenseByCategory.reduce((a, r) => a + r.rejected, 0).toFixed(2)}</td>
                    <td style={s.td}>{data.expenseByCategory.reduce((a, r) => a + r.count, 0)}</td>
                    <td style={s.td} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Attendance per employee */}
          <div style={s.section}>
            <div style={s.sectionHead}>👥 Attendance &amp; Absence — Per Employee</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Employee</th><th style={s.th}>Present</th><th style={s.th}>Absent</th><th style={s.th}>Attendance %</th><th style={s.th}>On Time</th><th style={s.th}>Total Hours</th><th style={s.th}>Avg Hours/Day</th>
              </tr></thead>
              <tbody>
                {data.attendanceByEmployee.length === 0 && <tr><td colSpan={7} style={s.noData}>No attendance records in this range</td></tr>}
                {data.attendanceByEmployee.map(emp => (
                  <tr key={emp.name}>
                    <td style={s.td}>{emp.name}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>{emp.present}</td>
                    <td style={{ ...s.td, color: '#f87171' }}>{emp.absent}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={s.barWrap}><div style={s.bar(emp.pct, emp.pct >= 80 ? '#22c55e' : emp.pct >= 60 ? '#fbbf24' : '#ef4444')} /></div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', width: 36 }}>{emp.pct}%</span>
                      </div>
                    </td>
                    <td style={s.td}>{emp.onTime}</td>
                    <td style={{ ...s.td, color: '#38bdf8' }}>{emp.totalHours}</td>
                    <td style={s.td}>{emp.avgHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>}
    </div>
  )
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchCollection(col, from, to) {
  const q = query(collection(db, col), where('date', '>=', from), where('date', '<=', to))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function fetchExpensesInRange(from, to) {
  const snap = await getDocs(collection(db, 'expenses'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => e.date >= from && e.date <= to)
}

// ── Report builder ────────────────────────────────────────────────────────────

function buildReport(attendance, sales, expenses, from, to, settings = DEFAULT_SETTINGS) {
  const days = dateRange(from, to)
  const totalDays = days.length

  const [startH, startM] = (settings.shopStartTime || '09:00').split(':').map(Number)
  const [endH, endM]     = (settings.shopEndTime   || '21:00').split(':').map(Number)
  const shopStartMins = startH * 60 + startM
  const shopEndMins   = endH   * 60 + endM
  const ON_TIME_GRACE = 15  // minutes after shop start still counts as on-time

  const salesMap = {}
  sales.forEach(r => {
    if (!salesMap[r.date]) salesMap[r.date] = { online: 0, cash: 0 }
    salesMap[r.date].online += r.onlineTotal || 0
    salesMap[r.date].cash += r.cashSales || 0
  })
  const salesByDate = Object.entries(salesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, online: v.online, cash: v.cash, total: v.online + v.cash }))

  const totalOnline = salesByDate.reduce((s, r) => s + r.online, 0)
  const totalCash = salesByDate.reduce((s, r) => s + r.cash, 0)
  const totalSales = totalOnline + totalCash

  const expenseByCategory = CATEGORIES.map(category => {
    const rows = expenses.filter(e => e.category === category)
    return {
      category,
      approved: rows.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0),
      pending: rows.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0),
      rejected: rows.filter(e => e.status === 'rejected').reduce((s, e) => s + (e.amount || 0), 0),
      total: rows.reduce((s, e) => s + (e.amount || 0), 0),
      count: rows.length,
    }
  }).filter(r => r.count > 0)

  const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0)

  const empMap = {}
  attendance.forEach(r => {
    if (!empMap[r.userName]) empMap[r.userName] = { records: [] }
    empMap[r.userName].records.push(r)
  })
  const attendanceByEmployee = Object.entries(empMap).map(([name, { records }]) => {
    // Count unique dates — multiple sessions on the same day = 1 day present.
    // Only count dates where check-in fell within the shop's operating window.
    const presentDates = new Set()
    records.forEach(r => {
      if (!r.checkIn) return
      const ci = r.checkIn.toDate ? r.checkIn.toDate() : new Date(r.checkIn)
      const ciMins = ci.getHours() * 60 + ci.getMinutes()
      if (ciMins <= shopEndMins) presentDates.add(r.date)
    })
    const present = presentDates.size
    const absent = Math.max(0, totalDays - present)
    const pct = Math.round((present / totalDays) * 100)

    // On-time: unique days where the earliest check-in was within grace period of shop start
    const onTimeDates = new Set()
    records.forEach(r => {
      if (!r.checkIn) return
      const ci = r.checkIn.toDate ? r.checkIn.toDate() : new Date(r.checkIn)
      const ciMins = ci.getHours() * 60 + ci.getMinutes()
      if (ciMins <= shopStartMins + ON_TIME_GRACE) onTimeDates.add(r.date)
    })
    const onTime = onTimeDates.size

    // Hours: sum all completed sessions per day, then derive total + avg across days.
    // Only include sessions where check-in is within shop hours.
    const hoursByDate = {}
    records.forEach(r => {
      if (!r.checkIn || !r.checkOut) return
      const ci = r.checkIn.toDate ? r.checkIn.toDate() : new Date(r.checkIn)
      const co = r.checkOut.toDate ? r.checkOut.toDate() : new Date(r.checkOut)
      const ciMins = ci.getHours() * 60 + ci.getMinutes()
      if (ciMins > shopEndMins) return  // ignore sessions starting after shop close
      hoursByDate[r.date] = (hoursByDate[r.date] || 0) + (co - ci) / 3600000
    })
    const dailyHours = Object.values(hoursByDate)
    const totalHoursNum = dailyHours.reduce((s, h) => s + h, 0)
    const totalHours = totalHoursNum > 0 ? fmtHours(totalHoursNum) : '—'
    const avgHours = dailyHours.length ? fmtHours(totalHoursNum / dailyHours.length) : '—'

    return { name, present, absent, pct, onTime, totalHours, avgHours }
  }).sort((a, b) => b.present - a.present)

  return { totalDays, totalCheckIns: attendance.length, totalSales, totalOnline, totalCash, totalExpenses, salesByDate, expenseByCategory, attendanceByEmployee }
}

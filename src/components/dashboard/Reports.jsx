import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../../firebase/config'

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
  bar: (pct, c) => ({ height: 8, borderRadius: 4, background: c, width: `${Math.min(pct, 100)}%`, minWidth: 4 }),
  barWrap: { background: '#0f172a', borderRadius: 4, height: 8, flex: 1, overflow: 'hidden' },
  badge: (s) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: s === 'Present' ? '#14532d' : s === 'Absent' ? '#450a0a' : '#1e3a5f', color: s === 'Present' ? '#4ade80' : s === 'Absent' ? '#f87171' : '#60a5fa' }),
  loading: { color: '#475569', padding: 20 },
  noData: { color: '#475569', padding: '14px 18px', fontSize: '0.85rem' },
}

function firstDayOfMonth() {
  const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
}
function today() { return new Date().toISOString().split('T')[0] }
function dateRange(from, to) {
  const dates = []; const cur = new Date(from)
  while (cur <= new Date(to)) { dates.push(cur.toISOString().split('T')[0]); cur.setDate(cur.getDate() + 1) }
  return dates
}

export default function Reports() {
  const [from, setFrom] = useState(firstDayOfMonth())
  const [to, setTo] = useState(today())
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [attendance, sales, expenses] = await Promise.all([
        fetchAttendance(from, to),
        fetchSales(from, to),
        fetchExpenses(from, to),
      ])
      setData(buildReport(attendance, sales, expenses, from, to))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>📊 Reports</div>
      <div style={s.sub}>Date-range filtered reports for attendance, sales, and expenses</div>

      <div style={s.filterBar}>
        <div style={s.field}>
          <label style={s.label}>From Date</label>
          <input style={s.input} type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div style={s.field}>
          <label style={s.label}>To Date</label>
          <input style={s.input} type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button style={s.btn} onClick={fetchData} disabled={loading}>
          {loading ? 'Loading…' : '🔍 Run Report'}
        </button>
      </div>

      {loading && <div style={s.loading}>Loading report data…</div>}

      {data && (
        <>
          {/* Summary stats */}
          <div style={s.grid}>
            <div style={s.stat('#3b82f6')}><div style={s.statVal}>{data.totalDays}</div><div style={s.statLabel}>Days in Range</div></div>
            <div style={s.stat('#22c55e')}><div style={s.statVal}>{data.totalCheckIns}</div><div style={s.statLabel}>Total Check-Ins</div></div>
            <div style={s.stat('#f97316')}><div style={s.statVal}>₹{data.totalSales.toFixed(0)}</div><div style={s.statLabel}>Total Sales</div></div>
            <div style={s.stat('#22c55e')}><div style={s.statVal}>₹{data.totalOnline.toFixed(0)}</div><div style={s.statLabel}>Online Sales</div></div>
            <div style={s.stat('#fbbf24')}><div style={s.statVal}>₹{data.totalCash.toFixed(0)}</div><div style={s.statLabel}>Cash Sales</div></div>
            <div style={s.stat('#ec4899')}><div style={s.statVal}>₹{data.totalExpenses.toFixed(0)}</div><div style={s.statLabel}>Total Expenses</div></div>
          </div>

          {/* Sales: Online vs Cash */}
          <div style={s.section}>
            <div style={s.sectionHead}>💰 Sales Collection — Online vs Cash</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Online (₹)</th>
                <th style={s.th}>Cash (₹)</th>
                <th style={s.th}>Total (₹)</th>
                <th style={s.th}>Split</th>
              </tr></thead>
              <tbody>
                {data.salesByDate.length === 0 && <tr><td colSpan={5} style={s.noData}>No sales in this range</td></tr>}
                {data.salesByDate.map(row => (
                  <tr key={row.date}>
                    <td style={s.td}>{row.date}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>₹{row.online.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#fbbf24' }}>₹{row.cash.toFixed(2)}</td>
                    <td style={{ ...s.td, fontWeight: 700 }}>₹{row.total.toFixed(2)}</td>
                    <td style={{ ...s.td, minWidth: 120 }}>
                      {row.total > 0 && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={s.barWrap}><div style={s.bar(row.online / row.total * 100, '#22c55e')} /></div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{Math.round(row.online / row.total * 100)}%</span>
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
                <th style={s.th}>Category</th>
                <th style={s.th}>Approved (₹)</th>
                <th style={s.th}>Pending (₹)</th>
                <th style={s.th}>Rejected (₹)</th>
                <th style={s.th}>Total Claims</th>
                <th style={s.th}>Breakdown</th>
              </tr></thead>
              <tbody>
                {data.expenseByCategory.map(row => (
                  <tr key={row.category}>
                    <td style={s.td}>{row.category}</td>
                    <td style={{ ...s.td, color: '#4ade80' }}>₹{row.approved.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#fbbf24' }}>₹{row.pending.toFixed(2)}</td>
                    <td style={{ ...s.td, color: '#f87171' }}>₹{row.rejected.toFixed(2)}</td>
                    <td style={s.td}>{row.count}</td>
                    <td style={{ ...s.td, minWidth: 120 }}>
                      {row.total > 0 && (
                        <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 4, overflow: 'hidden', width: 100 }}>
                          <div style={{ flex: row.approved, background: '#22c55e' }} />
                          <div style={{ flex: row.pending, background: '#fbbf24' }} />
                          <div style={{ flex: row.rejected, background: '#ef4444' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#162032' }}>
                  <td style={{ ...s.td, fontWeight: 700, color: '#94a3b8' }}>TOTAL</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#4ade80' }}>₹{data.expenseByCategory.reduce((s, r) => s + r.approved, 0).toFixed(2)}</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#fbbf24' }}>₹{data.expenseByCategory.reduce((s, r) => s + r.pending, 0).toFixed(2)}</td>
                  <td style={{ ...s.td, fontWeight: 700, color: '#f87171' }}>₹{data.expenseByCategory.reduce((s, r) => s + r.rejected, 0).toFixed(2)}</td>
                  <td style={s.td}>{data.expenseByCategory.reduce((s, r) => s + r.count, 0)}</td>
                  <td style={s.td} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Attendance per employee */}
          <div style={s.section}>
            <div style={s.sectionHead}>👥 Attendance & Absence — Per Employee</div>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Employee</th>
                <th style={s.th}>Present</th>
                <th style={s.th}>Absent</th>
                <th style={s.th}>Attendance %</th>
                <th style={s.th}>On Time</th>
                <th style={s.th}>Avg Hours</th>
              </tr></thead>
              <tbody>
                {data.attendanceByEmployee.length === 0 && <tr><td colSpan={6} style={s.noData}>No attendance records in this range</td></tr>}
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
                    <td style={s.td}>{emp.avgHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchAttendance(from, to) {
  const q = query(collection(db, 'attendance'), where('date', '>=', from), where('date', '<=', to))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function fetchSales(from, to) {
  const q = query(collection(db, 'sales'), where('date', '>=', from), where('date', '<=', to))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function fetchExpenses(from, to) {
  const q = query(collection(db, 'expenses'), where('date', '>=', from), where('date', '<=', to))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Report builder ────────────────────────────────────────────────────────────

function buildReport(attendance, sales, expenses, from, to) {
  const days = dateRange(from, to)
  const totalDays = days.length

  // Sales by date
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

  // Expenses by category
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

  // Attendance per employee
  const empMap = {}
  attendance.forEach(r => {
    if (!empMap[r.userName]) empMap[r.userName] = { records: [] }
    empMap[r.userName].records.push(r)
  })
  const attendanceByEmployee = Object.entries(empMap).map(([name, { records }]) => {
    const present = records.length
    const absent = Math.max(0, totalDays - present)
    const pct = Math.round((present / totalDays) * 100)
    const onTime = records.filter(r => {
      if (!r.checkIn) return false
      const t = r.checkIn.toDate ? r.checkIn.toDate() : new Date(r.checkIn)
      return t.getHours() < 9 || (t.getHours() === 9 && t.getMinutes() <= 15)
    }).length
    const hoursArr = records
      .filter(r => r.checkIn && r.checkOut)
      .map(r => {
        const i = r.checkIn.toDate ? r.checkIn.toDate() : new Date(r.checkIn)
        const o = r.checkOut.toDate ? r.checkOut.toDate() : new Date(r.checkOut)
        return (o - i) / 3600000
      })
    const avgHours = hoursArr.length ? (hoursArr.reduce((s, h) => s + h, 0) / hoursArr.length).toFixed(1) : '—'
    return { name, present, absent, pct, onTime, avgHours }
  }).sort((a, b) => b.present - a.present)

  return {
    totalDays, totalCheckIns: attendance.length,
    totalSales, totalOnline, totalCash, totalExpenses,
    salesByDate, expenseByCategory, attendanceByEmployee,
  }
}

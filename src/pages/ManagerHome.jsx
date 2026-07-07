import { Routes, Route, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/shared/Navbar'
import QRGenerator from '../components/attendance/QRGenerator'
import ExpenseRecorder from '../components/expenses/ExpenseRecorder'
import Reports from '../components/dashboard/Reports'
import AppConfig from '../components/config/AppConfig'
import { getAllAttendance, getAllSales } from '../firebase/firestore'

const s = {
  page: { minHeight: '100vh', background: '#0f172a' },
  dash: { padding: 24, maxWidth: 900, margin: '0 auto' },
  welcome: { color: '#38bdf8', fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 },
  date: { color: '#64748b', fontSize: '0.85rem', marginBottom: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  stat: (c) => ({ background: '#1e293b', borderRadius: 12, padding: 18, border: `1px solid ${c}` }),
  statVal: { fontSize: '1.6rem', fontWeight: 800, color: '#e2e8f0', marginBottom: 2 },
  statLabel: { color: '#64748b', fontSize: '0.8rem' },
  section: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', marginBottom: 16, overflow: 'hidden' },
  sectionHead: { padding: '12px 18px', background: '#162032', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid #334155' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', borderBottom: '1px solid #1e293b', background: '#0f172a' },
  td: { padding: '10px 14px', fontSize: '0.82rem', color: '#e2e8f0', borderBottom: '1px solid #1e293b' },
  badge: (c) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: c === 'in' ? '#14532d' : '#1e3a5f', color: c === 'in' ? '#4ade80' : '#60a5fa' }),
  tileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 },
  tile: (c) => ({ background: '#1e293b', borderRadius: 10, padding: 16, border: `1px solid ${c}`, cursor: 'pointer', textDecoration: 'none', display: 'block' }),
  tileIcon: { fontSize: '1.6rem', marginBottom: 6 },
  tileLabel: { color: '#e2e8f0', fontWeight: 700, fontSize: '0.85rem' },
}

const TILES = [
  { icon: '🔑', label: 'QR Codes', path: '/manager/qr', color: '#3b82f6' },
  { icon: '🧾', label: 'Expenses', path: '/manager/expenses', color: '#ec4899' },
  { icon: '📊', label: 'Reports', path: '/manager/reports', color: '#f97316' },
  { icon: '⚙️', label: 'Config', path: '/manager/config', color: '#6366f1' },
]

function Dashboard() {
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [error, setError] = useState(null)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([getAllAttendance(todayStr), getAllSales(todayStr)])
      .then(([att, sal]) => { setAttendance(att); setSales(sal) })
      .catch(err => setError(err.message))
  }, [todayStr])

  const checkedIn = attendance.filter(a => a.checkIn && !a.checkOut).length
  const checkedOut = attendance.filter(a => a.checkOut).length
  const totalSales = sales.reduce((s, r) => s + (r.grandTotal || 0), 0)
  const totalOnline = sales.reduce((s, r) => s + (r.onlineTotal || 0), 0)
  const totalCash = sales.reduce((s, r) => s + (r.cashSales || 0), 0)

  return (
    <div style={s.dash}>
      <div style={s.welcome}>📊 Manager Dashboard</div>
      <div style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

      {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}

      <div style={s.tileGrid}>
        {TILES.map(t => <Link key={t.path} to={t.path} style={s.tile(t.color)}><div style={s.tileIcon}>{t.icon}</div><div style={s.tileLabel}>{t.label}</div></Link>)}
      </div>

      <div style={s.statsGrid}>
        <div style={s.stat('#3b82f6')}><div style={s.statVal}>{attendance.length}</div><div style={s.statLabel}>Total Present</div></div>
        <div style={s.stat('#22c55e')}><div style={s.statVal}>{checkedIn}</div><div style={s.statLabel}>Currently In</div></div>
        <div style={s.stat('#60a5fa')}><div style={s.statVal}>{checkedOut}</div><div style={s.statLabel}>Checked Out</div></div>
        <div style={s.stat('#f97316')}><div style={s.statVal}>₹{totalSales.toFixed(0)}</div><div style={s.statLabel}>Today's Sales</div></div>
        <div style={s.stat('#22c55e')}><div style={s.statVal}>₹{totalOnline.toFixed(0)}</div><div style={s.statLabel}>Online Sales</div></div>
        <div style={s.stat('#fbbf24')}><div style={s.statVal}>₹{totalCash.toFixed(0)}</div><div style={s.statLabel}>Cash Sales</div></div>
      </div>

      <div style={s.section}>
        <div style={s.sectionHead}>📋 Today's Attendance</div>
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Employee</th><th style={s.th}>Check In</th><th style={s.th}>Check Out</th><th style={s.th}>Closure</th><th style={s.th}>Status</th>
          </tr></thead>
          <tbody>
            {attendance.length === 0 && <tr><td style={{ ...s.td, color: '#475569' }} colSpan={5}>No records yet today</td></tr>}
            {attendance.map(a => (
              <tr key={a.id}>
                <td style={s.td}>{a.userName}</td>
                <td style={s.td}>{fmtTime(a.checkIn)}</td>
                <td style={s.td}>{fmtTime(a.checkOut) || '—'}</td>
                <td style={s.td}>{a.closureComplete ? '✅' : '⏳'}</td>
                <td style={s.td}><span style={s.badge(a.checkOut ? 'out' : 'in')}>{a.checkOut ? 'Checked Out' : 'In Office'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.section}>
        <div style={s.sectionHead}>💰 Today's Sales</div>
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Employee</th><th style={s.th}>Online</th><th style={s.th}>Cash</th><th style={s.th}>Total</th><th style={s.th}>Notes</th>
          </tr></thead>
          <tbody>
            {sales.length === 0 && <tr><td style={{ ...s.td, color: '#475569' }} colSpan={5}>No sales recorded yet</td></tr>}
            {sales.map(r => (
              <tr key={r.id}>
                <td style={s.td}>{r.userName}</td>
                <td style={s.td}>₹{(r.onlineTotal || 0).toFixed(2)}</td>
                <td style={s.td}>₹{(r.cashSales || 0).toFixed(2)}</td>
                <td style={{ ...s.td, fontWeight: 700, color: '#4ade80' }}>₹{(r.grandTotal || 0).toFixed(2)}</td>
                <td style={{ ...s.td, color: '#64748b' }}>{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ManagerHome() {
  return (
    <div style={s.page}>
      <Navbar />
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="qr" element={<QRGenerator />} />
        <Route path="expenses" element={<ExpenseRecorder />} />
        <Route path="reports" element={<Reports />} />
        <Route path="config" element={<AppConfig />} />
      </Routes>
    </div>
  )
}

import { Routes, Route, Link } from 'react-router-dom'
import Navbar from '../components/shared/Navbar'
import QRScanner from '../components/attendance/QRScanner'
import DailyTasks from '../components/tasks/DailyTasks'
import ClosureTasks from '../components/tasks/ClosureTasks'
import SalesEntry from '../components/sales/SalesEntry'
import ExpenseRecorder from '../components/expenses/ExpenseRecorder'
import HistoryPage from '../components/history/HistoryPage'
import { useAuth } from '../contexts/AuthContext'

const s = {
  page: { minHeight: '100vh', background: 'var(--app-bg, #0f172a)' },
  dashboard: { padding: 24, maxWidth: 700, margin: '0 auto' },
  welcome: { color: '#38bdf8', fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 },
  date: { color: 'var(--app-muted, #64748b)', fontSize: '0.85rem', marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 },
  tile: (c) => ({ background: 'var(--app-surface, #1e293b)', borderRadius: 12, padding: 20, border: `1px solid ${c}`, cursor: 'pointer', textDecoration: 'none', display: 'block' }),
  tileIcon: { fontSize: '2rem', marginBottom: 8 },
  tileLabel: { color: 'var(--app-text, #e2e8f0)', fontWeight: 700, fontSize: '0.9rem' },
  tileSub: { color: 'var(--app-muted, #64748b)', fontSize: '0.75rem', marginTop: 3 },
}

const TILES = [
  { icon: '📲', label: 'QR Attendance', sub: 'Check in / Check out', path: '/employee/qr', color: '#3b82f6' },
  { icon: '✅', label: 'Daily Tasks', sub: 'Routine checklist', path: '/employee/tasks', color: '#22c55e' },
  { icon: '🔒', label: 'Closure Tasks', sub: 'End of shift', path: '/employee/closure', color: '#a855f7' },
  { icon: '💰', label: 'Sales Entry', sub: 'Online + cash', path: '/employee/sales', color: '#f97316' },
  { icon: '🧾', label: 'Expenses', sub: 'Submit claims', path: '/employee/expenses', color: '#ec4899' },
  { icon: '📋', label: 'History', sub: 'Sales & expenses', path: '/employee/history', color: '#06b6d4' },
]

function Dashboard() {
  const { profile } = useAuth()
  return (
    <div style={s.dashboard}>
      <div style={s.welcome}>👋 Hello, {profile?.name?.split(' ')[0] || 'there'}!</div>
      <div style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div style={s.grid}>
        {TILES.map(t => (
          <Link key={t.path} to={t.path} style={s.tile(t.color)}>
            <div style={s.tileIcon}>{t.icon}</div>
            <div style={s.tileLabel}>{t.label}</div>
            <div style={s.tileSub}>{t.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function EmployeeHome() {
  return (
    <div style={s.page}>
      <Navbar />
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="qr" element={<QRScanner />} />
        <Route path="tasks" element={<DailyTasks />} />
        <Route path="closure" element={<ClosureTasks />} />
        <Route path="sales" element={<SalesEntry />} />
        <Route path="expenses" element={<ExpenseRecorder />} />
        <Route path="history" element={<HistoryPage />} />
      </Routes>
    </div>
  )
}

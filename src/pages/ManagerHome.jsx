import { Routes, Route, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/shared/Navbar'
import ShopQRPrint from '../components/attendance/ShopQRPrint'
import ExpenseRecorder from '../components/expenses/ExpenseRecorder'
import Reports from '../components/dashboard/Reports'
import AppConfig from '../components/config/AppConfig'
import EmployeeManagement from '../components/employees/EmployeeManagement'
import HistoryPage from '../components/history/HistoryPage'
import AttendanceManager from '../components/attendance/AttendanceManager'
import BackupRestore from '../components/backup/BackupRestore'
import { getAllAttendance, getAllSales, updateSalesRecord } from '../firebase/firestore'
import { loadSettings } from '../hooks/useAppSettings'
import { fmtDate } from '../utils/dateUtils'

const s = {
  page: { minHeight: '100vh', background: 'var(--app-bg, #0f172a)' },
  dash: { padding: 24, maxWidth: 900, margin: '0 auto' },
  welcome: { color: '#38bdf8', fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 },
  date: { color: 'var(--app-muted, #64748b)', fontSize: '0.85rem', marginBottom: 24 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  stat: (c) => ({ background: 'var(--app-surface, #1e293b)', borderRadius: 12, padding: 18, border: `1px solid ${c}` }),
  statVal: { fontSize: '1.6rem', fontWeight: 800, color: 'var(--app-text, #e2e8f0)', marginBottom: 2 },
  statLabel: { color: 'var(--app-muted, #64748b)', fontSize: '0.8rem' },
  section: { background: 'var(--app-surface, #1e293b)', borderRadius: 12, border: '1px solid var(--app-border, #334155)', marginBottom: 16, overflow: 'hidden' },
  sectionHead: { padding: '12px 18px', background: 'var(--app-surface-deep, #0f172a)', color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', borderBottom: '1px solid var(--app-border, #334155)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', color: 'var(--app-muted, #64748b)', fontSize: '0.75rem', borderBottom: '1px solid var(--app-border, #334155)', background: 'var(--app-surface-deep, #0f172a)' },
  td: { padding: '10px 14px', fontSize: '0.82rem', color: 'var(--app-text, #e2e8f0)', borderBottom: '1px solid var(--app-border, #334155)' },
  badge: (c) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: c === 'in' ? '#14532d' : '#1e3a5f', color: c === 'in' ? '#4ade80' : '#60a5fa' }),
  tileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 16 },
  tile: (c) => ({ background: 'var(--app-surface, #1e293b)', borderRadius: 10, padding: 16, border: `1px solid ${c}`, cursor: 'pointer', textDecoration: 'none', display: 'block' }),
  tileIcon: { fontSize: '1.6rem', marginBottom: 6 },
  tileLabel: { color: 'var(--app-text, #e2e8f0)', fontWeight: 700, fontSize: '0.85rem' },
  reminderBanner: { background: '#2d1b00', border: '1px solid #d97706', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  reminderText: { color: '#fcd34d', fontSize: '0.85rem', fontWeight: 600 },
  reminderSub: { color: '#d97706', fontSize: '0.75rem' },
  reminderBtn: { background: '#d97706', color: '#1a0d00', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' },
}

const TILES = [
  { icon: '👥', label: 'Employees', path: '/manager/employees', color: '#22c55e' },
  { icon: '🕐', label: 'Attendance', path: '/manager/attendance', color: '#38bdf8' },
  { icon: '🧾', label: 'Expenses', path: '/manager/expenses', color: '#ec4899' },
  { icon: '📋', label: 'History', path: '/manager/history', color: '#06b6d4' },
  { icon: '📊', label: 'Reports', path: '/manager/reports', color: '#f97316' },
  { icon: '🗄️', label: 'Backup', path: '/manager/backup', color: '#d97706' },
  { icon: '⚙️', label: 'Config', path: '/manager/config', color: '#6366f1' },
]

function Dashboard() {
  const [attendance, setAttendance] = useState([])
  const [sales, setSales] = useState([])
  const [error, setError] = useState(null)
  const [backupWarning, setBackupWarning] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    Promise.all([getAllAttendance(todayStr), getAllSales(todayStr)])
      .then(([att, sal]) => { setAttendance(att); setSales(sal) })
      .catch(err => setError(err.message))
    loadSettings().then(cfg => {
      const days = cfg.backupReminderDays ?? 7
      if (days === 0) return
      const dismissedAt = localStorage.getItem('backup-banner-dismissed')
      if (dismissedAt === todayStr) return
      if (!cfg.lastBackupDate) { setBackupWarning({ days: null }); return }
      const elapsed = Math.floor((Date.now() - new Date(cfg.lastBackupDate).getTime()) / 86400000)
      if (elapsed >= days) setBackupWarning({ days: elapsed, last: cfg.lastBackupDate })
    }).catch(() => {})
  }, [todayStr])

  // Group sessions by employee uid for summary counts
  const byUid = attendance.reduce((acc, a) => {
    if (!acc[a.uid]) acc[a.uid] = { name: a.userName, sessions: [] }
    acc[a.uid].sessions.push(a)
    return acc
  }, {})
  const employeeRows = Object.values(byUid)
  const checkedIn = employeeRows.filter(e => e.sessions.some(s => s.checkIn && !s.checkOut)).length
  const checkedOut = employeeRows.filter(e => e.sessions.every(s => s.checkOut)).length
  const totalSales = sales.reduce((s, r) => s + (r.grandTotal || 0), 0)
  const totalOnline = sales.reduce((s, r) => s + (r.onlineTotal || 0), 0)
  const totalCash = sales.reduce((s, r) => s + (r.cashSales || 0), 0)

  return (
    <div style={s.dash}>
      <div style={s.welcome}>📊 Manager Dashboard</div>
      <div style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

      {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}

      {backupWarning && (
        <div style={s.reminderBanner}>
          <div>
            <div style={s.reminderText}>⚠️ Backup Reminder</div>
            <div style={s.reminderSub}>
              {backupWarning.days === null
                ? 'You have never backed up your data.'
                : `Last backup was ${backupWarning.days} day${backupWarning.days !== 1 ? 's' : ''} ago (${fmtDate(backupWarning.last)}).`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/manager/backup" style={{ ...s.reminderBtn, textDecoration: 'none' }}>🗄️ Backup Now</Link>
            <button style={{ ...s.reminderBtn, background: '#4a3a1a' }} onClick={() => { localStorage.setItem('backup-banner-dismissed', todayStr); setBackupWarning(null) }}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={s.tileGrid}>
        {TILES.map(t => <Link key={t.path} to={t.path} style={s.tile(t.color)}><div style={s.tileIcon}>{t.icon}</div><div style={s.tileLabel}>{t.label}</div></Link>)}
      </div>

      <div style={s.statsGrid}>
        <div style={s.stat('#3b82f6')}><div style={s.statVal}>{employeeRows.length}</div><div style={s.statLabel}>Total Present</div></div>
        <div style={s.stat('#22c55e')}><div style={s.statVal}>{checkedIn}</div><div style={s.statLabel}>Currently In</div></div>
        <div style={s.stat('#60a5fa')}><div style={s.statVal}>{checkedOut}</div><div style={s.statLabel}>Fully Out</div></div>
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
            {employeeRows.length === 0 && <tr><td style={{ ...s.td, color: '#475569' }} colSpan={5}>No records yet today</td></tr>}
            {employeeRows.map(emp => {
              const active = emp.sessions.find(s => s.checkIn && !s.checkOut)
              const allOut = emp.sessions.length > 0 && emp.sessions.every(s => s.checkOut)
              const closureDone = emp.sessions.some(s => s.closureComplete)
              const firstIn = emp.sessions[0]?.checkIn
              const lastOut = emp.sessions.filter(s => s.checkOut).sort((a, b) => (b.checkOut?.seconds || 0) - (a.checkOut?.seconds || 0))[0]?.checkOut
              return (
                <tr key={emp.name}>
                  <td style={s.td}>
                    {emp.name}
                    {emp.sessions.length > 1 && <span style={{ color: '#a855f7', fontSize: '0.7rem', marginLeft: 6 }}>{emp.sessions.length} sessions</span>}
                  </td>
                  <td style={s.td}>{fmtTime(firstIn)}</td>
                  <td style={s.td}>{allOut ? fmtTime(lastOut) : '—'}</td>
                  <td style={s.td}>{closureDone ? '✅' : '⏳'}</td>
                  <td style={s.td}><span style={s.badge(active ? 'in' : 'out')}>{active ? 'In Office' : 'Checked Out'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={s.section}>
        <div style={s.sectionHead}>💰 Today's Sales</div>
        <table style={s.table}>
          <thead><tr>
            <th style={s.th}>Employee</th><th style={s.th}>Online</th><th style={s.th}>Cash</th><th style={s.th}>Total</th><th style={s.th}>Notes</th><th style={s.th}></th>
          </tr></thead>
          <tbody>
            {sales.length === 0 && <tr><td style={{ ...s.td, color: '#475569' }} colSpan={6}>No sales recorded yet</td></tr>}
            {sales.map(r => (
              <tr key={r.id}>
                <td style={s.td}>{r.userName}</td>
                <td style={s.td}>₹{(r.onlineTotal || 0).toFixed(2)}</td>
                <td style={s.td}>₹{(r.cashSales || 0).toFixed(2)}</td>
                <td style={{ ...s.td, fontWeight: 700, color: '#4ade80' }}>₹{(r.grandTotal || 0).toFixed(2)}</td>
                <td style={{ ...s.td, color: '#64748b' }}>{r.notes || '—'}</td>
                <td style={s.td}>
                  <button
                    style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem', background: '#1e3a5f', color: '#60a5fa' }}
                    onClick={() => setEditingSale(r)}
                  >✏ Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingSale && (
        <SalesDashEditModal
          record={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            setEditingSale(null)
            getAllSales(todayStr).then(setSales)
          }}
        />
      )}
    </div>
  )
}

const ONLINE_METHODS = ['UPI / QR Pay', 'Wallet']

function SalesDashEditModal({ record, onClose, onSaved }) {
  const [online, setOnline] = useState(
    Object.fromEntries(ONLINE_METHODS.map(m => [m, record.onlineSales?.[m] || '']))
  )
  const [cash, setCash] = useState(String(record.cashSales || ''))
  const [notes, setNotes] = useState(record.notes || '')
  const [saving, setSaving] = useState(false)

  const onlineTotal = ONLINE_METHODS.reduce((sum, m) => sum + (parseFloat(online[m]) || 0), 0)
  const grandTotal = onlineTotal + (parseFloat(cash) || 0)

  async function handleSave() {
    setSaving(true)
    try {
      await updateSalesRecord(record.id, {
        onlineSales: online, onlineTotal,
        cashSales: parseFloat(cash) || 0, grandTotal, notes,
      })
      onSaved()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const ov = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }
  const mo = { background: '#1e293b', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, border: '1px solid #334155' }
  const fi = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }
  const lb = { display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: 4 }

  return (
    <div style={ov} onClick={onClose}>
      <div style={mo} onClick={e => e.stopPropagation()}>
        <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>✏ Edit Sales — {record.userName}</div>
        <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 18 }}>{record.date}</div>

        <div style={{ marginBottom: 14 }}>
          <label style={lb}>Online Sales</label>
          {ONLINE_METHODS.map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem', width: 120, flexShrink: 0 }}>{m}</span>
              <input style={{ ...fi, textAlign: 'right' }} type="number" min="0" step="0.01"
                value={online[m]} onChange={e => setOnline(p => ({ ...p, [m]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lb}>Cash Sales (₹)</label>
            <input style={fi} type="number" min="0" step="0.01" value={cash} onChange={e => setCash(e.target.value)} />
          </div>
          <div>
            <label style={lb}>Grand Total</label>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '1.1rem', padding: '8px 0' }}>₹{grandTotal.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={lb}>Notes</label>
          <input style={fi} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontWeight: 700, background: '#0f172a', color: '#64748b' }} onClick={onClose}>Cancel</button>
          <button style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#3b82f6', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
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
        <Route path="qr-print" element={<ShopQRPrint />} />
        <Route path="expenses" element={<ExpenseRecorder />} />
        <Route path="reports" element={<Reports />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="attendance" element={<AttendanceManager />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="backup" element={<BackupRestore />} />
        <Route path="config" element={<AppConfig />} />
      </Routes>
    </div>
  )
}

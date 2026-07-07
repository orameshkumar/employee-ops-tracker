import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'

const s = {
  wrap: { padding: 24 },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 16 },
  infoBox: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
    padding: '12px 16px', marginBottom: 20, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.7,
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  card: { background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155', textAlign: 'center' },
  name: { color: '#e2e8f0', fontWeight: 700, marginBottom: 2, fontSize: '0.95rem' },
  email: { color: '#64748b', fontSize: '0.72rem', marginBottom: 10 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: '#1e3a5f', color: '#60a5fa', marginBottom: 10 },
  canvas: { borderRadius: 8, background: '#fff', padding: 6 },
  note: { fontSize: '0.72rem', color: '#475569', margin: '8px 0 4px', lineHeight: 1.5 },
  dl: { display: 'block', marginTop: 8, padding: '7px 14px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', width: '100%', background: '#3b82f6', color: '#fff' },
}

export default function QRGenerator() {
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'employee'))
    })
  }, [])

  return (
    <div style={s.wrap}>
      <div style={s.title}>🔑 Employee QR Codes</div>
      <div style={s.sub}>Personal QR codes for each employee — works for both check-in and check-out</div>

      <div style={s.infoBox}>
        <strong style={{ color: '#e2e8f0' }}>How these work:</strong> Each employee has one personal QR code.
        When scanned, it automatically detects the action —
        <span style={{ color: '#4ade80' }}> checks IN</span> if they have no active session,
        or <span style={{ color: '#f87171' }}> checks OUT</span> if they are currently checked in.
        <br />
        <strong style={{ color: '#e2e8f0' }}>Tip:</strong> For a shop wall display, use the{' '}
        <Link to="/manager/qr-print" style={{ color: '#38bdf8' }}>🖨️ Print Shop QR Codes</Link>{' '}
        instead — two separate QR codes (one for IN, one for OUT) posted at the entrance and exit.
      </div>

      <Link
        to="/manager/qr-print"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '9px 18px', borderRadius: 8, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}
      >
        🖨️ Print Shop Check-In / Check-Out QR Codes
      </Link>

      <div style={s.grid}>
        {employees.map(emp => <EmployeeQR key={emp.id} employee={emp} />)}
      </div>
      {employees.length === 0 && (
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>
          No employees found. Employees are added when they register or first log in.
        </div>
      )}
    </div>
  )
}

function EmployeeQR({ employee }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const payload = JSON.stringify({ uid: employee.id, name: employee.name })
    QRCode.toCanvas(canvasRef.current, payload, { width: 164, margin: 1 })
  }, [employee.id])

  function download() {
    const url = canvasRef.current.toDataURL()
    const a = document.createElement('a')
    a.href = url
    a.download = `qr_${employee.name.replace(/\s+/g, '_')}.png`
    a.click()
  }

  return (
    <div style={s.card}>
      <div style={s.name}>{employee.name}</div>
      <div style={s.email}>{employee.email}</div>
      <div style={s.badge}>✅ Check-In &nbsp;|&nbsp; 🔴 Check-Out</div>
      <canvas ref={canvasRef} style={s.canvas} />
      <div style={s.note}>
        Scans as <strong>Check-In</strong> when not checked in,<br />
        <strong>Check-Out</strong> when currently active.
      </div>
      <button onClick={download} style={s.dl}>⬇ Download QR</button>
    </div>
  )
}

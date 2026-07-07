import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'

const s = {
  wrap: { padding: 24 },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  card: { background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155', textAlign: 'center' },
  name: { color: '#e2e8f0', fontWeight: 700, marginBottom: 4, fontSize: '0.9rem' },
  email: { color: '#64748b', fontSize: '0.75rem', marginBottom: 12 },
  canvas: { borderRadius: 8, background: '#fff', padding: 6 },
  dl: { display: 'block', marginTop: 10, padding: '6px 14px', background: '#3b82f6', color: '#fff', borderRadius: 6, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 600 },
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
      <div style={s.sub}>Each employee scans their personal QR code to check in/out</div>

      <Link
        to="/manager/qr-print"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '9px 18px', borderRadius: 8, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}
      >
        🖨️ Print Shop Check-In / Check-Out QR Codes
      </Link>

      <div style={s.grid}>
        {employees.map(emp => <EmployeeQR key={emp.id} employee={emp} />)}
      </div>
      {employees.length === 0 && <div style={{ color: '#475569' }}>No employees found. Employees are added when they first log in.</div>}
    </div>
  )
}

function EmployeeQR({ employee }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const payload = JSON.stringify({ uid: employee.id, name: employee.name })
    QRCode.toCanvas(canvasRef.current, payload, { width: 160, margin: 1 })
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
      <canvas ref={canvasRef} style={s.canvas} />
      <button onClick={download} style={{ ...s.dl, border: 'none', cursor: 'pointer', width: '100%' }}>⬇ Download QR</button>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { checkIn, checkOut, getTodayAttendance } from '../../firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'

const s = {
  wrap: { padding: 24, maxWidth: 500, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 16 },
  status: { fontSize: '0.9rem', color: '#94a3b8', marginBottom: 12 },
  badge: (c) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: c === 'in' ? '#14532d' : c === 'out' ? '#1e3a5f' : '#3b2a00', color: c === 'in' ? '#4ade80' : c === 'out' ? '#60a5fa' : '#fbbf24' }),
  scanBox: { width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  btn: (c) => ({ padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: c === 'green' ? '#16a34a' : c === 'gray' ? '#64748b' : '#3b82f6', color: '#fff', marginRight: 8 }),
  msg: (ok) => ({ padding: '10px 14px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem', background: ok ? '#14532d' : '#450a0a', color: ok ? '#4ade80' : '#fca5a5', border: `1px solid ${ok ? '#16a34a' : '#ef4444'}` }),
  timeRow: { display: 'flex', gap: 20, marginTop: 8 },
  timeItem: { fontSize: '0.8rem', color: '#64748b' },
  timeVal: { color: '#e2e8f0', fontWeight: 600 },
}

export default function QRScanner() {
  const { user, profile } = useAuth()
  const [attendance, setAttendance] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanMode, setScanMode] = useState(null)
  const [message, setMessage] = useState(null)
  const scannerInstanceRef = useRef(null)

  useEffect(() => {
    getTodayAttendance(user.uid).then(setAttendance).catch(console.error)
  }, [user.uid])

  async function startScan(mode) {
    setScanMode(mode)
    setScanning(true)
    setMessage(null)

    setTimeout(() => {
      const scanner = new Html5Qrcode('qr-reader')
      scannerInstanceRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          try {
            await scanner.stop()
          } catch (e) {
            console.error('Scanner stop error:', e)
          }
          scannerInstanceRef.current = null
          setScanning(false)
          await handleScan(decodedText, mode)
        },
        () => {}
      ).catch(err => {
        console.error('Scanner start error:', err)
        setScanning(false)
        setMessage({ ok: false, text: 'Could not access camera. Please check permissions.' })
      })
    }, 300)
  }

  async function handleScan(text, mode) {
    try {
      const data = JSON.parse(text)
      if (data.uid !== user.uid) {
        setMessage({ ok: false, text: 'QR code does not match your account.' })
        return
      }
      if (mode === 'in') {
        await checkIn(user.uid, profile?.name || user.email)
        setMessage({ ok: true, text: '✅ Checked in successfully!' })
      } else {
        await checkOut(user.uid)
        setMessage({ ok: true, text: '✅ Checked out successfully!' })
      }
      const updated = await getTodayAttendance(user.uid)
      setAttendance(updated)
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
  }

  async function stopScan() {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop()
      } catch (e) {
        console.error('Scanner stop error:', e)
      }
      scannerInstanceRef.current = null
    }
    setScanning(false)
  }

  const status = !attendance ? 'none' : attendance.checkOut ? 'out' : 'in'

  return (
    <div style={s.wrap}>
      <div style={s.title}>📲 QR Attendance</div>
      <div style={s.sub}>Scan your personal QR code to check in or out</div>

      <div style={s.card}>
        <div style={s.status}>
          Today's Status:{' '}
          <span style={s.badge(status)}>
            {status === 'none' ? 'Not Checked In' : status === 'in' ? 'Checked In' : 'Checked Out'}
          </span>
        </div>
        {attendance && (
          <div style={s.timeRow}>
            {attendance.checkIn && <div style={s.timeItem}>Check In <div style={s.timeVal}>{fmtTime(attendance.checkIn)}</div></div>}
            {attendance.checkOut && <div style={s.timeItem}>Check Out <div style={s.timeVal}>{fmtTime(attendance.checkOut)}</div></div>}
          </div>
        )}
      </div>

      {!scanning && (
        <div style={{ display: 'flex', gap: 10 }}>
          {status === 'none' && <button style={s.btn('green')} onClick={() => startScan('in')}>📷 Scan Check-In</button>}
          {status === 'in' && <button style={s.btn('blue')} onClick={() => startScan('out')}>📷 Scan Check-Out</button>}
        </div>
      )}

      {scanning && (
        <div style={s.card}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8 }}>
            📸 Scanning for {scanMode === 'in' ? 'Check-In' : 'Check-Out'}…
          </div>
          <div id="qr-reader" style={s.scanBox} />
          <button style={{ ...s.btn('gray'), marginTop: 8 }} onClick={stopScan}>Cancel</button>
        </div>
      )}

      {message && <div style={s.msg(message.ok)}>{message.text}</div>}
    </div>
  )
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

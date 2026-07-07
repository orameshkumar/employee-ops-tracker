import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { checkIn, checkOut, getTodayAttendance } from '../../firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useAppSettings'

const s = {
  wrap: { padding: 24, maxWidth: 520, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 18, border: '1px solid #334155', marginBottom: 14 },
  scanBox: { width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  btn: (c) => ({
    padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.9rem', marginRight: 8,
    background: c === 'green' ? '#16a34a' : c === 'red' ? '#b91c1c' : c === 'gray' ? '#475569' : '#3b82f6',
    color: '#fff',
  }),
  msg: (ok) => ({
    padding: '10px 14px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem',
    background: ok ? '#14532d' : '#450a0a', color: ok ? '#4ade80' : '#fca5a5',
    border: `1px solid ${ok ? '#16a34a' : '#ef4444'}`,
  }),
  timeline: { marginTop: 10 },
  session: (open) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: 8, marginBottom: 6, fontSize: '0.82rem',
    background: open ? '#0f2d1f' : '#0f172a',
    border: `1px solid ${open ? '#16a34a' : '#1e293b'}`,
  }),
  dot: (open) => ({
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    background: open ? '#22c55e' : '#3b82f6',
  }),
  sessionNum: { color: '#475569', fontSize: '0.72rem', width: 20, flexShrink: 0 },
  timeLabel: { color: '#64748b', fontSize: '0.75rem' },
  timeVal: { color: '#e2e8f0', fontWeight: 600 },
  shopHours: { display: 'flex', gap: 16, padding: '8px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 12 },
  hourItem: { fontSize: '0.78rem' },
  warningBox: { background: '#2d1b00', border: '1px solid #d97706', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#fcd34d', marginBottom: 12 },
}

export default function QRScanner() {
  const { user, profile } = useAuth()
  const { settings } = useAppSettings()
  const [sessions, setSessions] = useState([])
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState(null)
  const scannerInstanceRef = useRef(null)

  async function reload() {
    const list = await getTodayAttendance(user.uid).catch(() => [])
    setSessions(list)
  }

  useEffect(() => { reload() }, [user.uid])

  const openSession = sessions.find(s => s.checkIn && !s.checkOut)
  const isCheckedIn = !!openSession
  const sessionCount = sessions.length

  // Determine if closure tasks should be required for this sign-out
  function requireClosureForSignOut() {
    const endTime = settings.shopEndTime || '21:00'
    const [eh, em] = endTime.split(':').map(Number)
    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const endMins = eh * 60 + em
    return nowMins >= endMins
  }

  const isPastShopEnd = requireClosureForSignOut()
  const closureReady = openSession?.closureComplete === true

  async function startScan() {
    setScanning(true)
    setMessage(null)
    setTimeout(() => {
      const scanner = new Html5Qrcode('qr-reader')
      scannerInstanceRef.current = scanner
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async (decodedText) => {
          try { await scanner.stop() } catch (e) { console.error(e) }
          scannerInstanceRef.current = null
          setScanning(false)
          await handleScan(decodedText)
        },
        () => {}
      ).catch(err => {
        console.error('Scanner start error:', err)
        setScanning(false)
        setMessage({ ok: false, text: 'Could not access camera. Please check permissions.' })
      })
    }, 300)
  }

  async function handleScan(text) {
    try {
      const data = JSON.parse(text)
      if (data.uid !== user.uid) {
        setMessage({ ok: false, text: 'QR code does not match your account.' })
        return
      }
      if (!isCheckedIn) {
        await checkIn(user.uid, profile?.name || user.email)
        setMessage({ ok: true, text: `✅ Session ${sessionCount + 1} started — checked in!` })
      } else {
        const needsClosure = requireClosureForSignOut()
        await checkOut(user.uid, needsClosure)
        setMessage({ ok: true, text: needsClosure ? '✅ Final sign-out complete!' : '✅ Checked out (break/lunch).' })
      }
      await reload()
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
  }

  async function stopScan() {
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.stop() } catch (e) { console.error(e) }
      scannerInstanceRef.current = null
    }
    setScanning(false)
  }

  const startTime = settings.shopStartTime || '09:00'
  const endTime = settings.shopEndTime || '21:00'

  return (
    <div style={s.wrap}>
      <div style={s.title}>📲 QR Attendance</div>
      <div style={s.sub}>Scan your QR code to check in or out. Multiple sessions supported.</div>

      <div style={s.card}>
        <div style={s.shopHours}>
          <div style={s.hourItem}>
            <div style={s.timeLabel}>Shop Opens</div>
            <div style={{ ...s.timeVal, color: '#38bdf8' }}>{fmt12(startTime)}</div>
          </div>
          <div style={s.hourItem}>
            <div style={s.timeLabel}>Shop Closes</div>
            <div style={{ ...s.timeVal, color: '#f97316' }}>{fmt12(endTime)}</div>
          </div>
          <div style={s.hourItem}>
            <div style={s.timeLabel}>Sessions Today</div>
            <div style={{ ...s.timeVal, color: '#a855f7' }}>{sessionCount}</div>
          </div>
        </div>

        {isPastShopEnd && isCheckedIn && !closureReady && (
          <div style={s.warningBox}>
            ⚠️ It's past closing time. Complete <strong>Closure Tasks</strong> before scanning out.
          </div>
        )}

        <div style={s.timeline}>
          {sessions.length === 0 && (
            <div style={{ color: '#475569', fontSize: '0.82rem' }}>No sessions recorded today yet.</div>
          )}
          {sessions.map((sess, i) => {
            const open = sess.checkIn && !sess.checkOut
            return (
              <div key={sess.id} style={s.session(open)}>
                <div style={s.dot(open)} />
                <div style={s.sessionNum}>#{i + 1}</div>
                <div style={{ flex: 1, display: 'flex', gap: 20 }}>
                  <div>
                    <div style={s.timeLabel}>In</div>
                    <div style={s.timeVal}>{fmtTime(sess.checkIn)}</div>
                  </div>
                  {sess.checkOut && (
                    <div>
                      <div style={s.timeLabel}>Out</div>
                      <div style={s.timeVal}>{fmtTime(sess.checkOut)}</div>
                    </div>
                  )}
                  {open && (
                    <div>
                      <div style={s.timeLabel}>Duration</div>
                      <div style={{ ...s.timeVal, color: '#22c55e' }}>{elapsed(sess.checkIn)}</div>
                    </div>
                  )}
                </div>
                {open && <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 700 }}>ACTIVE</span>}
                {!open && sess.checkOut && (
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>
                    {duration(sess.checkIn, sess.checkOut)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {!scanning && (
        <div style={{ display: 'flex', gap: 10 }}>
          {!isCheckedIn && (
            <button style={s.btn('green')} onClick={startScan}>📷 Scan Check-In</button>
          )}
          {isCheckedIn && (
            <button
              style={s.btn(isPastShopEnd && !closureReady ? 'gray' : 'red')}
              onClick={isPastShopEnd && !closureReady ? undefined : startScan}
              disabled={isPastShopEnd && !closureReady}
              title={isPastShopEnd && !closureReady ? 'Complete closure tasks first' : ''}
            >
              📷 Scan Check-Out{isPastShopEnd ? ' (Final)' : ' (Break)'}
            </button>
          )}
        </div>
      )}

      {scanning && (
        <div style={s.card}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8 }}>
            📸 Scanning for {isCheckedIn ? 'Check-Out' : 'Check-In'}…
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

function fmt12(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function elapsed(checkInTs) {
  if (!checkInTs) return ''
  const start = checkInTs.toDate ? checkInTs.toDate() : new Date(checkInTs)
  const diffMs = Date.now() - start.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function duration(inTs, outTs) {
  if (!inTs || !outTs) return ''
  const start = inTs.toDate ? inTs.toDate() : new Date(inTs)
  const end = outTs.toDate ? outTs.toDate() : new Date(outTs)
  const mins = Math.round((end - start) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

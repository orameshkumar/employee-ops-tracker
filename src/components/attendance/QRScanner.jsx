import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { checkIn, checkOut, getTodayAttendance } from '../../firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { useAppSettings } from '../../hooks/useAppSettings'

async function collectDiag() {
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost'
  const hasMediaDevices = !!(navigator.mediaDevices?.getUserMedia)
  let permState = 'unknown'
  try {
    const p = await navigator.permissions.query({ name: 'camera' })
    permState = p.state
  } catch (_) {}
  const ua = navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua)
  return { isHttps, hasMediaDevices, permState, isIOS, isSafari, ua: ua.slice(0, 100) }
}

const s = {
  wrap: { padding: 24, maxWidth: 520, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 18, border: '1px solid #334155', marginBottom: 14 },
  // #qr-reader must be visible in DOM — do NOT use display:none or overflow:hidden
  scanBox: { width: '100%', minHeight: 300, borderRadius: 8, overflow: 'visible', background: '#000', position: 'relative' },
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
  session: (open) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    borderRadius: 8, marginBottom: 6, fontSize: '0.82rem',
    background: open ? '#0f2d1f' : '#0f172a',
    border: `1px solid ${open ? '#16a34a' : '#1e293b'}`,
  }),
  dot: (open) => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: open ? '#22c55e' : '#3b82f6' }),
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
  const scannerRef = useRef(null)
  const [permState, setPermState] = useState('idle') // 'idle' | 'requesting' | 'granted' | 'denied'
  const [diag, setDiag] = useState(null)

  // Keep a ref to latest state so the scanner callback doesn't use stale closures
  const stateRef = useRef({})
  stateRef.current = { user, profile, settings, sessions }

  async function reload() {
    const list = await getTodayAttendance(user.uid).catch(() => [])
    setSessions(list)
  }

  useEffect(() => { reload() }, [user.uid])
  useEffect(() => { collectDiag().then(setDiag) }, [])

  // Explicitly request camera permission before starting the scanner.
  // This triggers the browser's native permission prompt on iOS / Android,
  // lets us detect denial clearly, and releases the test stream before
  // html5-qrcode opens its own stream.
  async function requestCameraAndScan() {
    setMessage(null)
    setPermState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach(t => t.stop()) // release immediately; scanner will re-open
      setPermState('granted')
      setScanning(true)
    } catch (err) {
      setPermState('denied')
      const name = err?.name || ''
      const d = await collectDiag()
      setDiag(d)
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        const iosHint = d.isIOS ? '\n\niOS: Settings → Safari → Camera → Allow' : '\n\nTap the 🔒 icon in the address bar → allow Camera → refresh.'
        setMessage({ ok: false, text: `🚫 Camera permission denied. [${name}]${iosHint}` })
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMessage({ ok: false, text: `📷 No camera found. [${name}]\n\nMake sure your device has a camera and it is not disabled.` })
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setMessage({ ok: false, text: `📷 Camera is in use by another app. [${name}]\n\nClose other apps using the camera and try again.` })
      } else if (name === 'SecurityError') {
        setMessage({ ok: false, text: `🔒 Camera blocked — app must be on HTTPS. [${name}]` })
      } else if (name === 'OverconstrainedError') {
        setMessage({ ok: false, text: `📷 Back camera not available. [${name}]\n\nTrying without camera preference — tap the button again.` })
      } else {
        setMessage({ ok: false, text: `Camera error: [${name}] ${err?.message || 'Unknown'}\n\nUA: ${navigator.userAgent.slice(0, 80)}` })
      }
    }
  }

  // ── Start / stop camera using useEffect so #qr-reader is guaranteed in DOM ──
  useEffect(() => {
    if (!scanning) return

    const { user, profile, settings, sessions } = stateRef.current
    const openSession = sessions.find(s => s.checkIn && !s.checkOut)
    const isCheckedIn = !!openSession
    const sessionCount = sessions.length

    function requireClosure() {
      const [eh, em] = (settings.shopEndTime || '21:00').split(':').map(Number)
      const now = new Date()
      return now.getHours() * 60 + now.getMinutes() >= eh * 60 + em
    }

    const qrboxSize = Math.min(250, Math.max(200, (window.innerWidth || 400) - 80))
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: qrboxSize, height: qrboxSize } },
      async (decodedText) => {
        try { await scanner.stop() } catch (_) {}
        scannerRef.current = null
        setScanning(false)
        setPermState('idle')
        try {
          const data = JSON.parse(decodedText)

          // Shop QR: { action: "in" | "out" }
          if (data.action) {
            if (data.action === 'in') {
              await checkIn(user.uid, profile?.name || user.email)
              setMessage({ ok: true, text: `✅ Session ${sessionCount + 1} started — checked in!` })
            } else if (data.action === 'out') {
              const needsClosure = requireClosure()
              await checkOut(user.uid, needsClosure)
              setMessage({ ok: true, text: needsClosure ? '✅ Final sign-out complete!' : '✅ Checked out (break/lunch).' })
            }
            reload()
            return
          }

          // Legacy per-employee QR: { uid, name }
          if (data.uid && data.uid !== user.uid) {
            setMessage({ ok: false, text: 'QR code does not match your account.' })
            return
          }
          if (!isCheckedIn) {
            await checkIn(user.uid, profile?.name || user.email)
            setMessage({ ok: true, text: `✅ Session ${sessionCount + 1} started — checked in!` })
          } else {
            const needsClosure = requireClosure()
            await checkOut(user.uid, needsClosure)
            setMessage({ ok: true, text: needsClosure ? '✅ Final sign-out complete!' : '✅ Checked out (break/lunch).' })
          }
          reload()
        } catch (err) {
          setMessage({ ok: false, text: err.message })
        }
      },
      () => {} // frame error — ignore
    ).catch(err => {
      console.error('Camera error:', err)
      scannerRef.current = null
      setScanning(false)
      setPermState('idle')
      const msg = err?.message?.toLowerCase() || ''
      if (msg.includes('permission') || msg.includes('notallowed')) {
        setMessage({ ok: false, text: '🚫 Camera permission denied. Allow camera access in your browser settings and try again.' })
      } else if (msg.includes('notfound') || msg.includes('devicenotfound')) {
        setMessage({ ok: false, text: '📷 No camera found on this device.' })
      } else {
        setMessage({ ok: false, text: `Camera error: ${err?.message || 'Unknown error'}` })
      }
    })

    // Cleanup: stop camera when scanning becomes false or component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanning]) // ← runs after DOM update — #qr-reader is guaranteed to exist

  async function stopScan() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch (_) {}
      scannerRef.current = null
    }
    setScanning(false)
    setPermState('idle')
  }

  const openSession = sessions.find(s => s.checkIn && !s.checkOut)
  const isCheckedIn = !!openSession
  const sessionCount = sessions.length

  function requireClosureForSignOut() {
    const [eh, em] = (settings.shopEndTime || '21:00').split(':').map(Number)
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes() >= eh * 60 + em
  }

  const isPastShopEnd = requireClosureForSignOut()
  const closureReady = openSession?.closureComplete === true
  const startTime = settings.shopStartTime || '09:00'
  const endTime = settings.shopEndTime || '21:00'

  return (
    <div style={s.wrap}>
      <div style={s.title}>📲 QR Attendance</div>
      <div style={s.sub}>Scan the shop QR code to check in or out. Multiple sessions supported.</div>

      {/* ── Camera status card — always visible ── */}
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 14, border: '1px solid #334155', marginBottom: 14 }}>
        <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem', marginBottom: 10, letterSpacing: '0.05em' }}>📋 CAMERA STATUS</div>
        {diag ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'HTTPS (required)',  ok: diag.isHttps,         val: diag.isHttps ? '✅ Yes' : '❌ No — camera needs HTTPS' },
              { label: 'Camera API',        ok: diag.hasMediaDevices, val: diag.hasMediaDevices ? '✅ Supported' : '❌ Not supported — try Chrome or Safari' },
              { label: 'Permission',        ok: diag.permState === 'granted' ? true : diag.permState === 'denied' ? false : null,
                val: diag.permState === 'granted' ? '✅ Granted' : diag.permState === 'denied' ? '❌ Denied — check browser settings' : '⚠️ ' + diag.permState },
              { label: 'Device / Browser',  ok: null,
                val: `${diag.isIOS ? '🍎 iOS' : '🤖 Android/Other'} · ${diag.isSafari ? 'Safari' : 'Other browser'}${diag.isIOS && !diag.isSafari ? ' ⚠️ iOS needs Safari' : ''}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                  background: row.ok === true ? '#22c55e' : row.ok === false ? '#ef4444' : '#f59e0b' }} />
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{row.label}</div>
                  <div style={{ color: row.ok === false ? '#fca5a5' : '#e2e8f0', fontWeight: 600 }}>{row.val}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#475569', fontSize: '0.85rem' }}>⏳ Checking device capabilities…</div>
        )}
      </div>

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

        <div>
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
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>{duration(sess.checkIn, sess.checkOut)}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scan button */}
      {!scanning && (
        <div style={{ display: 'flex', gap: 10 }}>
          {!isCheckedIn && (
            <button
              style={s.btn('green')}
              onClick={requestCameraAndScan}
              disabled={permState === 'requesting'}
            >
              {permState === 'requesting' ? '⏳ Requesting camera…' : '📷 Scan Check-In'}
            </button>
          )}
          {isCheckedIn && (
            <button
              style={s.btn(isPastShopEnd && !closureReady ? 'gray' : 'red')}
              onClick={isPastShopEnd && !closureReady ? undefined : requestCameraAndScan}
              disabled={(isPastShopEnd && !closureReady) || permState === 'requesting'}
              title={isPastShopEnd && !closureReady ? 'Complete closure tasks first' : ''}
            >
              {permState === 'requesting' ? '⏳ Requesting camera…' : `📷 Scan Check-Out${isPastShopEnd ? ' (Final)' : ' (Break)'}`}
            </button>
          )}
        </div>
      )}

      {/* Camera view — rendered when scanning is true so #qr-reader exists in DOM
          when the useEffect fires. Do NOT hide with display:none or overflow:hidden. */}
      {scanning && (
        <div style={s.card}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8 }}>
            📸 Point camera at the shop QR code…
          </div>
          <div id="qr-reader" style={s.scanBox} />
          <button style={{ ...s.btn('gray'), marginTop: 10 }} onClick={stopScan}>✕ Cancel</button>
        </div>
      )}

      {message && (
        <div style={s.msg(message.ok)}>
          {message.text.split('\n').map((line, i) => <div key={i}>{line || <br />}</div>)}
        </div>
      )}

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
  const mins = Math.floor((Date.now() - start.getTime()) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function duration(inTs, outTs) {
  if (!inTs || !outTs) return ''
  const start = inTs.toDate ? inTs.toDate() : new Date(inTs)
  const end = outTs.toDate ? outTs.toDate() : new Date(outTs)
  const mins = Math.round((end - start) / 60000)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

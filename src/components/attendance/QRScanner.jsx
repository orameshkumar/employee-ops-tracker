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
  // #qr-reader: no overflow:hidden, no borderRadius that clips the video element html5-qrcode injects
  scanBox: { width: '100%', minHeight: 300, background: '#000' },
  btn: (c) => ({
    padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.9rem', marginRight: 8,
    background: c === 'green' ? '#16a34a' : c === 'red' ? '#b91c1c' : c === 'gray' ? '#475569' : '#3b82f6',
    color: '#fff',
  }),
  msg: (ok) => ({
    padding: '10px 14px', borderRadius: 8, marginTop: 12, fontSize: '0.85rem',
    background: ok === true ? '#14532d' : ok === false ? '#450a0a' : '#1e293b',
    color:      ok === true ? '#4ade80' : ok === false ? '#fca5a5' : '#94a3b8',
    border: `1px solid ${ok === true ? '#16a34a' : ok === false ? '#ef4444' : '#334155'}`,
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
  const cameraIdRef = useRef(null) // resolved deviceId for back camera
  const [permState, setPermState] = useState('idle') // 'idle' | 'requesting' | 'granted' | 'denied'

  // Keep a ref to latest state so the scanner callback doesn't use stale closures
  const stateRef = useRef({})
  stateRef.current = { user, profile, settings, sessions }

  async function reload() {
    const list = await getTodayAttendance(user.uid).catch(() => [])
    setSessions(list)
  }

  useEffect(() => { reload() }, [user.uid])

  async function resolveCamera() {
    // Use enumerateDevices instead of Html5Qrcode.getCameras() — getCameras()
    // opens and closes camera hardware internally, causing a release delay that
    // makes the subsequent scanner.start() get a black feed or fail entirely.
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === 'videoinput')
      if (cams.length > 0) {
        const back = cams.find(c => /back|rear|environment/i.test(c.label)) || cams[cams.length - 1]
        cameraIdRef.current = back?.deviceId || null
      }
    } catch (_) { cameraIdRef.current = null }
  }

  async function requestCameraAndScan() {
    setMessage(null)
    setPermState('requesting')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage({ ok: false, text: '⛔ Camera API not supported.\n\nUse Chrome or Safari on this device.' })
        setPermState('denied')
        return
      }

      let permGranted = false
      try {
        const p = await navigator.permissions.query({ name: 'camera' })
        permGranted = p.state === 'granted'
      } catch (_) {}

      if (permGranted) {
        setPermState('granted')
        await resolveCamera()
        setScanning(true)
        return
      }

      const ua = navigator.userAgent
      const isIOS = /iphone|ipad|ipod/i.test(ua)
      const iosHint = isIOS
        ? '\n\niOS fix: Settings → Safari → Camera → Allow, then reload.'
        : '\n\nFix: tap the 🔒 icon in the address bar → allow Camera → reload.'

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      } catch (err) {
        const name = err?.name || ''
        setPermState('denied')
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setMessage({ ok: false, text: `🚫 Camera permission denied. [${name}]${iosHint}` })
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setMessage({ ok: false, text: `📷 No camera found on this device. [${name}]` })
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setMessage({ ok: false, text: `📷 Camera is in use by another app. [${name}]\n\nClose other camera apps and try again.` })
        } else {
          setMessage({ ok: false, text: `Camera error: [${name}] ${err?.message || 'Unknown error'}` })
        }
        return
      }

      stream.getTracks().forEach(t => t.stop())
      setPermState('granted')

      await resolveCamera()
      // Brief pause so camera hardware fully releases before html5-qrcode reopens it.
      setTimeout(() => setScanning(true), 400)

    } catch (outerErr) {
      console.error('requestCameraAndScan unexpected error:', outerErr)
      setPermState('idle')
      setMessage({ ok: false, text: `Unexpected error: [${outerErr?.name || 'Error'}] ${outerErr?.message || String(outerErr)}` })
    }
  }

  // ── Start / stop camera using useEffect so #qr-reader is guaranteed in DOM ──
  useEffect(() => {
    if (!scanning) return
    setMessage(null)

    const { user, profile, settings, sessions } = stateRef.current
    const openSession = sessions.find(s => s.checkIn && !s.checkOut)
    const isCheckedIn = !!openSession
    const sessionCount = sessions.length

    function requireClosure() {
      const [eh, em] = (settings.shopEndTime || '21:00').split(':').map(Number)
      const now = new Date()
      return now.getHours() * 60 + now.getMinutes() >= eh * 60 + em
    }

    const qrboxSize = Math.min(250, Math.max(180, (window.innerWidth || 400) - 80))
    const scanner = new Html5Qrcode('qr-reader', { verbose: false })
    scannerRef.current = scanner

    // cameraIdRef resolved in requestCameraAndScan (async, before setScanning).
    // Using deviceId is more reliable than facingMode on Android (no black feed).
    const cameraConstraint = cameraIdRef.current
      ? { deviceId: { exact: cameraIdRef.current } }
      : { facingMode: 'environment' }

    scanner.start(
      cameraConstraint,
      { fps: 10, qrbox: { width: qrboxSize, height: qrboxSize } },
      async (decodedText) => {
        try { await scanner.stop() } catch (_) {}
        scannerRef.current = null
        setScanning(false)
        setPermState('idle')
        try {
          const data = JSON.parse(decodedText)
          if (data.action) {
            if (data.action === 'in') {
              await checkIn(user.uid, profile?.name || user.email)
              setMessage({ ok: true, text: `✅ Session ${sessionCount + 1} started — checked in!` })
            } else if (data.action === 'out') {
              const needsClosure = requireClosure()
              await checkOut(user.uid, needsClosure)
              setMessage({ ok: true, text: needsClosure ? '✅ Final sign-out complete!' : '✅ Checked out (break/lunch).' })
            }
            reload(); return
          }
          if (data.uid && data.uid !== user.uid) {
            setMessage({ ok: false, text: 'QR code does not match your account.' }); return
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
      () => {} // frame decode error — ignore
    ).then(() => {
      // scanner.start() resolves when camera is open — patch playsinline for iOS Safari
      const v = document.querySelector('#qr-reader video')
      if (v) {
        v.setAttribute('playsinline', '')
        v.setAttribute('webkit-playsinline', '')
        v.muted = true
      }
    }).catch(err => {
      console.error('Scanner start error:', err)
      scannerRef.current = null
      setScanning(false)
      setPermState('idle')
      const name = err?.name || ''
      const msg  = err?.message?.toLowerCase() || ''
      if (name === 'NotAllowedError' || msg.includes('permission') || msg.includes('notallowed')) {
        setMessage({ ok: false, text: `🚫 Camera permission denied. [${name || 'NotAllowedError'}]\n\nAllow camera access in your browser settings and try again.` })
      } else if (name === 'NotFoundError' || msg.includes('notfound')) {
        setMessage({ ok: false, text: `📷 No camera found. [${name}]` })
      } else {
        setMessage({ ok: false, text: `Camera error: [${name}] ${err?.message || 'Unknown'}` })
      }
    })

    // Cleanup: stop camera when scanning becomes false or component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanning])

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

      {/* Progress / error message — shown right above the button so it's always visible */}
      {message && (
        <div style={s.msg(message.ok)}>
          {message.text.split('\n').map((line, i) => <div key={i}>{line || <br />}</div>)}
        </div>
      )}

      {/* Scan button */}
      {!scanning && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
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
              onClick={isPastShopEnd && !closureReady
                ? () => setMessage({ ok: false, text: '⚠️ Complete Closure Tasks before checking out.\n\nGo to Closure Tasks, finish the checklist, then come back to scan out.' })
                : requestCameraAndScan}
              disabled={permState === 'requesting'}
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

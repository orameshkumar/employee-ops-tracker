import { useRef, useState, useEffect } from 'react'
import { loadSettings, DEFAULT_SETTINGS } from '../../hooks/useAppSettings'

const s = {
  wrap:     { marginTop: 10 },
  video:    { width: '100%', maxWidth: 360, borderRadius: 8, border: '2px solid #334155', display: 'block' },
  preview:  { width: '100%', maxWidth: 360, borderRadius: 8, border: '2px solid #22c55e', display: 'block' },
  btnRow:   { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  btn:      { padding: '9px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  label:    { fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 },
  meta:     { fontSize: '0.7rem', color: '#475569', marginTop: 4 },
  diag:     { marginTop: 10, background: '#0f172a', borderRadius: 8, padding: '10px 12px', border: '1px solid #334155', fontSize: '0.72rem', color: '#64748b' },
  diagRow:  { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 },
  dot:      (ok) => ({ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: ok === true ? '#22c55e' : ok === false ? '#ef4444' : '#f59e0b' }),
  err:      { marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '0.82rem', lineHeight: 1.5 },
  warn:     { marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#2d1b00', border: '1px solid #d97706', color: '#fcd34d', fontSize: '0.82rem', lineHeight: 1.5 },
  info:     { marginTop: 8, padding: '10px 12px', borderRadius: 8, background: '#0f2d3d', border: '1px solid #0284c7', color: '#7dd3fc', fontSize: '0.82rem', lineHeight: 1.5 },
  step:     { fontSize: '0.78rem', color: '#64748b', marginTop: 6 },
}

function camErrMsg(err) {
  const name = err?.name || ''
  const msg  = (err?.message || '').toLowerCase()
  if (name === 'NotAllowedError'     || name === 'PermissionDeniedError')
    return { text: '🚫 Camera permission was denied.\n\nTo fix: tap the camera/lock icon in your browser address bar → allow camera → refresh the page.', fix: 'permission' }
  if (name === 'NotFoundError'       || name === 'DevicesNotFoundError')
    return { text: '📷 No camera found on this device.', fix: 'noCam' }
  if (name === 'NotReadableError'    || name === 'TrackStartError')
    return { text: '📷 Camera is being used by another app. Close other apps using the camera and try again.', fix: 'inUse' }
  if (name === 'OverconstrainedError'|| name === 'ConstraintNotSatisfiedError')
    return { text: '📷 Back camera (environment) not available — switching to front camera.', fix: 'constraint' }
  if (name === 'SecurityError'       || msg.includes('secure'))
    return { text: '🔒 Camera requires a secure (HTTPS) connection. Make sure you are accessing the app over HTTPS.', fix: 'https' }
  if (name === 'AbortError')
    return { text: '⚠️ Camera access was aborted. Try again.', fix: 'abort' }
  return { text: `Camera error: [${name}] ${err?.message || 'Unknown error'}`, fix: 'unknown' }
}

export default function PhotoCapture({ onPhoto, label = 'Capture Photo Proof' }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)

  const [step,      setStep]      = useState('idle')    // idle | requesting | streaming | captured | error
  const [photo,     setPhoto]     = useState(null)
  const [photoMeta, setPhotoMeta] = useState(null)
  const [error,     setError]     = useState(null)      // { text, fix }
  const [diag,      setDiag]      = useState(null)      // diagnostics object
  const [settings,  setSettings]  = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    loadSettings().then(setSettings)
    // Gather diagnostics on mount
    collectDiag().then(setDiag)
  }, [])

  // Stop camera stream on unmount
  useEffect(() => () => stopStream(), [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  async function collectDiag() {
    const isHttps = location.protocol === 'https:' || location.hostname === 'localhost'
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    let permState = 'unknown'
    try {
      const perm = await navigator.permissions.query({ name: 'camera' })
      permState = perm.state  // 'granted' | 'denied' | 'prompt'
    } catch (_) { /* Firefox / some browsers don't support this */ }
    return { isHttps, hasMediaDevices, permState, ua: navigator.userAgent.slice(0, 80) }
  }

  async function openCamera() {
    setError(null)
    setStep('requesting')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError({ text: '⛔ Your browser does not support camera access.\n\nTry Chrome, Safari 14+, or Firefox on your device.', fix: 'noApi' })
      setStep('error')
      return
    }

    let stream
    try {
      // Build constraint: prefer back camera by deviceId (more reliable than
      // facingMode which can return a black feed on many Android devices).
      let constraint = { video: true }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cams = devices.filter(d => d.kind === 'videoinput')
        const back = cams.find(c => /back|rear|environment/i.test(c.label)) || cams[cams.length - 1]
        if (back?.deviceId) constraint = { video: { deviceId: { exact: back.deviceId } } }
      } catch (_) { /* fall back to plain { video: true } */ }

      stream = await navigator.mediaDevices.getUserMedia(constraint)
    } catch (err) {
      // If exact deviceId failed, retry with no constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      } catch (err2) {
        setError(camErrMsg(err2))
        setStep('error')
        collectDiag().then(setDiag)
        return
      }
    }

    streamRef.current = stream

    // setStep('streaming') first so React mounts the <video> element,
    // then the useEffect below assigns srcObject after DOM commit.
    setStep('streaming')
  }

  // Assign stream to video element AFTER React commits it to the DOM.
  // videoRef.current is null until the <video> element is rendered,
  // so we cannot assign srcObject in openCamera() directly.
  useEffect(() => {
    if (step !== 'streaming' || !streamRef.current) return
    const video = videoRef.current
    if (!video) return
    video.srcObject = streamRef.current
    // playsInline is required on iOS to show inline video (not fullscreen)
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', '')
    video.muted = true
    video.play().catch(e => console.warn('video.play() failed:', e))
  }, [step])

  function capturePhoto() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let w = video.videoWidth  || 640
    let h = video.videoHeight || 480

    const maxW = settings.imageMaxWidth  || 1280
    const maxH = settings.imageMaxHeight || 960
    if (w > maxW || h > maxH) {
      const ratio = Math.min(maxW / w, maxH / h)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)
    }

    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)

    let quality = settings.imageQuality || 0.8
    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    const maxBytes = (settings.imageMaxSizeKB || 500) * 1024
    while (dataUrl.length * 0.75 > maxBytes && quality > 0.2) {
      quality = Math.max(0.2, quality - 0.1)
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    stopStream()
    const sizeKB = Math.round(dataUrl.length * 0.75 / 1024)
    setPhoto(dataUrl)
    setPhotoMeta({ width: w, height: h, sizeKB, quality: Math.round(quality * 100) })
    setStep('captured')
    onPhoto(dataUrl)
  }

  function retake() {
    setPhoto(null)
    setPhotoMeta(null)
    setError(null)
    openCamera()
  }

  const permColor = diag?.permState === 'granted' ? true : diag?.permState === 'denied' ? false : null

  return (
    <div style={s.wrap}>
      <div style={s.label}>{label}</div>

      {/* Step indicator */}
      {step === 'requesting' && (
        <div style={s.info}>⏳ Requesting camera access — please allow when prompted…</div>
      )}

      {/* Error message */}
      {error && (
        <div style={s.err}>
          {error.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      {/* Camera feed — video is ALWAYS mounted so videoRef.current is never null.
          Hidden via display:none when not streaming. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ ...s.video, display: step === 'streaming' ? 'block' : 'none' }}
      />
      {step === 'streaming' && (
        <div style={s.btnRow}>
          <button style={{ ...s.btn, background: '#3b82f6', color: '#fff' }} onClick={capturePhoto}>
            ✅ Capture Photo
          </button>
          <button style={{ ...s.btn, background: '#475569', color: '#fff' }} onClick={() => { stopStream(); setStep('idle') }}>
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Captured preview */}
      {step === 'captured' && photo && (
        <>
          <img src={photo} alt="proof" style={s.preview} />
          {photoMeta && (
            <div style={s.meta}>
              {photoMeta.width}×{photoMeta.height}px · {photoMeta.sizeKB}KB · quality {photoMeta.quality}%
            </div>
          )}
          <div style={s.btnRow}>
            <button style={{ ...s.btn, background: '#64748b', color: '#fff' }} onClick={retake}>
              🔄 Retake
            </button>
          </div>
        </>
      )}

      {/* Diagnostics — shown above the open button so it's immediately visible */}
      {diag && (step === 'idle' || step === 'error') && (
        <div style={{ marginTop: 10, background: '#0f172a', borderRadius: 8, padding: '10px 12px', border: '1px solid #1e293b' }}>
          <div style={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', marginBottom: 8 }}>📋 CAMERA STATUS</div>
          {[
            { label: 'HTTPS',      ok: diag.isHttps,         val: diag.isHttps ? '✅ Yes' : '❌ No — needs HTTPS' },
            { label: 'Camera API', ok: diag.hasMediaDevices, val: diag.hasMediaDevices ? '✅ Supported' : '❌ Not supported' },
            { label: 'Permission', ok: diag.permState === 'granted' ? true : diag.permState === 'denied' ? false : null,
              val: diag.permState === 'granted' ? '✅ Granted' : diag.permState === 'denied' ? '❌ Denied' : '⚠️ ' + diag.permState },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: '0.82rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: row.ok === true ? '#22c55e' : row.ok === false ? '#ef4444' : '#f59e0b' }} />
              <span style={{ color: '#475569', width: 80, flexShrink: 0 }}>{row.label}</span>
              <span style={{ color: row.ok === false ? '#fca5a5' : '#94a3b8', fontWeight: 600 }}>{row.val}</span>
            </div>
          ))}
          {error && (
            <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#f87171' }}>
              ⛔ Error code: <strong>{error.fix}</strong>
            </div>
          )}
        </div>
      )}

      {/* Open camera button (idle or after error) */}
      {(step === 'idle' || step === 'error') && (
        <button style={{ ...s.btn, background: '#3b82f6', color: '#fff', marginTop: 8 }} onClick={openCamera}>
          📷 Open Camera
        </button>
      )}

      {/* Hidden canvas — single instance, always mounted */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

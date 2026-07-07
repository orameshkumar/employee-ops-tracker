import { useRef, useState, useEffect } from 'react'
import { loadSettings, DEFAULT_SETTINGS } from '../../hooks/useAppSettings'

const s = {
  wrap: { marginTop: 10 },
  video: { width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid #334155' },
  preview: { width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid #22c55e' },
  btnRow: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  capture: { background: '#3b82f6', color: '#fff' },
  retake: { background: '#64748b', color: '#fff' },
  label: { fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 },
  meta: { fontSize: '0.7rem', color: '#475569', marginTop: 4 },
}

export default function PhotoCapture({ onPhoto, label = 'Capture Photo Proof' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoMeta, setPhotoMeta] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    videoRef.current.srcObject = stream
    videoRef.current.play()
    setStreaming(true)
  }

  function capturePhoto() {
    const canvas = canvasRef.current
    const video = videoRef.current

    let w = video.videoWidth
    let h = video.videoHeight

    // Downscale to configured max dimensions
    const maxW = settings.imageMaxWidth
    const maxH = settings.imageMaxHeight
    if (w > maxW || h > maxH) {
      const ratio = Math.min(maxW / w, maxH / h)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)
    }

    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)

    // Compress to configured quality and max size
    let quality = settings.imageQuality
    let dataUrl = canvas.toDataURL('image/jpeg', quality)

    // Reduce quality further if still over max KB
    const maxBytes = settings.imageMaxSizeKB * 1024
    while (dataUrl.length * 0.75 > maxBytes && quality > 0.2) {
      quality = Math.max(0.2, quality - 0.1)
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    const sizeKB = Math.round(dataUrl.length * 0.75 / 1024)
    setPhoto(dataUrl)
    setPhotoMeta({ width: w, height: h, sizeKB, quality: Math.round(quality * 100) })
    video.srcObject?.getTracks().forEach(t => t.stop())
    setStreaming(false)
    onPhoto(dataUrl)
  }

  function retake() {
    setPhoto(null)
    setPhotoMeta(null)
    startCamera()
  }

  return (
    <div style={s.wrap}>
      <div style={s.label}>{label}</div>
      {!streaming && !photo && (
        <button style={{ ...s.btn, ...s.capture }} onClick={startCamera}>📷 Open Camera</button>
      )}
      {streaming && (
        <>
          <video ref={videoRef} style={s.video} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...s.capture }} onClick={capturePhoto}>✅ Capture</button>
          </div>
        </>
      )}
      {photo && (
        <>
          <img src={photo} alt="proof" style={s.preview} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {photoMeta && (
            <div style={s.meta}>
              {photoMeta.width}×{photoMeta.height}px · {photoMeta.sizeKB}KB · quality {photoMeta.quality}%
            </div>
          )}
          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...s.retake }} onClick={retake}>🔄 Retake</button>
          </div>
        </>
      )}
      {!streaming && <canvas ref={canvasRef} style={{ display: 'none' }} />}
    </div>
  )
}

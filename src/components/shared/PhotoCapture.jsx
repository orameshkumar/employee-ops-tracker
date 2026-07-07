import { useRef, useState } from 'react'

const s = {
  wrap: { marginTop: 10 },
  video: { width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid #334155' },
  preview: { width: '100%', maxWidth: 320, borderRadius: 8, border: '2px solid #22c55e' },
  btnRow: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  btn: { padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  capture: { background: '#3b82f6', color: '#fff' },
  retake: { background: '#64748b', color: '#fff' },
  label: { fontSize: '0.8rem', color: '#94a3b8', marginBottom: 6 },
}

export default function PhotoCapture({ onPhoto, label = 'Capture Photo Proof' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [streaming, setStreaming] = useState(false)
  const [photo, setPhoto] = useState(null)

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    videoRef.current.srcObject = stream
    videoRef.current.play()
    setStreaming(true)
  }

  function capturePhoto() {
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPhoto(dataUrl)
    video.srcObject?.getTracks().forEach(t => t.stop())
    setStreaming(false)
    onPhoto(dataUrl)
  }

  function retake() {
    setPhoto(null)
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
          <div style={s.btnRow}>
            <button style={{ ...s.btn, ...s.retake }} onClick={retake}>🔄 Retake</button>
          </div>
        </>
      )}
      {!streaming && <canvas ref={canvasRef} style={{ display: 'none' }} />}
    </div>
  )
}

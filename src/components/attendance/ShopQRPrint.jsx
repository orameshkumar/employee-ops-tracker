import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useAppSettings } from '../../hooks/useAppSettings'

const PRINT_STYLE = `
@media print {
  body { margin: 0; background: #fff !important; }
  .no-print { display: none !important; }
  .print-page { page-break-after: always; }
  .print-page:last-child { page-break-after: avoid; }
}
@page { size: A4 portrait; margin: 10mm; }
`

export default function ShopQRPrint() {
  const { settings } = useAppSettings()
  const shopName = settings.shopName || 'My Shop'

  function handlePrint() { window.print() }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <style>{PRINT_STYLE}</style>

      <div className="no-print" style={{ marginBottom: 24 }}>
        <div style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>🖨️ Print Shop QR Codes</div>
        <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 16 }}>
          Two QR codes will be printed — one for Check-In and one for Check-Out. Post them at your shop entrance/exit.
        </div>
        <button
          onClick={handlePrint}
          style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#3b82f6', color: '#fff', fontSize: '0.95rem' }}
        >
          🖨️ Print QR Codes
        </button>
        <div style={{ marginTop: 10, color: '#475569', fontSize: '0.78rem' }}>
          Tip: In print dialog, disable "headers and footers" for a cleaner result. Laminate for durability.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <QRCard
          shopName={shopName}
          action="in"
          label="CHECK IN"
          sublabel="Scan when you arrive"
          color="#16a34a"
          bgColor="#f0fdf4"
          borderColor="#bbf7d0"
          icon="✅"
        />
        <QRCard
          shopName={shopName}
          action="out"
          label="CHECK OUT"
          sublabel="Scan when you leave"
          color="#b91c1c"
          bgColor="#fef2f2"
          borderColor="#fecaca"
          icon="🔴"
        />
      </div>
    </div>
  )
}

function QRCard({ shopName, action, label, sublabel, color, bgColor, borderColor, icon }) {
  const canvasRef = useRef(null)
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    const payload = JSON.stringify({ action, shop: 'employee-ops-tracker' })
    QRCode.toDataURL(payload, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(console.error)
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, { width: 300, margin: 2 })
    }
  }, [action])

  function download() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `shop_qr_${action}.png`
    a.click()
  }

  return (
    <div
      className="print-page"
      style={{
        flex: '1 1 340px',
        border: `3px solid ${borderColor}`,
        borderRadius: 16,
        background: bgColor,
        padding: 32,
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Shop name */}
      <div style={{ fontSize: '1rem', color: '#374151', fontWeight: 600, marginBottom: 6, letterSpacing: '0.02em' }}>
        {shopName}
      </div>

      {/* Action label */}
      <div style={{ fontSize: '2.4rem', fontWeight: 900, color, marginBottom: 4, letterSpacing: '0.05em' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: 24 }}>{sublabel}</div>

      {/* QR Code */}
      <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 12, border: `2px solid ${borderColor}`, marginBottom: 20 }}>
        <canvas ref={canvasRef} />
      </div>

      {/* Instructions */}
      <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, background: '#fff', borderRadius: 10, padding: '12px 16px', border: `1px solid ${borderColor}`, marginBottom: 16 }}>
        <strong>How to use:</strong><br />
        1. Open the OpsTracker app on your phone<br />
        2. Go to <strong>QR Attendance</strong><br />
        3. Tap <strong>{label}</strong> and scan this code
      </div>

      {/* Download button — hidden during print */}
      <button
        className="no-print"
        onClick={download}
        style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: color, color: '#fff', fontSize: '0.85rem' }}
      >
        ⬇ Download PNG
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { saveSales, getTodaySales } from '../../firebase/firestore'
import { useLanguage } from '../../contexts/LanguageContext'

const ONLINE_METHODS = ['UPI / QR Pay', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet']

const s = {
  wrap: { padding: '20px 16px', maxWidth: 600, margin: '0 auto' },
  title: { color: '#f97316', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  section: { background: '#1e293b', borderRadius: 12, padding: '14px 16px', border: '1px solid #334155', marginBottom: 16 },
  sectionTitle: { color: '#e2e8f0', fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  label: { color: '#94a3b8', fontSize: '0.85rem', flexShrink: 0, minWidth: 0 },
  input: { width: 120, minWidth: 0, flexShrink: 0, padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', textAlign: 'right' },
  total: { color: '#4ade80', fontWeight: 800, fontSize: '1.1rem' },
  grandTotal: { background: '#0f2a1a', border: '1px solid #166534', borderRadius: 10, padding: 14, marginBottom: 16 },
  grandLabel: { color: '#94a3b8', fontSize: '0.85rem' },
  grandVal: { color: '#4ade80', fontSize: '1.4rem', fontWeight: 800 },
  btn: { width: '100%', padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', background: '#f97316', color: '#fff' },
  saved: { background: '#14532d', border: '1px solid #16a34a', borderRadius: 10, padding: 14, color: '#4ade80' },
  savedTitle: { fontWeight: 700, marginBottom: 8 },
  savedRow: { fontSize: '0.85rem', color: '#86efac', marginBottom: 4 },
}

export default function SalesEntry() {
  const { user, profile } = useAuth()
  const { t } = useLanguage()
  const [existingSales, setExistingSales] = useState(null)
  const [online, setOnline] = useState(Object.fromEntries(ONLINE_METHODS.map(m => [m, ''])))
  const [cash, setCash] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTodaySales(user.uid).then(setExistingSales)
  }, [user.uid])

  const onlineTotal = Object.values(online).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const cashTotal = parseFloat(cash) || 0
  const grandTotal = onlineTotal + cashTotal

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveSales(user.uid, profile?.name || user.email, {
        onlineSales: online,
        onlineTotal,
        cashSales: cashTotal,
        grandTotal,
        notes,
      })
      const updated = await getTodaySales(user.uid)
      setExistingSales(updated)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (existingSales) {
    return (
      <div style={s.wrap}>
        <div style={s.title}>{t('sales_title')}</div>
        <div style={s.sub}>{t('sales_recorded_sub')}</div>
        <div style={s.saved}>
          <div style={s.savedTitle}>{t('sales_recorded_title')}</div>
          <div style={s.savedRow}>{t('sales_online_total')}: ₹{existingSales.onlineTotal?.toFixed(2)}</div>
          {ONLINE_METHODS.map(m => existingSales.onlineSales?.[m] > 0 && (
            <div key={m} style={{ ...s.savedRow, paddingLeft: 12, color: '#6ee7b7' }}>
              {m}: ₹{parseFloat(existingSales.onlineSales[m]).toFixed(2)}
            </div>
          ))}
          <div style={s.savedRow}>{t('sales_cash_saved')} ₹{existingSales.cashSales?.toFixed(2)}</div>
          <div style={{ ...s.savedRow, fontSize: '1rem', fontWeight: 700, color: '#4ade80' }}>
            {t('sales_grand_total')}: ₹{existingSales.grandTotal?.toFixed(2)}
          </div>
          {existingSales.notes && <div style={{ ...s.savedRow, color: '#94a3b8' }}>{t('sales_notes_saved')} {existingSales.notes}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>{t('sales_title')}</div>
      <div style={s.sub}>{t('sales_sub')}</div>
      <form onSubmit={handleSubmit}>
        <div style={s.section}>
          <div style={s.sectionTitle}>{t('sales_online_section')}</div>
          {ONLINE_METHODS.map(method => (
            <div key={method} style={s.row}>
              <span style={s.label}>{method}</span>
              <input
                style={s.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={online[method]}
                onChange={e => setOnline(prev => ({ ...prev, [method]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ ...s.row, borderTop: '1px solid #334155', paddingTop: 10, marginTop: 4 }}>
            <span style={s.label}>{t('sales_online_total')}</span>
            <span style={s.total}>₹ {onlineTotal.toFixed(2)}</span>
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>{t('sales_cash_section')}</div>
          <div style={s.row}>
            <span style={s.label}>{t('sales_total_cash')}</span>
            <input
              style={s.input}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cash}
              onChange={e => setCash(e.target.value)}
            />
          </div>
        </div>

        <div style={s.grandTotal}>
          <div style={s.grandLabel}>{t('sales_grand_label')}</div>
          <div style={s.grandVal}>₹ {grandTotal.toFixed(2)}</div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>{t('sales_notes_section')}</div>
          <textarea
            style={{ width: '100%', minHeight: 70, resize: 'vertical', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            placeholder={t('sales_notes_placeholder')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button style={s.btn} type="submit" disabled={saving}>
          {saving ? t('common_saving') : t('sales_save_btn')}
        </button>
      </form>
    </div>
  )
}

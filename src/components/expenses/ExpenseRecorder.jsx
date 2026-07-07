import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { saveExpense, getMyExpenses, getAllExpenses, updateExpenseStatus } from '../../firebase/firestore'
import { uploadPhoto, expensePhotoPath } from '../../firebase/storage'
import PhotoCapture from '../shared/PhotoCapture'

const CATEGORIES = ['Travel', 'Food & Beverages', 'Office Supplies', 'Utilities', 'Maintenance', 'Marketing', 'Other']

const STATUS_COLOR = { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' }
const STATUS_BG = { pending: '#3b2a00', approved: '#14532d', rejected: '#450a0a' }

const s = {
  wrap: { padding: 24, maxWidth: 680, margin: '0 auto' },
  title: { color: '#ec4899', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  form: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 20 },
  formTitle: { color: '#e2e8f0', fontWeight: 700, marginBottom: 14 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: '#94a3b8', fontSize: '0.8rem' },
  input: { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' },
  select: { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem' },
  btn: { width: '100%', padding: 11, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#ec4899', color: '#fff', marginTop: 10 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#1e293b', borderRadius: 10, padding: 14, border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  expName: { color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem' },
  expMeta: { color: '#64748b', fontSize: '0.75rem', marginTop: 2 },
  amount: { color: '#4ade80', fontWeight: 800, fontSize: '1rem', flexShrink: 0 },
  badge: (s) => ({ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: STATUS_BG[s], color: STATUS_COLOR[s] }),
  thumb: { width: 50, height: 50, objectFit: 'cover', borderRadius: 6 },
  approveBtn: (c) => ({ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: c === 'green' ? '#16a34a' : '#dc2626', color: '#fff', marginLeft: 4 }),
}

export default function ExpenseRecorder() {
  const { user, profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const [expenses, setExpenses] = useState([])
  const [form, setForm] = useState({ description: '', amount: '', category: 'Travel', date: today(), notes: '' })
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)

  async function loadExpenses() {
    const list = isManager ? await getAllExpenses() : await getMyExpenses(user.uid)
    setExpenses(list)
  }

  useEffect(() => { loadExpenses() }, [user.uid])

  function setField(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description || !form.amount) return alert('Fill in description and amount.')
    setSaving(true)
    try {
      let receiptUrl = null
      if (photo) {
        receiptUrl = await uploadPhoto(expensePhotoPath(user.uid), photo)
      }
      await saveExpense(user.uid, profile?.name || user.email, { ...form, amount: parseFloat(form.amount), receiptUrl })
      setForm({ description: '', amount: '', category: 'Travel', date: today(), notes: '' })
      setPhoto(null)
      await loadExpenses()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(id, status) {
    await updateExpenseStatus(id, status)
    await loadExpenses()
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>🧾 {isManager ? 'Expense Approvals' : 'My Expenses'}</div>
      <div style={s.sub}>{isManager ? 'Review and approve employee expense claims' : 'Record work-related expenses for reimbursement'}</div>

      {!isManager && (
        <div style={s.form}>
          <div style={s.formTitle}>+ New Expense</div>
          <form onSubmit={handleSubmit}>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Description *</label>
                <input style={s.input} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="What was the expense for?" required />
              </div>
              <div style={s.field}>
                <label style={s.label}>Amount (₹) *</label>
                <input style={s.input} type="number" min="0" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" required />
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Category</label>
                <select style={s.select} value={form.category} onChange={e => setField('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Date</label>
                <input style={s.input} type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes…" />
            </div>
            <PhotoCapture label="Attach Receipt Photo (optional)" onPhoto={setPhoto} />
            <button style={s.btn} type="submit" disabled={saving}>{saving ? 'Saving…' : '💾 Submit Expense'}</button>
          </form>
        </div>
      )}

      <div style={s.list}>
        {expenses.length === 0 && <div style={{ color: '#475569' }}>No expenses recorded yet.</div>}
        {expenses.map(exp => (
          <div key={exp.id} style={s.card}>
            <div style={{ flex: 1 }}>
              <div style={s.expName}>{exp.description}</div>
              <div style={s.expMeta}>{exp.category} · {exp.date} {isManager && `· ${exp.userName}`}</div>
              {exp.notes && <div style={{ ...s.expMeta, marginTop: 2 }}>{exp.notes}</div>}
              <div style={{ marginTop: 6 }}>
                <span style={s.badge(exp.status)}>{exp.status?.toUpperCase()}</span>
                {isManager && exp.status === 'pending' && (
                  <>
                    <button style={s.approveBtn('green')} onClick={() => handleStatus(exp.id, 'approved')}>✔ Approve</button>
                    <button style={s.approveBtn('red')} onClick={() => handleStatus(exp.id, 'rejected')}>✘ Reject</button>
                  </>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={s.amount}>₹{parseFloat(exp.amount).toFixed(2)}</div>
              {exp.receiptUrl && <img src={exp.receiptUrl} alt="receipt" style={s.thumb} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function today() {
  return new Date().toISOString().split('T')[0]
}

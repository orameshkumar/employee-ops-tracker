import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  getSalesHistory, updateSalesRecord, deleteSalesRecord,
  getExpensesHistory, updateExpenseRecord, deleteExpenseRecord,
} from '../../firebase/firestore'
import { uploadPhoto, expensePhotoPath } from '../../firebase/storage'
import PhotoCapture from '../shared/PhotoCapture'
import DateInput from '../shared/DateInput'
import { fmtDate, todayISO, daysAgoISO } from '../../utils/dateUtils'

const CATEGORIES = ['Travel', 'Food & Beverages', 'Office Supplies', 'Utilities', 'Maintenance', 'Marketing', 'Other']
const ONLINE_METHODS = ['UPI / QR Pay', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet']
const STATUS_COLOR = { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' }
const STATUS_BG = { pending: '#3b2a00', approved: '#14532d', rejected: '#450a0a' }

const s = {
  wrap: { padding: 24, maxWidth: 780, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  tabs: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #334155', marginBottom: 20, width: 'fit-content' },
  tab: (a) => ({ padding: '9px 22px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: a ? '#3b82f6' : '#0f172a', color: a ? '#fff' : '#64748b', transition: 'all .2s' }),
  filterBar: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', background: '#1e293b', borderRadius: 10, padding: '14px 16px', marginBottom: 18, border: '1px solid #334155' },
  filterField: { display: 'flex', flexDirection: 'column', gap: 4 },
  filterLabel: { color: '#64748b', fontSize: '0.72rem' },
  input: { padding: '7px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  quickBtns: { display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' },
  quickBtn: (a) => ({ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: a ? '#3b82f6' : '#0f172a', color: a ? '#fff' : '#64748b' }),
  summary: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  summaryCard: (c) => ({ background: '#1e293b', border: `1px solid ${c}`, borderRadius: 8, padding: '10px 16px', minWidth: 120 }),
  summaryVal: { color: '#e2e8f0', fontWeight: 800, fontSize: '1.1rem' },
  summaryLabel: { color: '#64748b', fontSize: '0.72rem', marginTop: 2 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#1e293b', borderRadius: 10, padding: '14px 16px', border: '1px solid #334155' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' },
  cardMeta: { color: '#64748b', fontSize: '0.75rem', marginTop: 3 },
  amount: { color: '#4ade80', fontWeight: 800, fontSize: '1rem', flexShrink: 0 },
  badge: (st) => ({ display: 'inline-block', padding: '2px 9px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: STATUS_BG[st] || STATUS_BG.pending, color: STATUS_COLOR[st] || STATUS_COLOR.pending }),
  actions: { display: 'flex', gap: 6, marginTop: 10 },
  editBtn: { padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: '#1e3a5f', color: '#60a5fa' },
  delBtn: { padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: '#450a0a', color: '#fca5a5' },
  thumb: { width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #334155' },
  empty: { color: '#475569', padding: '24px 0', textAlign: 'center', fontSize: '0.85rem' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#1e293b', borderRadius: 14, padding: 24, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155' },
  modalTitle: { color: '#e2e8f0', fontWeight: 700, fontSize: '1rem', marginBottom: 18 },
  field: { marginBottom: 12 },
  fieldLabel: { display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: 4 },
  fieldInput: { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.88rem', outline: 'none' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalBtns: { display: 'flex', gap: 10, marginTop: 18 },
  saveBtn: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#3b82f6', color: '#fff' },
  cancelBtn: { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #334155', cursor: 'pointer', fontWeight: 700, background: '#0f172a', color: '#64748b' },
  deleteConfirm: { background: '#450a0a', border: '1px solid #ef4444', borderRadius: 10, padding: 18, textAlign: 'center' },
  deleteMsg: { color: '#fca5a5', marginBottom: 14, fontSize: '0.9rem' },
}

export default function HistoryPage() {
  const { user, profile } = useAuth()
  const isManager = profile?.role === 'manager'

  const [tab, setTab] = useState('sales')
  const [fromDate, setFromDate] = useState(daysAgoISO(30))
  const [toDate, setToDate] = useState(todayISO())
  const [quickRange, setQuickRange] = useState('30d')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)

  const [editingRecord, setEditingRecord] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [saving, setSaving] = useState(false)

  function applyQuick(key) {
    setQuickRange(key)
    const to = todayISO()
    const from = key === '7d' ? daysAgoISO(7) : key === '30d' ? daysAgoISO(30) : key === '90d' ? daysAgoISO(90) : daysAgoISO(365)
    setFromDate(from); setToDate(to)
  }

  async function load() {
    setLoading(true)
    try {
      const list = tab === 'sales'
        ? await getSalesHistory(user.uid, isManager, fromDate, toDate)
        : await getExpensesHistory(user.uid, isManager, fromDate, toDate)
      setRecords(list)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tab, fromDate, toDate])

  const salesTotal = tab === 'sales' ? records.reduce((s, r) => s + (r.grandTotal || 0), 0) : 0
  const salesOnline = tab === 'sales' ? records.reduce((s, r) => s + (r.onlineTotal || 0), 0) : 0
  const salesCash = tab === 'sales' ? records.reduce((s, r) => s + (r.cashSales || 0), 0) : 0
  const expTotal = tab === 'expenses' ? records.reduce((s, r) => s + (r.amount || 0), 0) : 0

  async function confirmDelete() {
    if (!deletingRecord) return
    setSaving(true)
    try {
      tab === 'sales'
        ? await deleteSalesRecord(deletingRecord.id)
        : await deleteExpenseRecord(deletingRecord.id)
      setDeletingRecord(null)
      await load()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>📋 History</div>
      <div style={s.sub}>View, edit, and delete past sales and expense records</div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'sales')} onClick={() => setTab('sales')}>💰 Sales</button>
        <button style={s.tab(tab === 'expenses')} onClick={() => setTab('expenses')}>🧾 Expenses</button>
      </div>

      {/* Filter bar */}
      <div style={s.filterBar}>
        <div style={s.filterField}>
          <span style={s.filterLabel}>From</span>
          <DateInput style={s.input} value={fromDate} onChange={e => { setFromDate(e.target.value); setQuickRange('') }} />
        </div>
        <div style={s.filterField}>
          <span style={s.filterLabel}>To</span>
          <DateInput style={s.input} value={toDate} onChange={e => { setToDate(e.target.value); setQuickRange('') }} />
        </div>
        <div style={s.quickBtns}>
          {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['1y','1 Year']].map(([k,l]) => (
            <button key={k} style={s.quickBtn(quickRange===k)} onClick={() => applyQuick(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary row */}
      {tab === 'sales' && records.length > 0 && (
        <div style={s.summary}>
          <div style={s.summaryCard('#4ade80')}>
            <div style={s.summaryVal}>₹{salesTotal.toFixed(0)}</div>
            <div style={s.summaryLabel}>Total Sales ({records.length} days)</div>
          </div>
          <div style={s.summaryCard('#38bdf8')}>
            <div style={{ ...s.summaryVal, color: '#38bdf8' }}>₹{salesOnline.toFixed(0)}</div>
            <div style={s.summaryLabel}>Online</div>
          </div>
          <div style={s.summaryCard('#fbbf24')}>
            <div style={{ ...s.summaryVal, color: '#fbbf24' }}>₹{salesCash.toFixed(0)}</div>
            <div style={s.summaryLabel}>Cash</div>
          </div>
        </div>
      )}
      {tab === 'expenses' && records.length > 0 && (
        <div style={s.summary}>
          <div style={s.summaryCard('#ec4899')}>
            <div style={{ ...s.summaryVal, color: '#ec4899' }}>₹{expTotal.toFixed(0)}</div>
            <div style={s.summaryLabel}>Total Expenses ({records.length} entries)</div>
          </div>
          <div style={s.summaryCard('#fbbf24')}>
            <div style={{ ...s.summaryVal, color: '#fbbf24' }}>{records.filter(r => r.status === 'pending').length}</div>
            <div style={s.summaryLabel}>Pending Approval</div>
          </div>
        </div>
      )}

      {/* Records list */}
      <div style={s.list}>
        {loading && <div style={s.empty}>Loading…</div>}
        {!loading && records.length === 0 && <div style={s.empty}>No records found for this date range.</div>}
        {!loading && tab === 'sales' && records.map(r => (
          <SalesCard key={r.id} record={r} isManager={isManager}
            onEdit={() => setEditingRecord(r)}
            onDelete={() => setDeletingRecord(r)}
          />
        ))}
        {!loading && tab === 'expenses' && records.map(r => (
          <ExpenseCard key={r.id} record={r} isManager={isManager}
            onEdit={() => setEditingRecord(r)}
            onDelete={() => setDeletingRecord(r)}
          />
        ))}
      </div>

      {editingRecord && tab === 'sales' && (
        <SalesEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); load() }}
        />
      )}
      {editingRecord && tab === 'expenses' && (
        <ExpenseEditModal
          record={editingRecord}
          user={user}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); load() }}
        />
      )}

      {deletingRecord && (
        <div style={s.overlay} onClick={() => setDeletingRecord(null)}>
          <div style={{ ...s.modal, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={s.deleteConfirm}>
              <div style={s.deleteMsg}>
                Delete this {tab === 'sales' ? 'sales record' : 'expense'}?<br />
                <strong style={{ color: '#e2e8f0' }}>
                  {tab === 'sales'
                    ? `₹${(deletingRecord.grandTotal || 0).toFixed(2)} on ${fmtDate(deletingRecord.date)}`
                    : `${deletingRecord.description} — ₹${(deletingRecord.amount || 0).toFixed(2)}`}
                </strong><br />
                <span style={{ fontSize: '0.78rem' }}>This cannot be undone.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button style={{ ...s.cancelBtn, flex: 1 }} onClick={() => setDeletingRecord(null)}>Cancel</button>
                <button
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#dc2626', color: '#fff' }}
                  onClick={confirmDelete} disabled={saving}
                >{saving ? 'Deleting…' : '🗑 Delete'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sales card ────────────────────────────────────────────────────────────────
function SalesCard({ record: r, isManager, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={{ flex: 1 }}>
          <div style={s.cardTitle}>
            📅 {fmtDate(r.date)}{isManager && r.userName ? <span style={{ color: '#64748b', fontWeight: 400 }}> · {r.userName}</span> : ''}
          </div>
          <div style={s.cardMeta}>
            Online ₹{(r.onlineTotal || 0).toFixed(2)} · Cash ₹{(r.cashSales || 0).toFixed(2)}
            {r.notes && ` · ${r.notes}`}
          </div>
          {expanded && r.onlineSales && (
            <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #334155' }}>
              {ONLINE_METHODS.filter(m => parseFloat(r.onlineSales[m]) > 0).map(m => (
                <div key={m} style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: 2 }}>
                  {m}: ₹{parseFloat(r.onlineSales[m]).toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={s.amount}>₹{(r.grandTotal || 0).toFixed(2)}</div>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.72rem', marginTop: 4 }}
          >{expanded ? '▲ Less' : '▼ Details'}</button>
        </div>
      </div>
      <div style={s.actions}>
        <button style={s.editBtn} onClick={onEdit}>✏ Edit</button>
        <button style={s.delBtn} onClick={onDelete}>🗑 Delete</button>
      </div>
    </div>
  )
}

// ── Expense card ──────────────────────────────────────────────────────────────
function ExpenseCard({ record: r, isManager, onEdit, onDelete }) {
  return (
    <div style={s.card}>
      <div style={s.cardTop}>
        <div style={{ flex: 1 }}>
          <div style={s.cardTitle}>{r.description}</div>
          <div style={s.cardMeta}>
            {r.category} · {fmtDate(r.date)}{isManager && r.userName ? ` · ${r.userName}` : ''}
            {r.notes && ` · ${r.notes}`}
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={s.badge(r.status)}>{(r.status || 'pending').toUpperCase()}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={s.amount}>₹{(r.amount || 0).toFixed(2)}</div>
          {r.receiptUrl && <img src={r.receiptUrl} alt="receipt" style={s.thumb} />}
        </div>
      </div>
      <div style={s.actions}>
        <button style={s.editBtn} onClick={onEdit}>✏ Edit</button>
        <button style={s.delBtn} onClick={onDelete}>🗑 Delete</button>
      </div>
    </div>
  )
}

// ── Sales edit modal ──────────────────────────────────────────────────────────
function SalesEditModal({ record, onClose, onSaved }) {
  const [online, setOnline] = useState(
    Object.fromEntries(ONLINE_METHODS.map(m => [m, record.onlineSales?.[m] || '']))
  )
  const [cash, setCash] = useState(String(record.cashSales || ''))
  const [notes, setNotes] = useState(record.notes || '')
  const [date, setDate] = useState(record.date || '')
  const [saving, setSaving] = useState(false)

  const onlineTotal = ONLINE_METHODS.reduce((s, m) => s + (parseFloat(online[m]) || 0), 0)
  const grandTotal = onlineTotal + (parseFloat(cash) || 0)

  async function handleSave() {
    setSaving(true)
    try {
      await updateSalesRecord(record.id, {
        date, onlineSales: online, onlineTotal,
        cashSales: parseFloat(cash) || 0, grandTotal, notes,
      })
      onSaved()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>✏ Edit Sales Record</div>
        <div style={s.field}>
          <label style={s.fieldLabel}>Date</label>
          <DateInput style={s.fieldInput} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ ...s.field }}>
          <label style={s.fieldLabel}>Online Sales</label>
          {ONLINE_METHODS.map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem', width: 140, flexShrink: 0 }}>{m}</span>
              <input style={{ ...s.fieldInput, padding: '6px 10px' }} type="number" min="0" step="0.01"
                value={online[m]} onChange={e => setOnline(p => ({ ...p, [m]: e.target.value }))} />
            </div>
          ))}
        </div>
        <div style={s.row2}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Cash Sales (₹)</label>
            <input style={s.fieldInput} type="number" min="0" step="0.01" value={cash} onChange={e => setCash(e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Grand Total</label>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '1.1rem', padding: '8px 0' }}>₹{grandTotal.toFixed(2)}</div>
          </div>
        </div>
        <div style={s.field}>
          <label style={s.fieldLabel}>Notes</label>
          <input style={s.fieldInput} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional…" />
        </div>
        <div style={s.modalBtns}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Expense edit modal ────────────────────────────────────────────────────────
function ExpenseEditModal({ record, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    description: record.description || '',
    amount: String(record.amount || ''),
    category: record.category || 'Travel',
    date: record.date || '',
    notes: record.notes || '',
    status: record.status || 'pending',
  })
  const [newPhoto, setNewPhoto] = useState(null)
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.description || !form.amount) return alert('Fill in description and amount.')
    setSaving(true)
    try {
      let receiptUrl = record.receiptUrl || null
      if (newPhoto) receiptUrl = await uploadPhoto(expensePhotoPath(user.uid), newPhoto)
      await updateExpenseRecord(record.id, { ...form, amount: parseFloat(form.amount), receiptUrl })
      onSaved()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>✏ Edit Expense</div>
        <div style={s.field}>
          <label style={s.fieldLabel}>Description *</label>
          <input style={s.fieldInput} value={form.description} onChange={e => set('description', e.target.value)} required />
        </div>
        <div style={s.row2}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Amount (₹) *</label>
            <input style={s.fieldInput} type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Date</label>
            <DateInput style={s.fieldInput} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
        </div>
        <div style={s.row2}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Category</label>
            <select style={{ ...s.fieldInput, padding: '8px 10px' }} value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Status</label>
            <select style={{ ...s.fieldInput, padding: '8px 10px' }} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div style={s.field}>
          <label style={s.fieldLabel}>Notes</label>
          <input style={s.fieldInput} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional…" />
        </div>
        {record.receiptUrl && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>Current receipt</div>
            <img src={record.receiptUrl} alt="receipt" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
          </div>
        )}
        <PhotoCapture label="Replace receipt photo (optional)" onPhoto={setNewPhoto} />
        <div style={s.modalBtns}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

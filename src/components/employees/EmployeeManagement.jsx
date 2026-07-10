import { useState, useEffect } from 'react'
import { getAllEmployees, updateUserRole, updateUserStatus } from '../../firebase/firestore'
import { registerEmployee } from '../../firebase/auth'
import { useAuth } from '../../contexts/AuthContext'

const s = {
  wrap: { padding: 24, maxWidth: 760, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  tabs: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #334155', marginBottom: 22, width: 'fit-content' },
  tab: (a) => ({ padding: '8px 20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: a ? '#3b82f6' : '#0f172a', color: a ? '#fff' : '#64748b', transition: 'all 0.2s' }),
  section: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 16 },
  sectionTitle: { color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' },
  field: { marginBottom: 14 },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  btn: { padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' },
  primary: { background: '#3b82f6', color: '#fff' },
  success: { background: '#16a34a', color: '#fff' },
  danger: { background: '#7f1d1d', color: '#fca5a5', fontSize: '0.75rem', padding: '5px 12px' },
  promote: { background: '#1e3a5f', color: '#60a5fa', fontSize: '0.75rem', padding: '5px 12px' },
  demote: { background: '#2d1b69', color: '#a78bfa', fontSize: '0.75rem', padding: '5px 12px' },
  error: { background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', marginBottom: 12 },
  successMsg: { background: '#14532d', border: '1px solid #16a34a', color: '#4ade80', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', borderBottom: '1px solid #1e293b', background: '#0f172a' },
  td: { padding: '10px 12px', fontSize: '0.82rem', color: '#e2e8f0', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' },
  badge: (r) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
    background: r === 'manager' ? '#2d1b69' : '#14532d',
    color: r === 'manager' ? '#a78bfa' : '#4ade80',
  }),
  inactive: { opacity: 0.45 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  loading: { color: '#475569', fontSize: '0.85rem', padding: '20px 0' },
  hint: { color: '#475569', fontSize: '0.72rem', marginTop: 3 },
  searchRow: { display: 'flex', gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  counter: { color: '#475569', fontSize: '0.78rem', marginBottom: 10 },
}

export default function EmployeeManagement() {
  const { user: currentUser } = useAuth()
  const [tab, setTab] = useState('list')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  // Create form state
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' })
  const [creating, setCreating] = useState(false)

  async function reload() {
    setLoading(true)
    try {
      const list = await getAllEmployees()
      list.sort((a, b) => a.name?.localeCompare(b.name))
      setEmployees(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  function showMsg(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg({ type: '', text: '' }), 3500)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return showMsg('error', 'Enter a full name.')
    if (form.password.length < 6) return showMsg('error', 'Password must be at least 6 characters.')
    setCreating(true)
    try {
      await registerEmployee(form.email, form.password, form.name.trim())
      showMsg('success', `Account created for ${form.name}.`)
      setForm({ name: '', email: '', password: '', role: 'employee' })
      setTab('list')
      await reload()
    } catch (err) {
      showMsg('error', err.message.replace('Firebase: ', ''))
    } finally {
      setCreating(false)
    }
  }

  async function toggleRole(emp) {
    const newRole = emp.role === 'manager' ? 'employee' : 'manager'
    try {
      await updateUserRole(emp.uid, newRole)
      showMsg('success', `${emp.name} is now a ${newRole}.`)
      await reload()
    } catch (err) {
      showMsg('error', err.message)
    }
  }

  async function toggleActive(emp) {
    const newActive = emp.active === false ? true : false
    try {
      await updateUserStatus(emp.uid, newActive)
      showMsg('success', `${emp.name} ${newActive ? 'activated' : 'deactivated'}.`)
      await reload()
    } catch (err) {
      showMsg('error', err.message)
    }
  }

  const filtered = employees.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={s.wrap}>
      <div style={s.title}>👥 Employee Management</div>
      <div style={s.sub}>Create accounts, manage roles, and view all staff</div>

      <div style={s.tabs}>
        <button style={s.tab(tab === 'list')} onClick={() => setTab('list')}>All Employees</button>
        <button style={s.tab(tab === 'create')} onClick={() => setTab('create')}>+ Add Employee</button>
      </div>

      {msg.type === 'error' && <div style={s.error}>{msg.text}</div>}
      {msg.type === 'success' && <div style={s.successMsg}>{msg.text}</div>}

      {tab === 'create' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>➕ Create New Employee Account</div>
          <form onSubmit={handleCreate}>
            <div style={s.field}>
              <label htmlFor="emp-full-name" style={s.label}>Full Name *</label>
              <input id="emp-full-name" style={s.input} type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Employee full name" required />
            </div>
            <div style={s.row2}>
              <div style={s.field}>
                <label htmlFor="emp-email" style={s.label}>Email Address *</label>
                <input id="emp-email" style={s.input} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div style={s.field}>
                <label htmlFor="emp-password" style={s.label}>Temporary Password *</label>
                <input id="emp-password" style={s.input} type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="min 6 characters" required />
                <div style={s.hint}>Share this with the employee; they can update it later</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={{ ...s.btn, ...s.success }} type="submit" disabled={creating}>
                {creating ? 'Creating…' : '✅ Create Account'}
              </button>
              <button style={{ ...s.btn, background: '#1e293b', color: '#64748b', border: '1px solid #334155' }} type="button" onClick={() => setTab('list')}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'list' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Staff Directory</div>
          <div style={s.searchRow}>
            <input style={s.searchInput} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
            <button style={{ ...s.btn, ...s.primary, padding: '8px 14px', fontSize: '0.8rem' }} onClick={reload}>↻ Refresh</button>
          </div>
          <div style={s.counter}>{filtered.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}</div>

          {loading ? (
            <div style={s.loading}>Loading employees…</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#475569', padding: '20px 0', fontSize: '0.85rem' }}>No employees found.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.uid} style={emp.active === false ? s.inactive : {}}>
                    <td style={s.td}>
                      <strong>{emp.name}</strong>
                      {emp.uid === currentUser?.uid && <span style={{ color: '#3b82f6', fontSize: '0.7rem', marginLeft: 6 }}>(you)</span>}
                    </td>
                    <td style={{ ...s.td, color: '#64748b', fontSize: '0.78rem' }}>{emp.email}</td>
                    <td style={s.td}><span style={s.badge(emp.role)}>{emp.role || 'employee'}</span></td>
                    <td style={s.td}>
                      <span style={{ fontSize: '0.78rem', color: emp.active === false ? '#ef4444' : '#4ade80' }}>
                        {emp.active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td style={s.td}>
                      {emp.uid !== currentUser?.uid && (
                        <div style={s.actions}>
                          <button
                            style={{ ...s.btn, ...(emp.role === 'manager' ? s.demote : s.promote) }}
                            onClick={() => toggleRole(emp)}
                            title={emp.role === 'manager' ? 'Demote to Employee' : 'Promote to Manager'}
                          >
                            {emp.role === 'manager' ? '↓ Demote' : '↑ Promote'}
                          </button>
                          <button
                            style={{ ...s.btn, ...s.danger }}
                            onClick={() => toggleActive(emp)}
                            title={emp.active === false ? 'Activate account' : 'Deactivate account'}
                          >
                            {emp.active === false ? '✓ Activate' : '✗ Deactivate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 16, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: '0.75rem', color: '#475569' }}>
            <strong style={{ color: '#64748b' }}>How to add employees:</strong>
            <ul style={{ margin: '6px 0 0 16px', lineHeight: 1.7 }}>
              <li>Click <strong style={{ color: '#4ade80' }}>+ Add Employee</strong> above to create their account directly</li>
              <li>Or share the app URL — employees can self-register from the login page</li>
              <li>Use <strong style={{ color: '#a78bfa' }}>↑ Promote</strong> to make someone a Manager</li>
              <li>Use <strong style={{ color: '#fca5a5' }}>✗ Deactivate</strong> to disable an account (they can still log in but you can track status)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

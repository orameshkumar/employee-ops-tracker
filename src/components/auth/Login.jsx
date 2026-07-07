import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, registerEmployee } from '../../firebase/auth'
import { useAuth } from '../../contexts/AuthContext'

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 },
  card: { background: '#1e293b', borderRadius: 16, padding: 32, width: '100%', maxWidth: 420, border: '1px solid #334155' },
  title: { color: '#38bdf8', fontSize: '1.5rem', fontWeight: 800, marginBottom: 2, textAlign: 'center' },
  sub: { color: '#64748b', fontSize: '0.82rem', textAlign: 'center', marginBottom: 22 },
  tabs: { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #334155', marginBottom: 22 },
  tab: (a) => ({ flex: 1, padding: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: a ? '#3b82f6' : '#0f172a', color: a ? '#fff' : '#64748b', transition: 'all 0.2s' }),
  field: { marginBottom: 14 },
  label: { display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: 4 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' },
  btn: { width: '100%', padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.92rem', marginBottom: 10 },
  primary: { background: '#3b82f6', color: '#fff' },
  success: { background: '#16a34a', color: '#fff' },
error: { background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', marginBottom: 12 },
  successMsg: { background: '#14532d', border: '1px solid #16a34a', color: '#4ade80', borderRadius: 8, padding: '9px 12px', fontSize: '0.82rem', marginBottom: 12 },
}

export default function Login() {
  const [tab, setTab] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuth()

  useEffect(() => {
    if (profile) navigate(profile.role === 'manager' ? '/manager' : '/employee', { replace: true })
  }, [profile, navigate])

  function reset() { setError(''); setSuccessMsg('') }

  async function handleLogin(e) {
    e.preventDefault(); reset(); setLoading(true)
    try {
      await loginWithEmail(email, password)
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault(); reset()
    if (!name.trim()) return setError('Please enter your full name.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await registerEmployee(email, password, name.trim())
      setSuccessMsg('Account created! You can now sign in.')
      setTab('login')
      setName(''); setPassword(''); setConfirm('')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally { setLoading(false) }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.title}>🏢 OpsTracker</div>
        <div style={s.sub}>Employee Operations & Attendance</div>

        <div style={s.tabs}>
          <button style={s.tab(tab === 'login')} onClick={() => { setTab('login'); reset() }}>Sign In</button>
          <button style={s.tab(tab === 'register')} onClick={() => { setTab('register'); reset() }}>Register</button>
        </div>

        {error && <div style={s.error}>{error}</div>}
        {successMsg && <div style={s.successMsg}>{successMsg}</div>}

        {tab === 'login' && (
          <>
            <form onSubmit={handleLogin}>
              <div style={s.field}>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Password</label>
                <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button style={{ ...s.btn, ...s.primary }} type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div style={s.field}>
              <label style={s.label}>Full Name *</label>
              <input style={s.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password * (min 6 characters)</label>
              <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirm Password *</label>
              <input style={s.input} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            <button style={{ ...s.btn, ...s.success }} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : '✅ Create Employee Account'}
            </button>
            <div style={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>
              New accounts are created as Employee. A manager can promote roles.
            </div>
          </form>
        )}
      </div>
    </div>
  )
}


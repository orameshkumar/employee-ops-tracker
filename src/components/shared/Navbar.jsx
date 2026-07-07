import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../firebase/auth'
import { useNavigate, NavLink } from 'react-router-dom'
import { loadSettings } from '../../hooks/useAppSettings'

const s = {
  nav: { background: '#1e293b', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderBottom: '1px solid #334155', flexWrap: 'wrap', gap: 4 },
  brand: { color: '#38bdf8', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', whiteSpace: 'nowrap' },
  shopName: { color: '#64748b', fontSize: '0.75rem', fontWeight: 400 },
  links: { display: 'flex', gap: 2, flexWrap: 'wrap' },
  link: { color: '#94a3b8', textDecoration: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.8rem' },
  activeLink: { color: '#e2e8f0', background: '#334155' },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  user: { fontSize: '0.75rem', color: '#64748b' },
  btn: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem' },
}

const lk = (to, label, activeStyle) => (
  <NavLink to={to} end={to.split('/').length <= 2} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>{label}</NavLink>
)

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [shopName, setShopName] = useState('')

  useEffect(() => { loadSettings().then(s => setShopName(s.shopName)) }, [])

  async function handleLogout() { await logout(); navigate('/login') }

  const isManager = profile?.role === 'manager'
  const base = isManager ? '/manager' : '/employee'

  return (
    <nav style={s.nav}>
      <div>
        <span style={s.brand}>🏢 OpsTracker</span>
        {shopName && <span style={s.shopName}> — {shopName}</span>}
      </div>
      <div style={s.links}>
        {lk(base, 'Home')}
        {!isManager && lk(`${base}/tasks`, 'Tasks')}
        {!isManager && lk(`${base}/closure`, 'Closure')}
        {!isManager && lk(`${base}/sales`, 'Sales')}
        {lk(`${base}/expenses`, 'Expenses')}
        {isManager && lk(`${base}/reports`, 'Reports')}
        {isManager && lk(`${base}/qr`, 'QR Codes')}
        {isManager && lk(`${base}/config`, '⚙ Config')}
      </div>
      <div style={s.right}>
        <span style={s.user}>{profile?.name || user?.email}</span>
        <button style={s.btn} onClick={handleLogout}>Sign Out</button>
      </div>
    </nav>
  )
}

import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../firebase/auth'
import { useNavigate, NavLink } from 'react-router-dom'

const s = {
  nav: { background: '#1e293b', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderBottom: '1px solid #334155' },
  brand: { color: '#38bdf8', fontWeight: 700, fontSize: '1rem', textDecoration: 'none' },
  links: { display: 'flex', gap: 4 },
  link: { color: '#94a3b8', textDecoration: 'none', padding: '6px 12px', borderRadius: 6, fontSize: '0.85rem' },
  activeLink: { color: '#e2e8f0', background: '#334155' },
  right: { display: 'flex', alignItems: 'center', gap: 12 },
  user: { fontSize: '0.8rem', color: '#64748b' },
  btn: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem' },
}

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const isManager = profile?.role === 'manager'
  const base = isManager ? '/manager' : '/employee'

  return (
    <nav style={s.nav}>
      <span style={s.brand}>🏢 OpsTracker</span>
      <div style={s.links}>
        <NavLink to={`${base}`} end style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Home</NavLink>
        {!isManager && <NavLink to={`${base}/tasks`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Tasks</NavLink>}
        {!isManager && <NavLink to={`${base}/closure`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Closure</NavLink>}
        {!isManager && <NavLink to={`${base}/sales`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Sales</NavLink>}
        {!isManager && <NavLink to={`${base}/expenses`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Expenses</NavLink>}
        {isManager && <NavLink to={`${base}/reports`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Reports</NavLink>}
        {isManager && <NavLink to={`${base}/expenses`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>Expenses</NavLink>}
        {isManager && <NavLink to={`${base}/qr`} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>QR Codes</NavLink>}
      </div>
      <div style={s.right}>
        <span style={s.user}>{profile?.name || user?.email}</span>
        <button style={s.btn} onClick={handleLogout}>Sign Out</button>
      </div>
    </nav>
  )
}

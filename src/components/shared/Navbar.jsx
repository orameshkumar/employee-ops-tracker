import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { logout } from '../../firebase/auth'
import { useNavigate, NavLink } from 'react-router-dom'
import { loadSettings } from '../../hooks/useAppSettings'
import { useTheme, THEMES } from '../../contexts/ThemeContext'

const s = {
  nav: { background: 'var(--app-surface, #1e293b)', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, borderBottom: '1px solid var(--app-border, #334155)', flexWrap: 'wrap', gap: 4, position: 'relative' },
  brand: { color: '#38bdf8', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', whiteSpace: 'nowrap' },
  shopName: { color: 'var(--app-muted, #64748b)', fontSize: '0.75rem', fontWeight: 400 },
  links: { display: 'flex', gap: 2, flexWrap: 'wrap' },
  link: { color: '#94a3b8', textDecoration: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.8rem' },
  activeLink: { color: 'var(--app-text, #e2e8f0)', background: 'var(--app-border, #334155)' },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  user: { fontSize: '0.75rem', color: 'var(--app-muted, #64748b)' },
  btn: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: '0.78rem' },
  themeBtn: { background: 'transparent', border: '1px solid var(--app-border, #334155)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 },
  themePop: { position: 'absolute', top: 58, right: 0, background: 'var(--app-surface, #1e293b)', border: '1px solid var(--app-border, #334155)', borderRadius: 10, padding: 8, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 160, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' },
  themeItem: (active) => ({ padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: active ? 700 : 400, background: active ? 'var(--app-border, #334155)' : 'transparent', color: 'var(--app-text, #e2e8f0)', border: 'none', width: '100%', textAlign: 'left' }),
  dot: (color) => ({ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }),
}

const lk = (to, label) => (
  <NavLink to={to} end={to.split('/').length <= 2} style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}>{label}</NavLink>
)

export default function Navbar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { themeKey, setTheme, theme } = useTheme()
  const [shopName, setShopName] = useState('')
  const [showThemePicker, setShowThemePicker] = useState(false)

  useEffect(() => { loadSettings().then(s => setShopName(s.shopName)) }, [])

  async function handleLogout() { await logout(); navigate('/login') }

  const isManager = profile?.role === 'manager'
  const base = isManager ? '/manager' : '/employee'

  return (
    <nav style={s.nav}>
      <div>
        <span style={s.brand}>🌸 OpsTracker</span>
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
        <div style={{ position: 'relative' }}>
          <button
            style={s.themeBtn}
            onClick={() => setShowThemePicker(p => !p)}
            title="Change theme"
          >
            {THEMES[themeKey]?.icon || '🎨'}
          </button>
          {showThemePicker && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowThemePicker(false)} />
              <div style={s.themePop}>
                <div style={{ color: '#64748b', fontSize: '0.7rem', padding: '0 12px 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme</div>
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    style={s.themeItem(themeKey === key)}
                    onClick={() => { setTheme(key); setShowThemePicker(false) }}
                  >
                    <span style={s.dot(t.accent)} />
                    {t.icon} {t.name}
                    {themeKey === key && ' ✓'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span style={s.user}>{profile?.name || user?.email}</span>
        <button style={s.btn} onClick={handleLogout}>Sign Out</button>
      </div>
    </nav>
  )
}

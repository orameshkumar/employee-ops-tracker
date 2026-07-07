import { Component } from 'react'

const s = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 24 },
  card: { background: '#1e293b', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', border: '1px solid #7f1d1d', textAlign: 'center' },
  icon: { fontSize: '2.5rem', marginBottom: 12 },
  title: { color: '#fca5a5', fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 },
  msg: { color: '#94a3b8', fontSize: '0.85rem', marginBottom: 20 },
  detail: { background: '#0f172a', borderRadius: 8, padding: 12, color: '#64748b', fontSize: '0.75rem', textAlign: 'left', marginBottom: 20, wordBreak: 'break-word' },
  btn: { padding: '9px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, background: '#3b82f6', color: '#fff', fontSize: '0.9rem' },
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={s.wrap}>
          <div style={s.card}>
            <div style={s.icon}>⚠️</div>
            <div style={s.title}>Something went wrong</div>
            <div style={s.msg}>An unexpected error occurred. Try refreshing the page.</div>
            <div style={s.detail}>{this.state.error.message}</div>
            <button style={s.btn} onClick={() => window.location.reload()}>🔄 Reload App</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { useState, useEffect } from 'react'
import { getAllEmployees } from '../../firebase/firestore'
import {
  getAttendanceForEmployeeDate,
  manualCheckIn, manualCheckOut,
  updateAttendanceSession, deleteAttendanceSession,
} from '../../firebase/firestore'
import DateInput from '../shared/DateInput'
import { todayISO } from '../../utils/dateUtils'

const s = {
  wrap:       { padding: '20px 12px', maxWidth: 680, margin: '0 auto' },
  title:      { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub:        { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  filterCard: { background: '#1e293b', borderRadius: 12, padding: 16, border: '1px solid #334155', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  field:      { display: 'flex', flexDirection: 'column', gap: 4 },
  label:      { color: '#94a3b8', fontSize: '0.75rem' },
  select:     { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none', minWidth: 180 },
  input:      { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85rem', outline: 'none' },
  timeInput:  { padding: '8px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.88rem', outline: 'none', width: 110 },
  btn:        (c) => ({ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: c === 'blue' ? '#3b82f6' : c === 'green' ? '#16a34a' : c === 'red' ? '#7f1d1d' : c === 'amber' ? '#d97706' : '#334155', color: c === 'red' ? '#fca5a5' : '#fff' }),
  sessions:   { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 },
  sessionCard:{ background: '#1e293b', borderRadius: 10, padding: 14, border: '1px solid #334155' },
  sessionNum: { color: '#475569', fontSize: '0.72rem', marginBottom: 8, fontWeight: 700 },
  row:        { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  timeLabel:  { color: '#64748b', fontSize: '0.75rem', marginBottom: 2 },
  timeVal:    { color: '#e2e8f0', fontWeight: 700, fontSize: '0.9rem' },
  openBadge:  { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: '#14532d', color: '#4ade80' },
  manualBadge:{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: '#1e3a5f', color: '#60a5fa', marginLeft: 4 },
  addCard:    { background: '#0f2a1a', borderRadius: 10, padding: 16, border: '1px solid #166534', marginBottom: 20 },
  addTitle:   { color: '#4ade80', fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 },
  success:    { background: '#14532d', border: '1px solid #16a34a', borderRadius: 8, padding: '10px 14px', color: '#4ade80', fontSize: '0.85rem', marginBottom: 14 },
  error:      { background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: 14 },
  empty:      { color: '#475569', padding: '16px 0', fontSize: '0.85rem' },
  divider:    { border: 'none', borderTop: '1px solid #1e293b', margin: '10px 0' },
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function tsToTimeInput(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AttendanceManager() {
  const [employees, setEmployees] = useState([])
  const [selUid, setSelUid]       = useState('')
  const [date, setDate]           = useState(todayISO())
  const [sessions, setSessions]   = useState([])
  const [loaded, setLoaded]       = useState(false)
  const [msg, setMsg]             = useState(null) // { type: 'success'|'error', text }
  const [saving, setSaving]       = useState(false)

  // Add check-in form
  const [addInTime, setAddInTime]   = useState('09:00')
  const [addOutTime, setAddOutTime] = useState('')
  const [showAdd, setShowAdd]       = useState(false)

  // Edit state: { sessionId, checkInTime, checkOutTime }
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    getAllEmployees().then(list => {
      setEmployees(list)
      if (list.length > 0) setSelUid(list[0].uid)
    })
  }, [])

  async function loadSessions() {
    if (!selUid || !date) return
    const list = await getAttendanceForEmployeeDate(selUid, date)
    setSessions(list)
    setLoaded(true)
    setMsg(null)
  }

  function flash(type, text) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const selEmployee = employees.find(e => e.uid === selUid)

  async function handleAddCheckIn() {
    if (!addInTime) return flash('error', 'Enter a check-in time.')
    setSaving(true)
    try {
      await manualCheckIn(selUid, selEmployee?.name || selUid, date, addInTime)
      if (addOutTime) {
        const fresh = await getAttendanceForEmployeeDate(selUid, date)
        const newSession = fresh.find(s => !sessions.some(old => old.id === s.id))
        if (newSession) await manualCheckOut(newSession.id, date, addOutTime)
      }
      flash('success', `Check-in added for ${selEmployee?.name} at ${addInTime}` + (addOutTime ? ` → ${addOutTime}` : ''))
      setShowAdd(false); setAddInTime('09:00'); setAddOutTime('')
      await loadSessions()
    } catch (e) { flash('error', e.message) }
    finally { setSaving(false) }
  }

  async function handleAddCheckOut(session) {
    const time = prompt(`Add check-out time for session #${sessions.indexOf(session) + 1} (HH:MM):`, tsToTimeInput(session.checkIn) || '18:00')
    if (!time) return
    setSaving(true)
    try {
      await manualCheckOut(session.id, date, time)
      flash('success', `Check-out added at ${time}`)
      await loadSessions()
    } catch (e) { flash('error', e.message) }
    finally { setSaving(false) }
  }

  async function handleSaveEdit() {
    if (!editing?.checkInTime) return flash('error', 'Check-in time is required.')
    setSaving(true)
    try {
      await updateAttendanceSession(editing.sessionId, date, editing.checkInTime, editing.checkOutTime || null)
      flash('success', 'Session updated.')
      setEditing(null)
      await loadSessions()
    } catch (e) { flash('error', e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(session, idx) {
    if (!window.confirm(`Delete session #${idx + 1} for ${selEmployee?.name}? This cannot be undone.`)) return
    setSaving(true)
    try {
      await deleteAttendanceSession(session.id)
      flash('success', 'Session deleted.')
      await loadSessions()
    } catch (e) { flash('error', e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>🕐 Manual Attendance</div>
      <div style={s.sub}>Add or edit check-in / check-out records for any employee on any date</div>

      {msg && <div style={msg.type === 'success' ? s.success : s.error}>{msg.text}</div>}

      {/* Filters */}
      <div style={s.filterCard}>
        <div style={s.field}>
          <label htmlFor="attendance-employee" style={s.label}>Employee</label>
          <select id="attendance-employee" style={s.select} value={selUid} onChange={e => { setSelUid(e.target.value); setLoaded(false); setSessions([]) }}>
            {employees.map(e => <option key={e.uid} value={e.uid}>{e.name || e.email}</option>)}
          </select>
        </div>
        <div style={s.field}>
          <label htmlFor="attendance-date" style={s.label}>Date</label>
          <DateInput id="attendance-date" style={s.input} value={date} onChange={e => { setDate(e.target.value); setLoaded(false); setSessions([]) }} />
        </div>
        <button style={s.btn('blue')} onClick={loadSessions}>🔍 Load</button>
      </div>

      {loaded && (
        <>
          {/* Existing sessions */}
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, marginBottom: 10 }}>
            Sessions for <span style={{ color: '#e2e8f0' }}>{selEmployee?.name}</span> on {date}
          </div>

          {sessions.length === 0 && <div style={s.empty}>No sessions recorded for this date.</div>}

          <div style={s.sessions}>
            {sessions.map((sess, i) => {
              const isOpen = sess.checkIn && !sess.checkOut
              const isEditing = editing?.sessionId === sess.id
              return (
                <div key={sess.id} style={s.sessionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={s.sessionNum}>SESSION #{i + 1}</span>
                      {isOpen && <span style={s.openBadge}>ACTIVE</span>}
                      {sess.manualEntry && <span style={s.manualBadge}>MANUAL</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isOpen && !isEditing && (
                        <button style={s.btn('green')} onClick={() => handleAddCheckOut(sess)}>+ Check-Out</button>
                      )}
                      {!isEditing && (
                        <button style={s.btn('amber')} onClick={() => setEditing({ sessionId: sess.id, checkInTime: tsToTimeInput(sess.checkIn), checkOutTime: tsToTimeInput(sess.checkOut) })}>✏ Edit</button>
                      )}
                      <button style={s.btn('red')} onClick={() => handleDelete(sess, i)}>🗑</button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                        <div style={s.field}>
                          <label htmlFor={`edit-checkin-${sess.id}`} style={s.label}>Check-In Time *</label>
                          <input id={`edit-checkin-${sess.id}`} style={s.timeInput} type="time" value={editing.checkInTime}
                            onChange={e => setEditing(p => ({ ...p, checkInTime: e.target.value }))} />
                        </div>
                        <div style={s.field}>
                          <label htmlFor={`edit-checkout-${sess.id}`} style={s.label}>Check-Out Time</label>
                          <input id={`edit-checkout-${sess.id}`} style={s.timeInput} type="time" value={editing.checkOutTime}
                            onChange={e => setEditing(p => ({ ...p, checkOutTime: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={s.btn('blue')} onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : '💾 Save'}</button>
                        <button style={s.btn('')} onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={s.row}>
                      <div>
                        <div style={s.timeLabel}>Check-In</div>
                        <div style={{ ...s.timeVal, color: '#4ade80' }}>{fmtTime(sess.checkIn)}</div>
                      </div>
                      <div style={{ color: '#334155', fontSize: '1.2rem' }}>→</div>
                      <div>
                        <div style={s.timeLabel}>Check-Out</div>
                        <div style={{ ...s.timeVal, color: isOpen ? '#475569' : '#60a5fa' }}>{isOpen ? '—' : fmtTime(sess.checkOut)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add new check-in */}
          {!showAdd ? (
            <button style={s.btn('green')} onClick={() => setShowAdd(true)}>+ Add Check-In</button>
          ) : (
            <div style={s.addCard}>
              <div style={s.addTitle}>➕ Add New Session</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
                <div style={s.field}>
                  <label htmlFor="add-checkin-time" style={s.label}>Check-In Time *</label>
                  <input id="add-checkin-time" style={s.timeInput} type="time" value={addInTime} onChange={e => setAddInTime(e.target.value)} />
                </div>
                <div style={s.field}>
                  <label htmlFor="add-checkout-time" style={s.label}>Check-Out Time (optional)</label>
                  <input id="add-checkout-time" style={s.timeInput} type="time" value={addOutTime} onChange={e => setAddOutTime(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn('green')} onClick={handleAddCheckIn} disabled={saving}>{saving ? 'Saving…' : '✅ Add Session'}</button>
                <button style={s.btn('')} onClick={() => { setShowAdd(false); setAddInTime('09:00'); setAddOutTime('') }}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { saveClosureTask, getTodayClosureTasks, markClosureComplete } from '../../firebase/firestore'
import { uploadPhoto, taskPhotoPath } from '../../firebase/storage'
import PhotoCapture from '../shared/PhotoCapture'

const CLOSURE_TASKS = [
  'All cash counted & secured',
  'POS system closed & reports printed',
  'Stock doors locked',
  'Lights & AC turned off',
  'Cleaning completed',
  'Alarm system armed',
  'Exit doors locked & verified',
]

const s = {
  wrap: { padding: 24, maxWidth: 640, margin: '0 auto' },
  title: { color: '#a855f7', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 18, border: '1px solid #334155', marginBottom: 12 },
  completedCard: { border: '1px solid #166534', background: '#0f2a1a' },
  taskName: { color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 },
  done: { color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 },
  thumb: { width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #22c55e' },
  btn: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: '#a855f7', color: '#fff', marginTop: 10 },
  progress: { background: '#0f172a', borderRadius: 20, height: 8, marginBottom: 16, overflow: 'hidden' },
  bar: (pct) => ({ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#a855f7', transition: 'width 0.4s ease', borderRadius: 20 }),
  unlocked: { background: '#14532d', border: '1px solid #16a34a', borderRadius: 12, padding: 16, textAlign: 'center', color: '#4ade80', fontWeight: 700, fontSize: '1rem' },
  locked: { background: '#1c1917', border: '1px solid #57534e', borderRadius: 12, padding: 16, textAlign: 'center', color: '#78716c', fontSize: '0.9rem' },
}

export default function ClosureTasks() {
  const { user, profile } = useAuth()
  const [saved, setSaved] = useState([])
  const [photoMap, setPhotoMap] = useState({})
  const [saving, setSaving] = useState({})
  const markedComplete = useRef(false)

  useEffect(() => {
    getTodayClosureTasks(user.uid).then(setSaved).catch(console.error)
  }, [user.uid])

  const savedNames = saved.map(t => t.taskName)
  const allDone = savedNames.length === CLOSURE_TASKS.length
  const pct = Math.round((savedNames.length / CLOSURE_TASKS.length) * 100)

  useEffect(() => {
    if (allDone && !markedComplete.current) {
      markedComplete.current = true
      markClosureComplete(user.uid).catch(err => {
        console.error('markClosureComplete failed:', err)
        markedComplete.current = false
      })
    }
  }, [allDone, user.uid])

  function handlePhoto(taskName, dataUrl) {
    setPhotoMap(prev => ({ ...prev, [taskName]: dataUrl }))
  }

  async function submitTask(taskName) {
    const photo = photoMap[taskName]
    if (!photo) return alert('Please capture a photo first.')
    setSaving(prev => ({ ...prev, [taskName]: true }))
    try {
      const path = taskPhotoPath(user.uid, 'closure', taskName)
      const photoUrl = await uploadPhoto(path, photo)
      await saveClosureTask(user.uid, profile?.name || user.email, { taskName, photoUrl, completed: true })
      const updated = await getTodayClosureTasks(user.uid)
      setSaved(updated)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(prev => ({ ...prev, [taskName]: false }))
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.title}>🔒 Closure Tasks</div>
      <div style={s.sub}>Complete ALL tasks before you can scan out for the day</div>

      <div style={s.progress}><div style={s.bar(pct)} /></div>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
        {savedNames.length} / {CLOSURE_TASKS.length} completed ({pct}%)
      </div>

      {allDone
        ? <div style={s.unlocked}>🔓 All closure tasks complete — QR Sign-Out is now unlocked!</div>
        : <div style={s.locked}>🔒 Complete all {CLOSURE_TASKS.length} tasks to unlock QR Sign-Out</div>
      }

      <div style={{ marginTop: 16 }}>
        {CLOSURE_TASKS.map(taskName => {
          const isDone = savedNames.includes(taskName)
          const doneData = saved.find(t => t.taskName === taskName)
          return (
            <div key={taskName} style={{ ...s.card, ...(isDone ? s.completedCard : {}) }}>
              <div style={s.taskName}>{taskName}</div>
              {isDone ? (
                <div style={s.done}>
                  ✅ Completed
                  {doneData?.photoUrl && <img src={doneData.photoUrl} alt="proof" style={s.thumb} />}
                </div>
              ) : (
                <>
                  <PhotoCapture label="Capture photo proof" onPhoto={(d) => handlePhoto(taskName, d)} />
                  <button style={s.btn} onClick={() => submitTask(taskName)} disabled={saving[taskName]}>
                    {saving[taskName] ? 'Saving…' : '✔ Mark Complete'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

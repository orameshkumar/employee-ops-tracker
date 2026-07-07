import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { saveDailyTask, getTodayDailyTasks } from '../../firebase/firestore'
import { uploadPhoto, taskPhotoPath } from '../../firebase/storage'
import { useAppSettings } from '../../hooks/useAppSettings'
import PhotoCapture from '../shared/PhotoCapture'

const s = {
  wrap: { padding: 24, maxWidth: 640, margin: '0 auto' },
  title: { color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 },
  sub: { color: '#64748b', fontSize: '0.85rem', marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 18, border: '1px solid #334155', marginBottom: 12 },
  completedCard: { border: '1px solid #166534', background: '#0f2a1a' },
  taskName: { color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 },
  done: { color: '#4ade80', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 },
  thumb: { width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '2px solid #22c55e' },
  btn: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: '#3b82f6', color: '#fff', marginTop: 10 },
  progress: { background: '#0f172a', borderRadius: 20, height: 8, marginBottom: 16, overflow: 'hidden' },
  bar: (pct) => ({ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#3b82f6', transition: 'width 0.4s ease', borderRadius: 20 }),
  loading: { color: '#475569', fontSize: '0.85rem', padding: '20px 0' },
}

export default function DailyTasks() {
  const { user, profile } = useAuth()
  const { settings, loading: settingsLoading } = useAppSettings()
  const [saved, setSaved] = useState([])
  const [photoMap, setPhotoMap] = useState({})
  const [saving, setSaving] = useState({})

  useEffect(() => {
    getTodayDailyTasks(user.uid).then(setSaved).catch(console.error)
  }, [user.uid])

  const taskList = settings.dailyTasks || []
  const savedNames = saved.map(t => t.taskName)
  const pct = taskList.length > 0 ? Math.round((savedNames.length / taskList.length) * 100) : 0

  function handlePhoto(taskName, dataUrl) {
    setPhotoMap(prev => ({ ...prev, [taskName]: dataUrl }))
  }

  async function submitTask(taskName) {
    const photo = photoMap[taskName]
    if (!photo) return alert('Please capture a photo first.')
    setSaving(prev => ({ ...prev, [taskName]: true }))
    try {
      const path = taskPhotoPath(user.uid, 'daily', taskName)
      const photoUrl = await uploadPhoto(path, photo)
      await saveDailyTask(user.uid, profile?.name || user.email, { taskName, photoUrl, completed: true })
      const updated = await getTodayDailyTasks(user.uid)
      setSaved(updated)
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(prev => ({ ...prev, [taskName]: false }))
    }
  }

  if (settingsLoading) return <div style={{ ...s.wrap }}><div style={s.loading}>Loading tasks…</div></div>

  return (
    <div style={s.wrap}>
      <div style={s.title}>✅ Daily Routine Tasks</div>
      <div style={s.sub}>Complete each task and capture a photo as proof</div>

      <div style={s.progress}><div style={s.bar(pct)} /></div>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
        {savedNames.length} / {taskList.length} tasks completed ({pct}%)
      </div>

      {taskList.length === 0 && (
        <div style={{ color: '#475569', padding: '20px 0' }}>
          No tasks configured yet. Ask your manager to add tasks in ⚙ Config.
        </div>
      )}

      {taskList.map(taskName => {
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
  )
}

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { saveClosureTask, getTodayClosureTasks, markClosureComplete } from '../../firebase/firestore'
import { uploadPhoto, taskPhotoPath } from '../../firebase/storage'
import { useAppSettings } from '../../hooks/useAppSettings'
import PhotoCapture from '../shared/PhotoCapture'
import { useLanguage } from '../../contexts/LanguageContext'

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
  loading: { color: '#475569', fontSize: '0.85rem', padding: '20px 0' },
}

export default function ClosureTasks() {
  const { user, profile } = useAuth()
  const { settings, loading: settingsLoading } = useAppSettings()
  const { t, lang } = useLanguage()
  function taskLabel(task) { return lang === 'ta' && task.ta ? task.ta : task.en }
  const [saved, setSaved] = useState([])
  const [photoMap, setPhotoMap] = useState({})
  const [saving, setSaving] = useState({})
  const markedComplete = useRef(false)

  useEffect(() => {
    getTodayClosureTasks(user.uid).then(setSaved).catch(console.error)
  }, [user.uid])

  const taskList = settings.closureTasks || []
  const savedNames = saved.map(s => s.taskName)
  const allDone = taskList.length > 0 && savedNames.length >= taskList.length
  const pct = taskList.length > 0 ? Math.round((savedNames.length / taskList.length) * 100) : 0

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
    if (!photo) return alert(t('common_no_photo_alert'))
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

  if (settingsLoading) return <div style={{ ...s.wrap }}><div style={s.loading}>{t('common_loading')}</div></div>

  return (
    <div style={s.wrap}>
      <div style={s.title}>{t('closure_title')}</div>
      <div style={s.sub}>{t('closure_sub')}</div>

      <div style={s.progress}><div style={s.bar(pct)} /></div>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
        {t('closure_progress', { done: savedNames.length, total: taskList.length, pct })}
      </div>

      {taskList.length === 0 ? (
        <div style={{ color: '#475569', padding: '20px 0' }}>
          {t('closure_no_tasks')}
        </div>
      ) : allDone ? (
        <div style={s.unlocked}>{t('closure_all_done')}</div>
      ) : (
        <div style={s.locked}>{t('closure_locked', { total: taskList.length })}</div>
      )}

      <div style={{ marginTop: 16 }}>
        {taskList.map(task => {
          const isDone = savedNames.includes(task.en)
          const doneData = saved.find(d => d.taskName === task.en)
          return (
            <div key={task.en} style={{ ...s.card, ...(isDone ? s.completedCard : {}) }}>
              <div style={s.taskName}>{taskLabel(task)}</div>
              {isDone ? (
                <div style={s.done}>
                  {t('common_completed')}
                  {doneData?.photoUrl && <img src={doneData.photoUrl} alt="proof" style={s.thumb} />}
                </div>
              ) : (
                <>
                  <PhotoCapture label={t('common_capture_photo')} onPhoto={(d) => handlePhoto(task.en, d)} />
                  <button style={s.btn} onClick={() => submitTask(task.en)} disabled={saving[task.en]}>
                    {saving[task.en] ? t('common_saving') : t('common_mark_complete')}
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

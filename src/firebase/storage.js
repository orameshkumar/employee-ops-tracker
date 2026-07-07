import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { storage } from './config'

export async function uploadPhoto(path, dataUrl) {
  const storageRef = ref(storage, path)
  await uploadString(storageRef, dataUrl, 'data_url')
  return getDownloadURL(storageRef)
}

export function taskPhotoPath(uid, type, taskName) {
  const date = new Date().toISOString().split('T')[0]
  const safe = taskName.replace(/\s+/g, '_').toLowerCase()
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  return `photos/${type}/${uid}/${date}/${safe}_${unique}.jpg`
}

export function expensePhotoPath(uid) {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  return `receipts/${uid}/${unique}.jpg`
}

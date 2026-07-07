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
  return `photos/${type}/${uid}/${date}/${safe}_${Date.now()}.jpg`
}

export function expensePhotoPath(uid) {
  return `receipts/${uid}/${Date.now()}.jpg`
}

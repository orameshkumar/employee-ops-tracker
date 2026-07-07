// Photos are stored as base64 data URLs directly in Firestore documents.
// This avoids Firebase Storage CORS configuration requirements when the app
// is hosted on a non-Firebase domain (e.g. GitHub Pages).
// With the 200KB image size limit, each photo field is ≤267KB — well within
// Firestore's 1MB document limit.
export async function uploadPhoto(_path, dataUrl) {
  return dataUrl
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

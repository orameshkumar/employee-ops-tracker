const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// "2024-01-15" → "15 Jan 2024"
export function fmtDate(isoStr) {
  if (!isoStr) return ''
  const parts = isoStr.split('-')
  if (parts.length !== 3) return isoStr
  const [y, m, d] = parts
  const month = MONTHS[parseInt(m, 10) - 1]
  if (!month) return isoStr
  return `${d} ${month} ${y}`
}

// Returns today as YYYY-MM-DD (for internal storage / Firestore queries)
export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// Returns N days ago as YYYY-MM-DD
export function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

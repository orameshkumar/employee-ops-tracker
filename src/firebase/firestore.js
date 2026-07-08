import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, where, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './config'

// ── Attendance ──────────────────────────────────────────────────────────────
// Each check-in creates a new session document (supports multiple sessions/day).

export async function checkIn(uid, userName) {
  const openSessions = await getOpenSessions(uid)
  if (openSessions.length > 0) throw new Error('Already checked in. Please check out first.')
  await addDoc(collection(db, 'attendance'), {
    uid, userName, date: todayStr(),
    checkIn: serverTimestamp(),
    checkOut: null,
    closureComplete: false,
  })
}

// requireClosure should be true when the employee is leaving for the day (after shop end time).
export async function checkOut(uid, requireClosure = false) {
  const openSessions = await getOpenSessions(uid)
  if (openSessions.length === 0) throw new Error('No active check-in found.')
  const session = openSessions[0]
  if (requireClosure && !session.closureComplete) {
    throw new Error('Complete all closure tasks before your final sign-out.')
  }
  await updateDoc(doc(db, 'attendance', session.id), { checkOut: serverTimestamp() })
}

async function getOpenSessions(uid) {
  const q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    where('date', '==', todayStr()),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.checkIn && !s.checkOut)
    .sort((a, b) => (b.checkIn?.seconds || 0) - (a.checkIn?.seconds || 0))
}

export async function getTodayAttendance(uid) {
  const q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    where('date', '==', todayStr()),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.checkIn?.seconds || 0) - (b.checkIn?.seconds || 0))
}

export async function getAllAttendance(dateStr) {
  const q = query(collection(db, 'attendance'), where('date', '==', dateStr))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Convert "2026-07-08" + "09:30" → Firestore Timestamp
function toTimestamp(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr + 'T12:00:00')
  d.setHours(h, m, 0, 0)
  return Timestamp.fromDate(d)
}

export async function getAttendanceForEmployeeDate(uid, dateStr) {
  const q = query(
    collection(db, 'attendance'),
    where('uid', '==', uid),
    where('date', '==', dateStr),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.checkIn?.seconds || 0) - (b.checkIn?.seconds || 0))
}

export async function manualCheckIn(uid, userName, dateStr, timeStr) {
  await addDoc(collection(db, 'attendance'), {
    uid, userName, date: dateStr,
    checkIn: toTimestamp(dateStr, timeStr),
    checkOut: null,
    closureComplete: false,
    manualEntry: true,
  })
}

export async function manualCheckOut(sessionId, dateStr, timeStr) {
  await updateDoc(doc(db, 'attendance', sessionId), {
    checkOut: toTimestamp(dateStr, timeStr),
    manualEntry: true,
  })
}

export async function updateAttendanceSession(sessionId, dateStr, checkInTime, checkOutTime) {
  await updateDoc(doc(db, 'attendance', sessionId), {
    checkIn: toTimestamp(dateStr, checkInTime),
    checkOut: checkOutTime ? toTimestamp(dateStr, checkOutTime) : null,
    manualEntry: true,
  })
}

export async function deleteAttendanceSession(sessionId) {
  await deleteDoc(doc(db, 'attendance', sessionId))
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export async function saveDailyTask(uid, userName, task) {
  await addDoc(collection(db, 'dailyTasks'), {
    uid, userName, ...task, date: todayStr(), createdAt: serverTimestamp(),
  })
}

export async function saveClosureTask(uid, userName, task) {
  await addDoc(collection(db, 'closureTasks'), {
    uid, userName, ...task, date: todayStr(), createdAt: serverTimestamp(),
  })
}

export async function getTodayDailyTasks(uid) {
  const q = query(
    collection(db, 'dailyTasks'),
    where('uid', '==', uid),
    where('date', '==', todayStr())
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getTodayClosureTasks(uid) {
  const q = query(
    collection(db, 'closureTasks'),
    where('uid', '==', uid),
    where('date', '==', todayStr())
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function markClosureComplete(uid) {
  const openSessions = await getOpenSessions(uid)
  if (openSessions.length === 0) return // nothing open to mark
  await updateDoc(doc(db, 'attendance', openSessions[0].id), { closureComplete: true })
}

// ── Sales ────────────────────────────────────────────────────────────────────

export async function saveSales(uid, userName, data) {
  const today = todayStr()
  const ref = doc(db, 'sales', `${uid}_${today}`)
  await setDoc(ref, { uid, userName, date: today, ...data, savedAt: serverTimestamp() })
}

export async function getTodaySales(uid) {
  const ref = doc(db, 'sales', `${uid}_${todayStr()}`)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function getAllSales(dateStr) {
  const q = query(collection(db, 'sales'), where('date', '==', dateStr))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Expenses ─────────────────────────────────────────────────────────────────

export async function saveExpense(uid, userName, expense) {
  await addDoc(collection(db, 'expenses'), {
    uid, userName, ...expense, status: 'pending', createdAt: serverTimestamp(),
  })
}

export async function getMyExpenses(uid) {
  // Single where clause — no composite index needed
  const q = query(collection(db, 'expenses'), where('uid', '==', uid))
  const snap = await getDocs(q)
  // Sort client-side to avoid requiring a composite index
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export async function getAllExpenses() {
  const snap = await getDocs(collection(db, 'expenses'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export async function updateExpenseStatus(expenseId, status) {
  await updateDoc(doc(db, 'expenses', expenseId), { status })
}

// ── Sales History ────────────────────────────────────────────────────────────

export async function getSalesHistory(uid, isManager, startDate, endDate) {
  const snap = await getDocs(collection(db, 'sales'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => {
      const inRange = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate)
      return isManager ? inRange : inRange && r.uid === uid
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function updateSalesRecord(id, data) {
  await updateDoc(doc(db, 'sales', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteSalesRecord(id) {
  await deleteDoc(doc(db, 'sales', id))
}

// ── Expense History ───────────────────────────────────────────────────────────

export async function getExpensesHistory(uid, isManager, startDate, endDate) {
  const snap = await getDocs(collection(db, 'expenses'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => {
      const inRange = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate)
      return isManager ? inRange : inRange && r.uid === uid
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function updateExpenseRecord(id, data) {
  await updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteExpenseRecord(id) {
  await deleteDoc(doc(db, 'expenses', id))
}

// ── Users / Employee Management ──────────────────────────────────────────────

export async function getAllEmployees() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }))
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function updateUserStatus(uid, active) {
  await updateDoc(doc(db, 'users', uid), { active })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

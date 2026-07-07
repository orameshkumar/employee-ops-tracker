import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  query, where, orderBy, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'

// ── Attendance ──────────────────────────────────────────────────────────────

export async function checkIn(uid, userName) {
  const today = todayStr()
  const ref = doc(db, 'attendance', `${uid}_${today}`)
  const snap = await getDoc(ref)
  if (snap.exists()) throw new Error('Already checked in today')
  await setDoc(ref, {
    uid, userName, date: today,
    checkIn: serverTimestamp(),
    checkOut: null,
    closureComplete: false,
  })
}

export async function checkOut(uid) {
  const today = todayStr()
  const ref = doc(db, 'attendance', `${uid}_${today}`)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('No check-in record found')
  if (!snap.data().closureComplete) throw new Error('Complete closure tasks before signing out')
  await updateDoc(ref, { checkOut: serverTimestamp() })
}

export async function getTodayAttendance(uid) {
  const ref = doc(db, 'attendance', `${uid}_${todayStr()}`)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function getAllAttendance(dateStr) {
  const q = query(collection(db, 'attendance'), where('date', '==', dateStr))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
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
  const today = todayStr()
  const ref = doc(db, 'attendance', `${uid}_${today}`)
  await updateDoc(ref, { closureComplete: true })
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

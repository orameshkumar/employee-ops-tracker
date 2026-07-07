import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from './config'

const googleProvider = new GoogleAuthProvider()

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  await ensureUserProfile(result.user)
  return result
}

export async function registerEmployee(email, password, name) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(result.user, { displayName: name })
  await setDoc(doc(db, 'users', result.user.uid), {
    name,
    email,
    role: 'employee',
    createdAt: new Date().toISOString(),
  })
  return result
}

async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName || user.email,
      email: user.email,
      role: 'employee',
      createdAt: new Date().toISOString(),
    })
  }
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export function logout() {
  return signOut(auth)
}

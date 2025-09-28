import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
}

let app: FirebaseApp | undefined

export function getFirebaseApp() {
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  }
  return app
}

export function getDb() {
  return getFirestore(getFirebaseApp())
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth()
  const provider = new GoogleAuthProvider()
  await signInWithPopup(auth, provider)
}

export async function emailRegister(email: string, password: string) {
  const auth = getFirebaseAuth()
  await createUserWithEmailAndPassword(auth, email, password)
}

export async function emailLogin(email: string, password: string) {
  const auth = getFirebaseAuth()
  await signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  const auth = getFirebaseAuth()
  await signOut(auth)
}

"use client"

import { useEffect } from "react"
import { getFirebaseAuth, getDb } from "../lib/firebase/client"
import { doc, serverTimestamp, setDoc } from "firebase/firestore"

// Lightweight presence: updates users/{uid}/presence { online: true, lastSeen }
// Note: true realtime presence usually requires RTDB; for MVP we update periodically.
export default function PresenceManager() {
  useEffect(() => {
    const auth = getFirebaseAuth()
    const db = getDb()
    let timer: any

    const writePresence = async () => {
      const u = auth.currentUser
      if (!u) return
      try {
        await setDoc(doc(db, 'users', u.uid, 'presence', 'now'), {
          online: true,
          lastSeen: serverTimestamp(),
          ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
        }, { merge: true })
      } catch {}
    }

    const unsub = auth.onAuthStateChanged((u) => {
      if (timer) clearInterval(timer)
      if (u) {
        writePresence()
        timer = setInterval(writePresence, 60_000)
      }
    })

    return () => { if (timer) clearInterval(timer); unsub() }
  }, [])

  return null
}

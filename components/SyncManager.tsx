"use client"

import { useEffect, useRef } from "react"
import { getFirebaseAuth, getDb } from "../lib/firebase/client"
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore"

// Bridges localStorage datasets <-> Firestore in realtime when the user is logged in
// and the corresponding Sync toggles are enabled in users/{uid}/settings/sync.
// Datasets synced:
// - Favorites: key 'kg_favorites_v1' => users/{uid}/data/favorites { items: Array<{tmdbId:number,type:'movie'|'tv'}> }
// - History: key 'kg_watch_history_v1' => users/{uid}/data/history { items: Array<WatchProgress> }
// - Quests/XP: keys 'kg_quests_v1' + 'kg_xp_v1' => users/{uid}/data/quests { quests: Quest[], xp: number }

const FAVORITES_KEY = 'kg_favorites_v1'
const HISTORY_KEY = 'kg_watch_history_v1'
const QUESTS_KEY = 'kg_quests_v1'
const XP_KEY = 'kg_xp_v1'

type FavItem = { tmdbId: number; type: 'movie'|'tv' }

type WatchProgress = {
  tmdbId: number
  type: 'movie'|'tv'
  lastPositionSec: number
  durationSec?: number
  startedAt: number
  updatedAt: number
  finished?: boolean
}

type SyncToggles = { favorites?: boolean; history?: boolean; quests?: boolean }
type Quest = { id: string; title: string; type: 'daily'|'weekly'; xp: number; done: boolean }

export default function SyncManager() {
  const unsubRefs = useRef<Array<() => void>>([])
  const pushingRef = useRef<{ favs?: boolean; hist?: boolean; quests?: boolean }>({})

  useEffect(() => {
    const auth = getFirebaseAuth()
    const db = getDb()

    const cleanup = () => {
      unsubRefs.current.forEach(off => off())
      unsubRefs.current = []
    }

    const onAuth = auth.onAuthStateChanged(async (user) => {
      cleanup()
      if (!user) return

      // Load sync toggles
      let toggles: SyncToggles = {}
      try {
        const tref = doc(db, 'users', user.uid, 'settings', 'sync')
        const tsnap = await getDoc(tref)
        if (tsnap.exists()) toggles = (tsnap.data() as SyncToggles) || {}
      } catch {}

      // Favorites sync
      if (toggles.favorites) {
        const ref = doc(db, 'users', user.uid, 'data', 'favorites')
        // 1) Downstream: Firestore -> localStorage (realtime)
        const off = onSnapshot(ref, (snap) => {
          if (!snap.exists()) return
          const data = snap.data() as { items?: FavItem[] }
          const items = Array.isArray(data?.items) ? data.items : []
          try {
            const pushing = pushingRef.current.favs
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
            if (!pushing) window.dispatchEvent(new Event('kg_favorites_changed'))
          } catch {}
          pushingRef.current.favs = false
        })
        unsubRefs.current.push(off)
        // 2) Upstream: local changes -> Firestore (debounced)
        const onLocal = () => {
          try {
            const raw = localStorage.getItem(FAVORITES_KEY)
            const items: FavItem[] = raw ? JSON.parse(raw) : []
            pushingRef.current.favs = true
            setDoc(ref, { items }, { merge: true }).finally(()=>{ setTimeout(()=>{ pushingRef.current.favs = false }, 50) })
          } catch {}
        }
        window.addEventListener('kg_favorites_changed', onLocal)
        unsubRefs.current.push(() => window.removeEventListener('kg_favorites_changed', onLocal))
        // Initial push up if Firestore empty
        try {
          const snap = await getDoc(ref)
          if (!snap.exists()) {
            const raw = localStorage.getItem(FAVORITES_KEY)
            const items: FavItem[] = raw ? JSON.parse(raw) : []
            if (items.length) await setDoc(ref, { items }, { merge: true })
          }
        } catch {}
      }

      // History sync
      if (toggles.history) {
        const ref = doc(db, 'users', user.uid, 'data', 'history')
        const off = onSnapshot(ref, (snap) => {
          if (!snap.exists()) return
          const data = snap.data() as { items?: WatchProgress[] }
          const items = Array.isArray(data?.items) ? data.items : []
          try {
            const pushing = pushingRef.current.hist
            localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
            if (!pushing) window.dispatchEvent(new Event('kg_history_changed'))
          } catch {}
          pushingRef.current.hist = false
        })
        unsubRefs.current.push(off)
        const onLocal = () => {
          try {
            const raw = localStorage.getItem(HISTORY_KEY)
            const items: WatchProgress[] = raw ? JSON.parse(raw) : []
            pushingRef.current.hist = true
            setDoc(ref, { items }, { merge: true }).finally(()=>{ setTimeout(()=>{ pushingRef.current.hist = false }, 50) })
          } catch {}
        }
        window.addEventListener('kg_history_changed', onLocal)
        unsubRefs.current.push(() => window.removeEventListener('kg_history_changed', onLocal))
        try {
          const snap = await getDoc(ref)
          if (!snap.exists()) {
            const raw = localStorage.getItem(HISTORY_KEY)
            const items: WatchProgress[] = raw ? JSON.parse(raw) : []
            if (items.length) await setDoc(ref, { items }, { merge: true })
          }
        } catch {}
      }

      // Quests + XP sync
      if (toggles.quests) {
        const ref = doc(db, 'users', user.uid, 'data', 'quests')
        const off = onSnapshot(ref, (snap) => {
          if (!snap.exists()) return
          const data = snap.data() as { quests?: Quest[]; xp?: number }
          const quests = Array.isArray(data?.quests) ? data.quests : []
          const xp = typeof data?.xp === 'number' ? data.xp : 0
          try {
            const pushing = pushingRef.current.quests
            localStorage.setItem(QUESTS_KEY, JSON.stringify(quests))
            localStorage.setItem(XP_KEY, JSON.stringify(xp))
            if (!pushing) {
              // no specific event; UI reads from localStorage on next render
            }
          } catch {}
          pushingRef.current.quests = false
        })
        unsubRefs.current.push(off)
        const pushUp = async () => {
          try {
            const qraw = localStorage.getItem(QUESTS_KEY)
            const xraw = localStorage.getItem(XP_KEY)
            const quests: Quest[] = qraw ? JSON.parse(qraw) : []
            const xp: number = xraw ? JSON.parse(xraw) : 0
            pushingRef.current.quests = true
            await setDoc(ref, { quests, xp }, { merge: true })
            setTimeout(()=>{ pushingRef.current.quests = false }, 50)
          } catch {}
        }
        // Initial push if empty
        try {
          const snap = await getDoc(ref)
          if (!snap.exists()) await pushUp()
        } catch {}
        // Push on auth (once) and when local storage changes (we lack an event; keep simple: push once now)
        pushUp()
      }
    })

    return () => {
      cleanup()
      onAuth()
    }
  }, [])

  return null
}

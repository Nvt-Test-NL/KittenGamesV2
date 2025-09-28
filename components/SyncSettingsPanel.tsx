"use client"

import React, { useEffect, useState } from "react"
import { getFirebaseAuth, getDb } from "../lib/firebase/client"
import { doc, getDoc, setDoc } from "firebase/firestore"

const LS_KEY = "kg_sync_toggles_v1"

type SyncToggles = {
  favorites: boolean
  history: boolean
  quests: boolean
}

const defaultToggles: SyncToggles = { favorites: false, history: false, quests: false }

export default function SyncSettingsPanel() {
  const [toggles, setToggles] = useState<SyncToggles>(defaultToggles)
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // load from localStorage
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setToggles({ ...defaultToggles, ...JSON.parse(raw) })
    } catch {}

    // watch auth
    const auth = getFirebaseAuth()
    const unsub = auth.onAuthStateChanged(async (user) => {
      setLoggedIn(!!user)
      if (user) {
        try {
          const ref = doc(getDb(), "users", user.uid, "settings", "sync")
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const data = snap.data() as Partial<SyncToggles>
            setToggles((prev) => {
              const merged = { ...prev, ...data }
              try { localStorage.setItem(LS_KEY, JSON.stringify(merged)) } catch {}
              return merged
            })
          }
        } catch {}
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const update = async (patch: Partial<SyncToggles>) => {
    const next = { ...toggles, ...patch }
    setToggles(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
    const user = getFirebaseAuth().currentUser
    if (user) {
      try {
        const ref = doc(getDb(), "users", user.uid, "settings", "sync")
        await setDoc(ref, next, { merge: true })
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-300 text-sm">Schakel optioneel cloud sync in per dataset. Werkt offline wanneer uitgeschakeld.</p>
      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Sync Favorites</div>
          <div className="text-xs text-gray-400">Favorieten synchroniseren tussen apparaten</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.favorites} onChange={(e)=>update({ favorites: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.favorites ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Sync History</div>
          <div className="text-xs text-gray-400">Kijk-/speelgeschiedenis synchroniseren</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.history} onChange={(e)=>update({ history: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.history ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Sync Quests</div>
          <div className="text-xs text-gray-400">Quests, XP en badges synchroniseren</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.quests} onChange={(e)=>update({ quests: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.quests ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      {!loggedIn && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-md px-3 py-2">
          Tip: meld je aan om te synchroniseren tussen apparaten. Accounts zijn optioneel.
        </div>
      )}
    </div>
  )
}

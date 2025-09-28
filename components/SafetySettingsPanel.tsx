"use client"

import React, { useEffect, useState } from "react"
import { getFirebaseAuth, getDb } from "../lib/firebase/client"
import { doc, getDoc, setDoc } from "firebase/firestore"

type SafetyToggles = {
  violence: boolean
  gore: boolean
  nsfw: boolean
}

const LS_KEY = 'kg_safety_v1'
const defaults: SafetyToggles = { violence: false, gore: true, nsfw: true }

export default function SafetySettingsPanel() {
  const [toggles, setToggles] = useState<SafetyToggles>(defaults)
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // local load
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setToggles({ ...defaults, ...JSON.parse(raw) })
    } catch {}

    const auth = getFirebaseAuth()
    const unsub = auth.onAuthStateChanged(async (u) => {
      setLoggedIn(!!u)
      if (u) {
        try {
          const ref = doc(getDb(), 'users', u.uid, 'settings', 'safety')
          const snap = await getDoc(ref)
          if (snap.exists()) {
            const data = snap.data() as Partial<SafetyToggles>
            const merged = { ...defaults, ...data }
            setToggles(merged)
            try { localStorage.setItem(LS_KEY, JSON.stringify(merged)) } catch {}
          }
        } catch {}
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const update = async (patch: Partial<SafetyToggles>) => {
    const next = { ...toggles, ...patch }
    setToggles(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch {}
    const u = getFirebaseAuth().currentUser
    if (u) {
      try {
        await setDoc(doc(getDb(), 'users', u.uid, 'settings', 'safety'), next, { merge: true })
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-gray-300 text-sm">Verberg of waarschuw voor bepaalde thema's. Dit wordt toegepast op lijsten en detailpagina's.</div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Verberg NSFW</div>
          <div className="text-xs text-gray-400">Verberg items met mogelijke volwassen inhoud</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.nsfw} onChange={(e)=>update({ nsfw: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.nsfw ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Verberg Gore</div>
          <div className="text-xs text-gray-400">Verberg items met expliciete gore/geweld</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.gore} onChange={(e)=>update({ gore: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.gore ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/70 border border-slate-700">
        <div>
          <div className="text-white font-medium">Verberg Violence</div>
          <div className="text-xs text-gray-400">Verberg items met prominent geweld</div>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only" checked={!!toggles.violence} onChange={(e)=>update({ violence: e.target.checked })} />
          <span className={`w-11 h-6 rounded-full transition ${toggles.violence ? 'bg-emerald-600' : 'bg-slate-600'}`}></span>
        </label>
      </div>

      {!loggedIn && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-md px-3 py-2">Tip: log in om je Safety instellingen te synchroniseren.</div>
      )}
    </div>
  )
}

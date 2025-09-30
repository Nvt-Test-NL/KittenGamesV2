"use client"

import React, { useEffect, useMemo, useState } from "react"
import { getDb, getFirebaseAuth } from "../lib/firebase/client"
import { collectionGroup, getDocs, limit, query, where, orderBy } from "firebase/firestore"

interface Props { onClose: ()=>void, onStartDM?: (uid: string)=>void }

type PublicProfile = {
  uid?: string
  email?: string
  emailLower?: string
  displayName?: string | null
  searchVisible?: boolean
}

export default function UserSearchModal({ onClose, onStartDM }: Props) {
  const db = getDb()
  const [uid, setUid] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [items, setItems] = useState<PublicProfile[]>([])

  const loadDefault = async () => {
    setLoading(true); setError("")
    try {
      if (!uid) { setItems([]); return }
      // List visible users (no efficient ORDER BY without index; keep simple and small)
      const qv = query(collectionGroup(db, 'profile'), where('searchVisible', '==', true), limit(30))
      const snap = await getDocs(qv)
      const arr: PublicProfile[] = []
      snap.forEach(d => {
        // uid from path: users/{uid}/profile/public
        const seg = d.ref.path.split('/')
        const i = seg.indexOf('users')
        const uid = i>=0? seg[i+1] : undefined
        const data = d.data() as any
        arr.push({ uid, ...data })
      })
      setItems(arr)
    } catch (e:any) { setError(String(e?.message||e)) }
    finally { setLoading(false) }
  }

  const doExactSearch = async () => {
    const term = search.trim()
    if (!term) { loadDefault(); return }
    setLoading(true); setError("")
    try {
      if (!uid) { setItems([]); return }
      const emailLower = term.includes('@')? term.toLowerCase() : undefined
      if (emailLower) {
        const q1 = query(collectionGroup(db, 'profile'), where('emailLower','==', emailLower))
        const snap = await getDocs(q1)
        const arr: PublicProfile[] = []
        snap.forEach(d => {
          const seg = d.ref.path.split('/')
          const i = seg.indexOf('users')
          const uid = i>=0? seg[i+1] : undefined
          const data = d.data() as any
          arr.push({ uid, ...data })
        })
        setItems(arr)
      } else {
        // Fallback: fetch visible list and filter by displayName contains (client-side)
        const qv = query(collectionGroup(db, 'profile'), where('searchVisible', '==', true), limit(50))
        const snap = await getDocs(qv)
        const arr: PublicProfile[] = []
        snap.forEach(d => {
          const seg = d.ref.path.split('/')
          const i = seg.indexOf('users')
          const uid = i>=0? seg[i+1] : undefined
          const data = d.data() as any
          arr.push({ uid, ...data })
        })
        const s = term.toLowerCase()
        setItems(arr.filter(x => (x.displayName||'').toLowerCase().includes(s)))
      }
    } catch (e:any) { setError(String(e?.message||e)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const auth = getFirebaseAuth()
    const off = auth.onAuthStateChanged(u => setUid(u?.uid || null))
    return () => off()
  }, [])

  useEffect(() => { loadDefault() }, [uid])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-semibold">Zoek gebruiker</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-sm">Sluiten</button>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={search} onChange={(e)=>setSearch(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') doExactSearch() }} placeholder="Zoek op naam of exact e‑mail" className="flex-1 glass-input rounded-md px-3 py-2 text-sm" />
          <button onClick={doExactSearch} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Zoek</button>
        </div>
        {!uid && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2 mb-2">Inloggen vereist om gebruikers te zoeken.</div>}
        {loading && <div className="text-xs text-gray-400">Laden…</div>}
        {error && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2 mb-2">{error}</div>}
        <div className="max-h-96 overflow-auto space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-gray-400">Geen resultaten.</div>
          ) : (
            items.map((u, idx) => (
              <div key={(u.uid||'')+idx} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm text-white">{u.displayName || (u.email || u.uid || 'Onbekend')}</div>
                  {u.email && <div className="text-xs text-gray-400">{u.email}</div>}
                </div>
                {onStartDM && u.uid && (
                  <button onClick={()=>onStartDM(u.uid!)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs">Start DM</button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="mt-3 text-[11px] text-gray-400">Je kunt ervoor kiezen onvindbaar te zijn via Settings → Account → “Display naam zichtbaar in Zoek chat”. Bij uit, kun je nog via exact e‑mail gevonden worden.</div>
      </div>
    </div>
  )
}

"use client"

import React, { useEffect, useState } from "react"
import { getDb } from "../lib/firebase/client"
import { collection, onSnapshot } from "firebase/firestore"

const LS_KEY = 'kg_hourly_popup_last_v1'

export default function HourlyChangelogPopup() {
  const db = getDb()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Array<{id:string,title:string,detail:string}>>([])

  useEffect(() => {
    // show at most once per hour
    try {
      const last = parseInt(localStorage.getItem(LS_KEY) || '0', 10)
      const now = Date.now()
      if (!last || (now - last) > 3600_000) setOpen(true)
    } catch { setOpen(true) }
  }, [])

  useEffect(() => {
    // Load and filter client-side to avoid composite index requirements
    const off = onSnapshot(collection(db,'feedbackIdeas'), snap => {
      const all: Array<{id:string,title:string,detail:string, createdAt?: any, status?: string}> = []
      snap.forEach(d=>{ const x = d.data() as any; all.push({ id: d.id, title: x.title||'', detail: x.detail||'', createdAt: x.createdAt, status: x.status }) })
      const considering = all.filter(x => x.status === 'considering')
      considering.sort((a,b)=> (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0))
      setItems(considering.slice(0,5))
    })
    return () => off()
  }, [db])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={()=>{ setOpen(false); try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {} }} />
      <div className="relative w-full max-w-lg mx-auto rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
        <div className="text-white font-semibold mb-2">Wat is er nieuw</div>
        <div className="text-sm text-gray-300 mb-4 space-y-1">
          <p>- Community: kanalen, gebruikers zoeken en DM in Chat.</p>
          <p>- Beleiden pagina voor AI/Opslag/Community.</p>
          <p>- Proxy tijdelijk on hold met nette melding.</p>
        </div>
        <div className="text-white font-semibold mb-2">Wat binnenkort</div>
        <ul className="text-sm text-gray-300 list-disc list-inside mb-3 space-y-1">
          <li>Verbeterde Proxy met extra frontends en allowlist beheer.</li>
          <li>Meer kanalen en moderatie tools.</li>
          {items.length>0 && <li className="text-emerald-300">Uit Feedback (Mogelijk uitgevoerd):</li>}
        </ul>
        {items.length>0 && (
          <div className="mb-3 space-y-1">
            {items.map(it => (
              <div key={it.id} className="text-xs text-gray-300"><span className="text-white">{it.title}</span> — {it.detail}</div>
            ))}
          </div>
        )}
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2 mb-3">Let op: vanaf 02‑10 is voor Pjotter‑AI een gratis CatGames‑account verplicht.</div>
        <div className="flex justify-end">
          <button onClick={()=>{ setOpen(false); try { localStorage.setItem(LS_KEY, String(Date.now())) } catch {} }} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Sluiten</button>
        </div>
      </div>
    </div>
  )
}

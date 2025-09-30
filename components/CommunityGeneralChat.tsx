"use client"

import React, { useEffect, useRef, useState } from "react"
import { getDb, getFirebaseAuth } from "../lib/firebase/client"
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore"

interface Msg { id: string; uid: string; text: string; displayName?: string|null; createdAt?: any }

export default function CommunityGeneralChat({ channelId = 'general', onOpenUserSearch }: { channelId?: string, onOpenUserSearch?: ()=>void }) {
  const db = getDb()
  const [uid, setUid] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [text, setText] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const listRef = useRef<HTMLDivElement|null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(u => { setUid(u?.uid || null); setDisplayName(u?.displayName || u?.email || null) })
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'community', channelId, 'messages'), orderBy('createdAt','desc'), limit(100))
    const off = onSnapshot(q, snap => {
      const arr: Msg[] = []
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }))
      setMsgs(arr.reverse())
      setTimeout(()=> { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, 50)
    })
    return () => off()
  }, [db, channelId])

  const send = async () => {
    if (!uid) return
    const t = text.trim()
    if (!t) return
    setText("")
    await addDoc(collection(db, 'community', channelId, 'messages'), {
      uid,
      displayName: displayName || null,
      text: t,
      createdAt: serverTimestamp(),
    })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
        <div className="text-white font-semibold capitalize">{channelId} kanaal</div>
        {onOpenUserSearch && (
          <button onClick={onOpenUserSearch} className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-gray-200">Zoek gebruiker</button>
        )}
      </div>
      <div ref={listRef} className="h-80 overflow-auto p-3 sm:p-4 space-y-2 bg-gradient-to-b from-slate-950/40 to-slate-900/30">
        {msgs.length === 0 ? (
          <div className="text-sm text-gray-400">Nog geen berichten. Zeg hallo!</div>
        ) : (
          msgs.map(m => (
            <div key={m.id} className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-200 select-none">
                {(m.displayName || m.uid).slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-400">
                  <span className="text-emerald-300 mr-2">{m.displayName || m.uid.slice(0,6)}</span>
                </div>
                <div className="text-sm text-gray-100 leading-snug whitespace-pre-wrap break-words bg-slate-800/40 border border-slate-700/40 rounded-md px-3 py-2">
                  {m.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-3 sm:px-4 py-3 border-t border-slate-800/80 flex gap-2">
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          onKeyDown={(e)=>{ if (e.key==='Enter') send() }}
          disabled={!uid}
          placeholder={uid? "Typ een bericht..." : "Inloggen vereist om te chatten"}
          className="flex-1 glass-input rounded-md px-3 py-2 text-sm"
        />
        <button onClick={send} disabled={!uid || !text.trim()} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50">Verstuur</button>
      </div>
      {!uid && <div className="px-4 pb-3 text-xs text-gray-400">Log in via Settings om mee te praten.</div>}
    </div>
  )
}

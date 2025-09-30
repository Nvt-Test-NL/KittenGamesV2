"use client"

import React, { useEffect, useRef, useState } from "react"
import { getDb, getFirebaseAuth } from "../lib/firebase/client"
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore"

interface Msg { id: string; uid: string; text: string; displayName?: string|null; createdAt?: any }

export default function CommunityGeneralChat() {
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
    const q = query(collection(db, 'community', 'general', 'messages'), orderBy('createdAt','desc'), limit(100))
    const off = onSnapshot(q, snap => {
      const arr: Msg[] = []
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }))
      setMsgs(arr.reverse())
      setTimeout(()=> { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, 50)
    })
    return () => off()
  }, [db])

  const send = async () => {
    if (!uid) return
    const t = text.trim()
    if (!t) return
    setText("")
    await addDoc(collection(db, 'community', 'general', 'messages'), {
      uid,
      displayName: displayName || null,
      text: t,
      createdAt: serverTimestamp(),
    })
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-4">
      <div className="text-white font-semibold mb-2">Algemeen chatkanaal</div>
      <div ref={listRef} className="h-72 overflow-auto rounded-md bg-slate-950/40 border border-slate-800 p-3">
        {msgs.length === 0 ? (
          <div className="text-sm text-gray-400">Nog geen berichten. Zeg hallo!</div>
        ) : (
          <div className="space-y-2">
            {msgs.map(m => (
              <div key={m.id} className="text-sm">
                <span className="text-emerald-300">{m.displayName || m.uid.slice(0,6)}:</span>{' '}
                <span className="text-gray-200 break-words">{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
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
      {!uid && <div className="mt-2 text-xs text-gray-400">Log in via Settings om mee te praten.</div>}
    </div>
  )
}

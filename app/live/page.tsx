"use client"

import React, { useEffect, useMemo, useState } from "react"
import Header from "../../components/Header"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { collection, collectionGroup, onSnapshot, orderBy, query } from "firebase/firestore"

// Live hub MVP
// - Events: reads from live/events (optional). If empty, shows helpful info.
// - News: placeholder list (AI summaries hook will come via /api/live/news later)
// - Friends now: reads collectionGroup('presence') and shows users recently online

type LiveEvent = {
  id: string
  title: string
  startsAt?: any
  description?: string
}

type PresenceEntry = {
  uid: string
  lastSeen?: any
  online?: boolean
}

export default function LivePage() {
  const db = getDb()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [friends, setFriends] = useState<PresenceEntry[]>([])

  useEffect(() => {
    // Events (support both 'events' and 'event' collection names)
    const qEvents = query(collection(db, 'live', 'default', 'events'))
    const qEvent = query(collection(db, 'live', 'default', 'event'))
    const off1 = onSnapshot(qEvents, (snap) => {
      const arr: LiveEvent[] = []
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }))
      setEvents(arr)
    })
    const off1b = onSnapshot(qEvent, (snap) => {
      const arr: LiveEvent[] = []
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }))
      // If 'events' already has items, prefer it; else fall back to 'event'
      setEvents(prev => prev.length ? prev : arr)
    })
    // Presence (collectionGroup)
    const qp = query(collectionGroup(db, 'presence'))
    const off2 = onSnapshot(qp, (snap) => {
      const arr: PresenceEntry[] = []
      snap.forEach(d => {
        const seg = d.ref.path.split('/')
        const i = seg.indexOf('users')
        const uid = seg[i+1]
        const data = d.data() as any
        arr.push({ uid, online: !!data?.online, lastSeen: data?.lastSeen })
      })
      // Sort: online first
      arr.sort((a,b)=> (Number(!!b.online)-Number(!!a.online)))
      setFriends(arr)
    })
    return () => { off1(); off1b(); off2() }
  }, [db])

  const news = useMemo(() => {
    // Placeholder items; later replace with /api/live/news summaries
    return [
      { id: 'n1', title: 'Nieuwe releases deze week', summary: 'Kort overzicht met wat er uitkomt.' },
      { id: 'n2', title: 'Trending games', summary: 'Wat speelt men nu het meest?' },
    ]
  }, [])

  return (
    <>
      <Header currentPage="live" />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <h1 className="text-2xl font-semibold text-white mb-4">Live</h1>

        {/* Events */}
        <section className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Events</h2>
          </div>
          {events.length === 0 ? (
            <div className="text-sm text-gray-400">Nog geen events. Voeg items toe in Firestore onder <code>live/default/events</code>.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {events.map(e => (
                <div key={e.id} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                  <div className="text-white font-medium">{e.title}</div>
                  {e.startsAt && <div className="text-xs text-gray-400">Start: {new Date(e.startsAt?.seconds? e.startsAt.seconds*1000 : e.startsAt).toLocaleString()}</div>}
                  {e.description && <div className="text-sm text-gray-300 mt-1">{e.description}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* News */}
        <section className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">News</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {news.map(n => (
              <div key={n.id} className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <div className="text-white font-medium">{n.title}</div>
                <div className="text-sm text-gray-300 mt-1">{n.summary}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">AI‑samenvattingen volgen (OpenRouter) via een server route.</div>
        </section>

        {/* Friends now */}
        <section className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Vrienden nu</h2>
          </div>
          {friends.length === 0 ? (
            <div className="text-sm text-gray-400">Nog geen presence. Presence wordt elke 60s geüpdatet wanneer iemand ingelogd is.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {friends.map(f => (
                <div key={f.uid} className={`px-3 py-2 rounded-full border ${f.online? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-200' : 'bg-slate-800/60 border-slate-700 text-gray-300'}`}>
                  <span className="text-sm">{f.uid.slice(0,6)}…</span>
                  <span className="ml-2 text-[11px] opacity-80">{f.online? 'online' : 'laatst gezien'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}

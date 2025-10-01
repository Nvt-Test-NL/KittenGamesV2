"use client"

import React, { useEffect, useMemo, useState } from "react"
import Header from "../../components/Header"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore"

export default function AdminPage() {
  const db = getDb()
  const [uid, setUid] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [warn, setWarn] = useState<string>("")

  // Data
  const [ideas, setIdeas] = useState<any[]>([])
  const [communityMsgs, setCommunityMsgs] = useState<any[]>([])
  const [allChats, setAllChats] = useState<any[]>([])
  const [suspendInput, setSuspendInput] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(async (u)=>{
      setUid(u?.uid || null)
      if (!u) { setIsAdmin(false); return }
      try {
        const p = await getDoc(doc(db, 'publicProfiles', u.uid))
        setIsAdmin(Boolean(p.exists() && (p.data() as any)?.isAdmin===true))
      } catch { setIsAdmin(false) }
    })
  }, [])

  useEffect(() => {
    if (!uid || !isAdmin) return
    ;(async()=>{
      try {
        // Feedback ideas
        try {
          const iq = query(collection(db, 'feedbackIdeas'))
          const isnap = await getDocs(iq)
          const iarr: any[] = []
          isnap.forEach(d=> iarr.push({ id: d.id, ...d.data() }))
          setIdeas(iarr)
        } catch(e:any) { setWarn(prev=> (prev? prev+" | ":"") + `feedbackIdeas: ${String(e?.message||e)}`) }

        // Community messages: enumerate channels then read their messages
        try {
          const channelsSnap = await getDocs(collection(db, 'community'))
          const carr: any[] = []
          if (!channelsSnap.empty) {
            for (const ch of channelsSnap.docs) {
              const msgs = await getDocs(query(collection(db, 'community', ch.id, 'messages'), limit(100)))
              msgs.forEach(m=> carr.push({ id: m.id, channel: ch.id, path: `community/${ch.id}/messages/${m.id}`, ...m.data() }))
            }
          } else {
            // Fallback: no channel docs found; use collectionGroup('messages') and extract channel from parent path
            const cgg = await getDocs(query(collectionGroup(db, 'messages'), limit(200)))
            cgg.forEach(d=>{
              const pp: any = (d.ref.parent as any).parent // DocumentReference of channel doc
              const parentPath = pp?.path || '' // e.g., 'community/general'
              if (parentPath.startsWith('community/')) {
                const chId = parentPath.split('/')[1]
                carr.push({ id: d.id, channel: chId, path: `${parentPath}/messages/${d.id}`, ...d.data() })
              }
            })
          }
          setCommunityMsgs(carr)
        } catch(e:any) { setWarn(prev=> (prev? prev+" | ":"") + `community: ${String(e?.message||e)}`) }

        // All chats
        try {
          const chs = await getDocs(query(collection(db, 'chats'), limit(50)))
          const arr: any[] = []
          chs.forEach(d=> arr.push({ id: d.id, ...d.data() }))
          setAllChats(arr)
        } catch(e:any) { setWarn(prev=> (prev? prev+" | ":"") + `chats: ${String(e?.message||e)}`) }
      } finally { setLoading(false) }
    })()
  }, [uid, isAdmin])

  if (!uid) {
    return (<><Header currentPage="admin" /><main className="container mx-auto px-4 pt-24 pb-8"><div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-gray-200">Log in als admin.</div></main></>)
  }
  if (!isAdmin) {
    return (<><Header currentPage="admin" /><main className="container mx-auto px-4 pt-24 pb-8"><div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-200">Geen admin‑rechten. Zorg dat <code>publicProfiles/{uid}.isAdmin</code> true is.</div></main></>)
  }

  return (
    <>
      <Header currentPage="admin" />
      <main className="container mx-auto px-4 pt-24 pb-12">
        {warn && <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">{warn}</div>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Feedback status */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-white font-semibold mb-2">Feedback status</div>
            {ideas.length===0 && <div className="text-xs text-gray-500">Geen items.</div>}
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {ideas.map(it => (
                <div key={it.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                  <div className="text-sm text-white">{it.title || '(geen titel)'}</div>
                  <div className="text-xs text-gray-400 mb-1">{it.detail || ''}</div>
                  <div className="flex items-center gap-2">
                    <select defaultValue={it.status||'mogelijk'} onChange={async(e)=>{ const val = e.target.value; try { await updateDoc(doc(db, 'feedbackIdeas', it.id), { status: val, updatedAt: serverTimestamp() }); setIdeas(prev=> prev.map(x=> x.id===it.id? { ...x, status: val } : x)) } catch(err:any){ setWarn(String(err?.message||err)) } }} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-gray-200">
                      <option value="considering">mogelijk</option>
                      <option value="in_progress">meebezig</option>
                      <option value="done">done</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Community messages */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-white font-semibold mb-2">Community berichten</div>
            <div className="text-xs text-gray-400 mb-2">Max 50 via collectionGroup. Alleen berichten onder <code>/community/*</code> worden getoond.</div>
            {communityMsgs.length===0 && <div className="text-xs text-gray-500">Geen berichten.</div>}
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {communityMsgs.map(m => (
                <div key={m.path} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-400 break-all">{m.path}</div>
                    <div className="text-sm text-white">{m.text || '(media/geen tekst)'}</div>
                  </div>
                  <button onClick={async()=>{ try {
                    await deleteDoc(doc(db, 'community', m.channel, 'messages', m.id));
                    setCommunityMsgs(prev=> prev.filter(x=> !(x.channel===m.channel && x.id===m.id)))
                    // Create notice for author on next login
                    const targetUid = (m.uid || m.userId || '').trim()
                    if (targetUid) {
                      await addDoc(collection(db, 'users', targetUid, 'notices'), {
                        type: 'community_delete',
                        channel: m.channel,
                        messageId: m.id,
                        removedAt: serverTimestamp(),
                        textPreview: m.text || null,
                        reason: 'Bericht verwijderd wegens overtreden beleid.',
                        firstWarning: true,
                        read: false
                      })
                    }
                  } catch(err:any){ setWarn(String(err?.message||err)) } }} className="px-2 py-1 rounded bg-rose-600 text-white text-xs">Verwijder</button>
                </div>
              ))}
            </div>
          </section>

          {/* Accounts suspend */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-white font-semibold mb-2">Accounts schorsen</div>
            <div className="text-xs text-gray-400 mb-2">Voer een UID in (of exacte e‑mail). Bij e‑mail kijkt het systeem naar <code>publicProfiles</code>.</div>
            <div className="flex gap-2 mb-2">
              <input value={suspendInput} onChange={(e)=>setSuspendInput(e.target.value)} placeholder="uid of email" className="flex-1 glass-input rounded-md px-3 py-2 text-sm" />
              <button onClick={async()=>{
                try {
                  const v = suspendInput.trim().toLowerCase(); if (!v) return
                  let targetUid = v
                  if (v.includes('@')) {
                    // try resolve by emailLower in publicProfiles (client-side scan: first 50)
                    const qs = await getDocs(query(collection(db, 'publicProfiles'), limit(50)))
                    let found: string | null = null
                    qs.forEach(d=>{ const em = (d.data() as any)?.emailLower; if (!found && em===v) found = d.id })
                    if (found) targetUid = found
                  }
                  await setDoc(doc(db, 'publicProfiles', targetUid), { suspended: true, suspendedAt: serverTimestamp() }, { merge: true })
                  setWarn(`Account geschorst: ${targetUid}`)
                } catch(e:any){ setWarn(String(e?.message||e)) }
              }} className="px-3 py-2 rounded-md bg-amber-600 text-white text-sm">Schors</button>
              <button onClick={async()=>{
                try { const v = suspendInput.trim(); if (!v) return; await setDoc(doc(db, 'publicProfiles', v), { suspended: false, unsuspendedAt: serverTimestamp() }, { merge: true }); setWarn(`Schorsing opgeheven: ${v}`) } catch(e:any){ setWarn(String(e?.message||e)) }
              }} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Opheffen</button>
            </div>
          </section>

          {/* All chats */}
          <section className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="text-white font-semibold mb-2">Alle chats en groepen</div>
            <div className="text-xs text-gray-400 mb-2">Max 50 items.</div>
            {allChats.length===0 && <div className="text-xs text-gray-500">Geen chats gevonden.</div>}
            <div className="space-y-1 max-h-[50vh] overflow-auto">
              {allChats.map(c => (
                <div key={c.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800">
                  <div className="text-sm text-white">{c.name || (c.isGroup? 'Groep' : 'DM')} <span className="text-xs text-gray-400">({c.id})</span></div>
                  <div className="text-xs text-gray-400">{Array.isArray(c.members)? c.members.length : 0} leden • {c.isGroup? 'groep' : 'dm'}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

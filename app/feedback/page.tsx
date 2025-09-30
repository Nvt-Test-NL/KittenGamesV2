"use client"

import React, { useEffect, useMemo, useState } from "react"
import Header from "../../components/Header"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore"

// Data model
// feedback/ideas/{id}: { title, detail, status: 'idea'|'considering'|'in_progress'|'done', createdBy, createdAt, votesCount, votes: { [uid]: true } }
// feedback/applications/{id}: { uid, name, email, motivation, createdAt }

const tabs = [
  { key: 'idea', label: 'Idee' },
  { key: 'considering', label: 'Mogelijk uitgevoerd' },
  { key: 'in_progress', label: 'Meebezig' },
  { key: 'done', label: 'Klaar' },
] as const

type StatusKey = typeof tabs[number]['key']

type Idea = {
  id: string
  title: string
  detail: string
  status: StatusKey
  createdBy: string
  createdAt?: any
  votesCount?: number
  votes?: Record<string, boolean>
}

export default function FeedbackPage() {
  const db = getDb()
  const auth = getFirebaseAuth()
  const [uid, setUid] = useState<string | null>(null)
  const [selected, setSelected] = useState<StatusKey>('idea')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [profiles, setProfiles] = useState<Record<string, {displayName?: string|null, email?: string|null}>>({})
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [showApply, setShowApply] = useState(false)
  const [applyName, setApplyName] = useState("")
  const [applyEmail, setApplyEmail] = useState("")
  const [applyMotivation, setApplyMotivation] = useState("")
  const [msg, setMsg] = useState("")

  useEffect(() => auth.onAuthStateChanged(u => setUid(u?.uid || null)), [auth])

  useEffect(() => {
    // Subscribe both top-level and legacy path, merge client-side
    const q1 = query(collection(db, 'feedbackIdeas'))
    const off1 = onSnapshot(q1, snap => {
      const arr: Idea[] = []
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }))
      setIdeas(prev => {
        // merge with any legacy already set; we'll let the legacy subscription also update
        const merged = [...arr]
        return merged.filter(x => x.status === selected).sort((a,b)=> (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0))
      })
    })
    const q2 = query(collection(db, 'feedback', 'ideas'))
    const off2 = onSnapshot(q2, snap => {
      const legacy: Idea[] = []
      snap.forEach(d => legacy.push({ id: d.id, ...(d.data() as any) }))
      setIdeas(prev => {
        const map = new Map<string, Idea>()
        ;[...prev, ...legacy].forEach(it => { map.set(it.id, it) })
        const merged = Array.from(map.values())
        return merged.filter(x => x.status === selected).sort((a,b)=> (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0))
      })
    })
    return () => { off1(); off2() }
  }, [db, selected])

  // Load display names/emails for creators and voters
  useEffect(() => {
    const uids = new Set<string>()
    ideas.forEach(it => {
      if (it.createdBy) uids.add(it.createdBy)
      const vs = it.votes ? Object.keys(it.votes) : []
      vs.forEach(v=>uids.add(v))
    })
    const need = Array.from(uids).filter(u => !profiles[u])
    if (!need.length) return
    ;(async()=>{
      const next: Record<string, {displayName?: string|null, email?: string|null}> = {}
      for (const u of need) {
        try {
          const snap = await getDoc(doc(db, 'users', u, 'profile', 'public'))
          const d = snap.data() as any
          next[u] = { displayName: d?.displayName || null, email: d?.email || null }
        } catch {
          next[u] = {}
        }
      }
      setProfiles(p => ({ ...p, ...next }))
    })()
  }, [ideas, db])

  const submitIdea = async () => {
    if (!uid) { setMsg('Login vereist.'); return }
    const t = title.trim(); const d = detail.trim(); if (!t || !d) return
    await addDoc(collection(db, 'feedbackIdeas'), {
      title: t, detail: d, status: 'idea', createdBy: uid, createdAt: serverTimestamp(), votesCount: 0, votes: {}
    })
    setTitle(""); setDetail("")
  }

  const vote = async (item: Idea) => {
    if (!uid) { setMsg('Login vereist.'); return }
    const ref = doc(db, 'feedbackIdeas', item.id)
    const snap = await getDoc(ref)
    const cur = snap.data() as any
    const votes = cur?.votes || {}
    if (votes[uid]) return // already voted
    votes[uid] = true
    const votesCount = (cur?.votesCount || 0) + 1
    const update: any = { votes, votesCount }
    if (votesCount >= 3 && cur?.status === 'idea') update.status = 'considering'
    await updateDoc(ref, update)
  }

  const applyAdmin = async () => {
    if (!uid) { setMsg('Login vereist.'); return }
    const n = applyName.trim(), e = applyEmail.trim(), m = applyMotivation.trim()
    if (!n || !e || !m) return
    await addDoc(collection(db, 'feedbackApplications'), { uid, name: n, email: e, motivation: m, createdAt: serverTimestamp() })
    setShowApply(false); setApplyName(""); setApplyEmail(""); setApplyMotivation("")
    setMsg('Aanvraag verstuurd.')
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="community" />
      <main className="container mx-auto px-4 pt-24 pb-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Feedback & Ideënbord</h1>
            <p className="text-sm text-gray-400">Dien ideeën in, stem op voorstellen en solliciteer als admin.</p>
          </div>
          <button onClick={()=>setShowApply(true)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-100 text-sm">Solliciteer Admin</button>
        </div>

        {msg && <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded p-2">{msg}</div>}

        {/* Submit idea */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="text-white font-semibold mb-3">Nieuw idee</div>
          <div className="grid md:grid-cols-2 gap-3">
            <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Titel" className="glass-input rounded-md px-3 py-2 text-sm" />
            <input value={detail} onChange={(e)=>setDetail(e.target.value)} placeholder="Korte toelichting" className="glass-input rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <button onClick={submitIdea} disabled={!uid || !title.trim() || !detail.trim()} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50">Indienen</button>
          </div>
          <div className="mt-2 text-xs text-gray-400">Wanneer een idee <span className="text-emerald-300">3 of meer stemmen</span> krijgt, verplaatst het automatisch naar <strong>Mogelijk uitgevoerd</strong>. Daarna kan een admin het oppakken naar <strong>Meebezig</strong> of <strong>Klaar</strong>.</div>
        </section>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={()=>setSelected(t.key)} className={`px-3 py-1.5 rounded-full border text-sm ${selected===t.key? 'bg-slate-800 border-emerald-400/30 text-white':'bg-slate-900/60 border-slate-700 text-gray-300'}`}>{t.label}</button>
          ))}
        </div>

        {/* Ideas list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          {ideas.length === 0 ? (
            <div className="text-sm text-gray-400">Geen items.</div>
          ) : (
            <div className="space-y-2">
              {ideas.map((it) => (
                <div key={it.id} className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">{it.title}</div>
                    <div className="text-sm text-gray-300">{it.detail}</div>
                    <div className="text-[11px] text-gray-400 mt-1">Status: {it.status} • Stemmen: {it.votesCount || 0} • Door: {profiles[it.createdBy]?.displayName || profiles[it.createdBy]?.email || it.createdBy}</div>
                    {it.votes && Object.keys(it.votes).length>0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-emerald-300">Bekijk stemmers</summary>
                        <ul className="text-[11px] text-gray-300 list-disc list-inside">
                          {Object.keys(it.votes).map((vu) => (
                            <li key={vu}>{profiles[vu]?.displayName || profiles[vu]?.email || vu}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  {selected==='idea' && (
                    <button onClick={()=>vote(it)} disabled={!uid || !!it.votes?.[uid!]} className={`px-3 py-1.5 rounded-md text-xs ${it.votes?.[uid!] ? 'bg-slate-700 text-gray-300' : 'bg-emerald-600 text-white'} disabled:opacity-50`}>
                      {it.votes?.[uid!] ? 'Gestemd' : 'Stem'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={()=>setShowApply(false)} />
          <div className="relative w-full max-w-lg mx-auto rounded-2xl border border-slate-800 bg-slate-900/85 p-5 shadow-xl">
            <div className="text-white font-semibold mb-2">Solliciteer voor Admin</div>
            <div className="text-sm text-gray-300 mb-3">Admins helpen met games toevoegen, chat/community moderatie en feedback opvolgen.</div>
            <div className="space-y-2">
              <input value={applyName} onChange={(e)=>setApplyName(e.target.value)} placeholder="Naam" className="w-full glass-input rounded-md px-3 py-2 text-sm" />
              <input value={applyEmail} onChange={(e)=>setApplyEmail(e.target.value)} placeholder="E‑mail" className="w-full glass-input rounded-md px-3 py-2 text-sm" />
              <textarea value={applyMotivation} onChange={(e)=>setApplyMotivation(e.target.value)} placeholder="Korte motivatie" className="w-full glass-input rounded-md px-3 py-2 text-sm min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>setShowApply(false)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-200 text-sm">Annuleren</button>
              <button onClick={applyAdmin} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Verstuur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

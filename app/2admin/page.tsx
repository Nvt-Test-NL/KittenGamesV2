"use client"

import React, { useEffect, useState } from "react"
import Header from "../../components/Header"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"

export default function SuperAdminPage() {
  const db = getDb()
  const [uid, setUid] = useState<string|null>(null)
  const [isAdmin2, setIsAdmin2] = useState(false)
  const [warn, setWarn] = useState("")
  const [games, setGames] = useState<any[]>([])

  const [name, setName] = useState("")
  const [type, setType] = useState("proxy")
  const [image, setImage] = useState("")
  const [url, setUrl] = useState("")

  useEffect(()=>{
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(async(u)=>{
      setUid(u?.uid||null)
      if (!u) { setIsAdmin2(false); return }
      try {
        const p = await getDoc(doc(db, 'publicProfiles', u.uid))
        setIsAdmin2(Boolean(p.exists() && (p.data() as any)?.isAdmin2 === true))
      } catch { setIsAdmin2(false) }
    })
  }, [])

  useEffect(()=>{
    if (!uid || !isAdmin2) return
    ;(async()=>{
      try { const snap = await getDocs(query(collection(db,'games'), limit(200))); const arr:any[]=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); setGames(arr) } catch(e:any){ setWarn(String(e?.message||e)) }
    })()
  }, [uid, isAdmin2])

  if (!uid) return (<><Header currentPage="2admin" /><main className="container mx-auto px-4 pt-24 pb-10"><div className="p-3 rounded bg-slate-900/60 border border-slate-800 text-gray-200">Log in als super admin.</div></main></>)
  if (!isAdmin2) return (<><Header currentPage="2admin" /><main className="container mx-auto px-4 pt-24 pb-10"><div className="p-3 rounded bg-amber-500/10 border border-amber-400/30 text-amber-200">Geen toegang. Zet <code>publicProfiles/{uid}.isAdmin2</code> op true.</div></main></>)

  return (
    <>
      <Header currentPage="2admin" />
      <main className="container mx-auto px-4 pt-24 pb-10 space-y-6">
        {warn && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">{warn}</div>}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-white font-semibold mb-2">Games catalogus (Firestore)</div>
          <p className="text-xs text-gray-400 mb-2">Voeg extra entries toe. Deze worden client‑side gecombineerd met het lokale <code>KittenGames-gamelibrary-main/games.json</code>.</p>
          <div className="grid md:grid-cols-4 gap-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="name" className="glass-input rounded px-3 py-2 text-sm" />
            <input value={type} onChange={e=>setType(e.target.value)} placeholder="type (game|movie|proxy)" className="glass-input rounded px-3 py-2 text-sm" />
            <input value={image} onChange={e=>setImage(e.target.value)} placeholder="image URL (prefix)" className="glass-input rounded px-3 py-2 text-sm" />
            <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="url" className="glass-input rounded px-3 py-2 text-sm" />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={async()=>{ try { if(!name||!url){ setWarn('name en url vereist'); return } await addDoc(collection(db,'games'), { name, type, image, url, createdAt: serverTimestamp() }); setName(''); setType('proxy'); setImage(''); setUrl(''); const snap = await getDocs(query(collection(db,'games'), limit(200))); const arr:any[]=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); setGames(arr) } catch(e:any){ setWarn(String(e?.message||e)) } }} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm">Toevoegen</button>
          </div>
          <div className="mt-3 grid md:grid-cols-2 gap-2 max-h-[50vh] overflow-auto">
            {games.map(g=> (
              <div key={g.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{g.name} <span className="text-xs text-gray-400">({g.type})</span></div>
                  <div className="text-xs text-gray-400 truncate">{g.url}</div>
                </div>
                <button onClick={async()=>{ try { await deleteDoc(doc(db,'games',g.id)); setGames(prev=>prev.filter(x=>x.id!==g.id)) } catch(e:any){ setWarn(String(e?.message||e)) } }} className="px-2 py-1 rounded bg-rose-600 text-white text-xs">Verwijder</button>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-slate-950/50 border border-slate-800 text-xs text-gray-300">
            JSON voorbeeld (zoals in games.json):
            <pre className="mt-2 whitespace-pre-wrap text-[11px] text-gray-400">{`{
  "name": "Tiktok Pjotter-Proxy",
  "type": "proxy",
  "image": "https://cdn.statically.io/gh/CodingKitten-YT/KittenGames-gamelibrary/main/images/",
  "url": "https://tiktok.nl"
}`}</pre>
          </div>
        </div>
      </main>
    </>
  )
}

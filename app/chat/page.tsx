"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Header from "../../components/Header"
import UserSearchModal from "../../components/UserSearchModal"
import { getDb, getFirebaseAuth } from "../../lib/firebase/client"
import { addDoc, collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore"

// Firestore data model (MVP)
// chats/{chatId}: { name?: string, isGroup: boolean, members: string[], createdAt, createdBy }
// chats/{chatId}/messages/{msgId}: { sender: string, text?: string, imageDataUrl?: string, createdAt }
// users/{uid}/profile: { displayName?: string, email?: string, updatedAt }
// Presence written by PresenceManager at users/{uid}/presence/now

// Local cache per chat for offline/quick load
const chatCacheKey = (chatId: string) => `kg_chat_cache_${chatId}_v1`

function useAuthUser() {
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged((u)=>{
      setUid(u?.uid || null)
      setEmail(u?.email || null)
      setDisplayName(u?.displayName || null)
    })
  }, [])
  return { uid, email, displayName }
}

async function ensureUserProfile(uid: string, email?: string|null, displayName?: string|null) {
  const db = getDb()
  try {
    const ref = doc(db, 'users', uid, 'profile', 'public')
    const emailLower = (email || '').toLowerCase() || null
    await setDoc(ref, { email: email || null, emailLower, displayName: displayName || null, updatedAt: serverTimestamp() }, { merge: true })
  } catch {}
}

async function dataUrlFromFile(file: File, maxW = 800, maxKB = 200): Promise<string> {
  // Compress to PNG/JPEG data URL under ~200KB if possible
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, maxW / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * ratio))
  const h = Math.max(1, Math.round(bitmap.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  let quality = 0.8
  let url = canvas.toDataURL('image/jpeg', quality)
  // Try reduce size under ~maxKB
  for (let i=0; i<4 && (url.length/1024)>maxKB; i++) {
    quality = Math.max(0.4, quality - 0.15)
    url = canvas.toDataURL('image/jpeg', quality)
  }
  return url
}

export default function ChatPage() {
  const { uid, email, displayName } = useAuthUser()
  const db = getDb()

  const [loading, setLoading] = useState(true)
  const [chats, setChats] = useState<any[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [composer, setComposer] = useState("")
  const [imgPreview, setImgPreview] = useState<string>("")
  const [userSearch, setUserSearch] = useState("")
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupMembers, setGroupMembers] = useState<string>("") // comma-separated emails
  const [warn, setWarn] = useState<string>("")
  const [showSearch, setShowSearch] = useState(false)
  const [chatFilterText, setChatFilterText] = useState("")
  const [chatFilterType, setChatFilterType] = useState<'all'|'dm'|'group'>('all')
  const [botStage, setBotStage] = useState<'idle'|'thinking'|'typing'>('idle')

  // Init
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    ensureUserProfile(uid, email, displayName).then(()=>{})
    const q = query(collection(db, 'chats'), where('members', 'array-contains', uid))
    const off = onSnapshot(q, async (snap) => {
      const arr: any[] = []
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }))
      setChats(arr.sort((a,b)=> (a.name||'').localeCompare(b.name||'')))
      if (!activeChatId && arr.length) setActiveChatId(arr[0].id)
      setLoading(false)
    })
    return () => off()
  }, [uid])

  // Load chat messages with local cache
  useEffect(() => {
    if (!activeChatId) return
    const cacheRaw = localStorage.getItem(chatCacheKey(activeChatId))
    if (cacheRaw) {
      try { setMessages(JSON.parse(cacheRaw)) } catch {}
    } else { setMessages([]) }

    const q = query(collection(db, 'chats', activeChatId, 'messages'), orderBy('createdAt', 'asc'))
    const off = onSnapshot(q, (snap) => {
      const arr: any[] = []
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }))
      setMessages(arr)
      try { localStorage.setItem(chatCacheKey(activeChatId), JSON.stringify(arr)) } catch {}
    })
    return () => off()
  }, [activeChatId])

  // Resolve profile emails -> UIDs using collectionGroup('profile') where email == value
  const resolveEmailsToUids = useCallback(async (inputs: string[]): Promise<string[]> => {
    const unique = Array.from(new Set(inputs.map(e=>e.trim().toLowerCase())))
    const found: string[] = []
    const notFound: string[] = []
    for (const raw of unique) {
      // accept direct UID
      if (!raw.includes('@') && raw.length >= 20) { found.push(raw); continue }
      const em = raw
      try {
        const cg = query(collectionGroup(db, 'profile'), where('emailLower', '==', em))
        const snaps = await getDocs(cg)
        if (!snaps.empty) {
          // derive uid from path: users/{uid}/profile/{doc}
          const anyDoc = snaps.docs[0]
          const segments = anyDoc.ref.path.split('/');
          const i = segments.indexOf('users')
          const uid = segments[i+1]
          if (uid) found.push(uid)
        } else {
          // try by displayName contains (visible only)
          const qv = query(collectionGroup(db, 'profile'), where('searchVisible','==', true))
          const snap2 = await getDocs(qv)
          let matched = false
          snap2.forEach(d => {
            const seg = d.ref.path.split('/')
            if (seg[seg.length-1] !== 'public') return
            const i2 = seg.indexOf('users')
            const uid2 = seg[i2+1]
            const dn = (d.data() as any)?.displayName || ''
            if (dn.toLowerCase().includes(raw)) { matched = true; if (uid2) found.push(uid2) }
          })
          if (!matched) notFound.push(raw)
        }
      } catch {
        notFound.push(raw)
      }
    }
    if (notFound.length) setWarn(`Kon geen gebruikers vinden voor: ${notFound.join(', ')}`)
    return found
  }, [db])

  const sendMessage = useCallback(async () => {
    if (!uid || !activeChatId) return
    const text = composer.trim()
    if (!text && !imgPreview) return
    setComposer("")
    const payload: any = { sender: uid, createdAt: serverTimestamp() }
    if (text) payload.text = text
    if (imgPreview) payload.imageDataUrl = imgPreview
    setImgPreview("")
    // Optimistic local cache update
    setMessages(prev => {
      const temp = [...prev, { ...payload, id: `temp-${Date.now()}` }]
      try { localStorage.setItem(chatCacheKey(activeChatId), JSON.stringify(temp)) } catch {}
      return temp
    })
    await addDoc(collection(db, 'chats', activeChatId, 'messages'), payload)
  }, [uid, activeChatId, composer, imgPreview])

  // @Pjotter-AI command
  const maybeHandleBot = useCallback(async (text: string) => {
    if (!text.startsWith('@Pjotter-AI')) return false
    const question = text.replace('@Pjotter-AI', '').trim()
    if (!question) return true
    // Add user message first
    setComposer(question)
    await sendMessage()
    // Then call backend and append assistant message
    try {
      setBotStage('thinking')
      const timer = setTimeout(()=> setBotStage('typing'), 3000)
      const sys = { role: 'system', content: 'Je bent Pjotter-AI in een chatroom. Antwoord kort en concreet in het Nederlands.' }
      const usr = { role: 'user', content: question }
      const res = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [sys, usr] }) })
      const data = await res.json().catch(()=>({choices:[{message:{content:"(geen antwoord)"}}]}))
      const content = data?.choices?.[0]?.message?.content || '(geen antwoord)'
      if (activeChatId) {
        await addDoc(collection(db, 'chats', activeChatId, 'messages'), { sender: 'bot:Pjotter', text: content, createdAt: serverTimestamp() })
      }
    } finally {
      setBotStage('idle')
    }
    return true
  }, [activeChatId, sendMessage])

  const onComposerSubmit = useCallback(async () => {
    const text = composer.trim()
    if (text.startsWith('@Pjotter-AI')) {
      const handled = await maybeHandleBot(text)
      if (handled) { setComposer(""); return }
    }
    await sendMessage()
  }, [composer, maybeHandleBot, sendMessage])

  const onPickImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    // Hard guard on original file size (~2MB) and final URL (~250KB)
    if (f.size > 2_000_000) { setWarn('Afbeelding is te groot (>2MB).'); return }
    const url = await dataUrlFromFile(f)
    if ((url.length/1024) > 260) { setWarn('Afbeelding blijft te groot (>~250KB) na compressie.'); return }
    setImgPreview(url)
  }, [])

  const createDM = useCallback(async () => {
    if (!uid || !userSearch.trim()) return
    const otherEmail = userSearch.trim().toLowerCase()
    const uids = await resolveEmailsToUids([otherEmail])
    if (!uids.length) { setWarn('Gebruiker niet gevonden.'); return }
    const otherUid = uids[0]
    // Find or create based on pairKey
    const a = uid < otherUid ? uid : otherUid
    const b = uid < otherUid ? otherUid : uid
    const pairKey = `${a}_${b}`
    // Look up existing
    try {
      const qx = query(collection(db, 'chats'), where('pairKey','==', pairKey), where('isGroup','==', false))
      const snaps = await getDocs(qx)
      if (!snaps.empty) {
        const id = snaps.docs[0].id
        setActiveChatId(id)
      } else {
        const members = [uid, otherUid]
        const ref = await addDoc(collection(db, 'chats'), { isGroup: false, pairKey, members, createdAt: serverTimestamp(), createdBy: uid })
        setActiveChatId(ref.id)
      }
    } catch {
      const members = Array.from(new Set([uid, otherUid]))
      const ref = await addDoc(collection(db, 'chats'), { isGroup: false, members, createdAt: serverTimestamp(), createdBy: uid })
      setActiveChatId(ref.id)
    }
    setUserSearch("")
  }, [uid, userSearch, resolveEmailsToUids])

  const startDMByUid = useCallback(async (otherUid: string) => {
    if (!uid || !otherUid) return
    const a = uid < otherUid ? uid : otherUid
    const b = uid < otherUid ? otherUid : uid
    const pairKey = `${a}_${b}`
    try {
      const qx = query(collection(db, 'chats'), where('pairKey','==', pairKey), where('isGroup','==', false))
      const snaps = await getDocs(qx)
      if (!snaps.empty) {
        setActiveChatId(snaps.docs[0].id)
      } else {
        const ref = await addDoc(collection(db, 'chats'), { isGroup: false, pairKey, members: [a,b], createdAt: serverTimestamp(), createdBy: uid })
        setActiveChatId(ref.id)
      }
    } finally { setShowSearch(false) }
  }, [uid])

  const createGroup = useCallback(async () => {
    if (!uid) return
    const emails = groupMembers.split(',').map(s=>s.trim()).filter(Boolean)
    const uids = await resolveEmailsToUids(emails)
    const members = Array.from(new Set([uid, ...uids]))
    const ref = await addDoc(collection(db, 'chats'), { isGroup: true, name: groupName || 'Groep', members, createdAt: serverTimestamp(), createdBy: uid })
    setActiveChatId(ref.id)
    setCreatingGroup(false); setGroupName(""); setGroupMembers("")
  }, [uid, groupName, groupMembers, resolveEmailsToUids])

  if (!uid) {
    return (
      <>
        <Header currentPage="chat" />
        <main className="container mx-auto px-4 pt-24 pb-8">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-gray-200">Log in om te chatten.</div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header currentPage="chat" />
      <main className="container mx-auto px-4 pt-24 pb-8">
        {warn && (
          <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">{warn}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <aside className="md:col-span-1 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-1">Snel acties</div>
              <div className="flex gap-2">
                <button onClick={()=>setShowSearch(true)} className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-100 text-sm">Zoek gebruiker</button>
              </div>
            </div>
            <div className="mb-3">
              <button onClick={()=>setCreatingGroup(v=>!v)} className={`px-3 py-2 rounded-md border text-sm ${creatingGroup? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/25'}`}>{creatingGroup? 'Annuleer' : '+ Nieuwe groep'}</button>
              {creatingGroup && (
                <div className="mt-2 space-y-2">
                  <input value={groupName} onChange={(e)=>setGroupName(e.target.value)} placeholder="Groepsnaam" className="w-full glass-input rounded-md px-3 py-2 text-sm" />
                  <input value={groupMembers} onChange={(e)=>setGroupMembers(e.target.value)} placeholder="Leden emails, komma-gescheiden" className="w-full glass-input rounded-md px-3 py-2 text-sm" />
                  <button onClick={createGroup} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Aanmaken</button>
                </div>
              )}
            </div>
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">Filter</div>
              <div className="flex gap-2">
                <input value={chatFilterText} onChange={(e)=>setChatFilterText(e.target.value)} placeholder="Zoek chats/groepen" className="flex-1 glass-input rounded-md px-3 py-2 text-sm" />
                <select value={chatFilterType} onChange={(e)=>setChatFilterType(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-gray-200">
                  <option value="all">Alle</option>
                  <option value="dm">Chats</option>
                  <option value="group">Groepen</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-1">Jouw chats</div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
              {chats
                .filter(c => chatFilterType==='all' ? true : (chatFilterType==='group' ? c.isGroup : !c.isGroup))
                .filter(c => (c.name|| (c.isGroup? 'Groep' : 'DM')).toLowerCase().includes(chatFilterText.toLowerCase()))
                .map(c => (
                <button key={c.id} onClick={()=>setActiveChatId(c.id)} className={`w-full text-left px-3 py-2 rounded-md border ${activeChatId===c.id? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-slate-900/40 border-slate-700 text-gray-300 hover:bg-slate-800/50'}`}>
                  <div className="text-sm font-medium">{c.name || (c.isGroup? 'Groep' : 'DM')}</div>
                  <div className="text-[11px] text-gray-400">{Array.isArray(c.members)? c.members.length : 0} leden</div>
                </button>
              ))}
              {!chats.length && <div className="text-xs text-gray-500">Nog geen chats.</div>}
            </div>
          </aside>
          <section className="md:col-span-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col min-h-[60vh]">
            {!activeChatId ? (
              <div className="text-gray-400">Selecteer of maak een chat…</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-3 p-2">
                  {messages.map(m => (
                    <div key={m.id} className={`max-w-[85%] ${m.sender===uid? 'ml-auto' : ''}`}>
                      <div className={`px-3 py-2 rounded-lg ${m.sender===uid? 'bg-emerald-600/20 text-white' : m.sender==='bot:Pjotter'? 'bg-slate-800/80 text-emerald-200' : 'bg-slate-800/80 text-gray-100'}`}>
                        {m.text && <div className="whitespace-pre-wrap text-sm">{m.text}</div>}
                        {m.imageDataUrl && (
                          <div className="mt-2">
                            <img src={m.imageDataUrl} className="max-h-64 rounded" alt="bijlage" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {botStage !== 'idle' && (
                    <div className="max-w-[85%]">
                      <div className="mt-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                        <span className="ml-2 text-sm text-gray-300">{botStage==='thinking' ? 'Pjotter-AI is aan het denken…' : 'Pjotter-AI is aan het typen…'}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-800 pt-2">
                  {imgPreview && (
                    <div className="mb-2">
                      <img src={imgPreview} className="max-h-40 rounded" alt="bijlage" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={onPickImage} className="hidden" id="pickImg" />
                    <label htmlFor="pickImg" className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-200 text-sm cursor-pointer">📎 Foto</label>
                    <input
                      value={composer}
                      onChange={(e)=>setComposer(e.target.value)}
                      onKeyDown={(e)=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); onComposerSubmit() } }}
                      placeholder="Bericht… Gebruik @Pjotter-AI voor AI"
                      className="flex-1 glass-input rounded-md px-3 py-2 text-sm"
                    />
                    <button onClick={onComposerSubmit} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Verstuur</button>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">Afbeeldingen &lt;~200KB, lokaal gecached; transport via Firestore. Geen Storage benodigd.</div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      {showSearch && <UserSearchModal onClose={()=>setShowSearch(false)} onStartDM={startDMByUid} />}
    </>
  )
}

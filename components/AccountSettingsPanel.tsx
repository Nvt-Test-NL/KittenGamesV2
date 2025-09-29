"use client"

import React, { useEffect, useState } from "react"
import { getFirebaseAuth, signInWithGoogle, emailLogin, emailRegister, logout, getDb } from "../lib/firebase/client"
import { updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

export default function AccountSettingsPanel() {
  const [userEmail, setUserEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsub = auth.onAuthStateChanged(u => setCurrentUser(u))
    return () => unsub()
  }, [])

  const doGoogle = async () => {
    setBusy(true); setMessage("")
    try {
      await signInWithGoogle()
      const auth = getFirebaseAuth()
      if (auth.currentUser) {
        try {
          const email = auth.currentUser.email || ""
          const emailLower = email.toLowerCase()
          await setDoc(doc(getDb(), 'users', auth.currentUser.uid, 'profile', 'public'), {
            email,
            emailLower,
            displayName: auth.currentUser.displayName || null,
            updatedAt: serverTimestamp(),
          }, { merge: true })
        } catch {}
      }
    } catch (e:any) { setMessage(String(e?.message||e)) } finally { setBusy(false) }
  }
  const doRegister = async () => {
    if (!userEmail || !password) { setMessage("Vul e‑mail en wachtwoord in"); return }
    setBusy(true); setMessage("")
    try {
      await emailRegister(userEmail, password)
      const auth = getFirebaseAuth()
      if (auth.currentUser) {
        if (displayName.trim()) {
          await updateProfile(auth.currentUser, { displayName: displayName.trim() })
        }
        // Write profile doc
        try {
          const email = auth.currentUser.email || userEmail
          const emailLower = (email || "").toLowerCase()
          await setDoc(doc(getDb(), 'users', auth.currentUser.uid, 'profile', 'public'), {
            email,
            emailLower,
            displayName: displayName.trim() || auth.currentUser.displayName || null,
            updatedAt: serverTimestamp(),
          }, { merge: true })
        } catch {}
      }
      setMessage("Account aangemaakt.")
    } catch (e:any) {
      setMessage(String(e?.message||e))
    } finally { setBusy(false) }
  }
  const doLogin = async () => { if (!userEmail || !password) { setMessage("Vul e‑mail en wachtwoord in"); return } setBusy(true); setMessage(""); try { await emailLogin(userEmail, password) } catch (e:any) { setMessage(String(e?.message||e)) } finally { setBusy(false) } }
  const doLogout = async () => { setBusy(true); setMessage(""); try { await logout() } catch (e:any) { setMessage(String(e?.message||e)) } finally { setBusy(false) } }

  return (
    <div className="space-y-5 text-gray-100">
      {currentUser ? (
        <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="text-sm text-gray-300">Ingelogd als</div>
          <div className="text-white font-medium">{currentUser.displayName || currentUser.email || currentUser.uid}</div>
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Weergavenaam</label>
              <input type="text" placeholder="Jouw naam" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-white text-sm" />
            </div>
            <button
              onClick={async()=>{
                const auth = getFirebaseAuth(); if (!auth.currentUser) return;
                setBusy(true); setMessage("")
                try {
                  if (displayName.trim()) await updateProfile(auth.currentUser, { displayName: displayName.trim() })
                  await setDoc(doc(getDb(), 'users', auth.currentUser.uid, 'profile', 'public'), {
                    displayName: displayName.trim(), updatedAt: serverTimestamp()
                  }, { merge: true })
                  setMessage("Naam bijgewerkt.")
                } catch(e:any) { setMessage(String(e?.message||e)) } finally { setBusy(false) }
              }}
              disabled={busy || !displayName.trim()}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            >Opslaan</button>
          </div>
          <button onClick={doLogout} disabled={busy} className="mt-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm">Logout</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-white font-semibold mb-2">E‑mail & wachtwoord</div>
              <div className="space-y-2">
                <input type="text" placeholder="Weergavenaam (optioneel)" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-white text-sm" />
                <input type="email" placeholder="E‑mail" value={userEmail} onChange={(e)=>setUserEmail(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-white text-sm" />
                <input type="password" placeholder="Wachtwoord" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-700 text-white text-sm" />
                <div className="flex gap-2">
                  <button onClick={doLogin} disabled={busy} className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Login</button>
                  <button onClick={doRegister} disabled={busy} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm">Register</button>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800">
              <div className="text-white font-semibold mb-2">Google</div>
              <p className="text-sm text-gray-400 mb-2">Snel aanmelden met Google.</p>
              <button onClick={doGoogle} disabled={busy} className="px-3 py-1.5 rounded bg-white/90 text-black hover:bg-white text-sm">Sign in with Google</button>
            </div>
          </div>
          {message && <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded px-3 py-2">{message}</div>}
        </>
      )}
      <div className="text-xs text-gray-400">Accounts zijn optioneel met uizondering van: CatGames-Chat en CatGames-Proxy. Bij inloggen worden sync‑toggles toegepast voor Favorites / History / Quests.</div>
      <div className="text-xs text-gray-400">Het aanmaken van een account is volledig gratis en geen verplichte stap.</div>
      <div className="text-xs text-gray-400">Catgames brengt nooit zo maar kosten aan bij gebruikers. Catgames biedt momenteel geen optie's tot betalen.</div>

    </div>
  )
}

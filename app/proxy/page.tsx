"use client"

import React, { useEffect, useState } from "react"
import Header from "../../components/Header"
import Link from "next/link"
import { getFirebaseAuth } from "../../lib/firebase/client"
import { Lock } from "lucide-react"
import { proxySites } from "../../config/proxySites"

export default function ProxyHub() {
  const [uid, setUid] = useState<string | null>(null)
  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(u => setUid(u?.uid || null))
  }, [])

  return (
    <>
      <Header currentPage="proxy" />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <h1 className="text-2xl font-semibold text-white mb-1">Proxy Hub</h1>
        <p className="text-sm text-gray-400 mb-4">Klik op een site om details te openen. We proberen eerst direct te laden, daarna via onze proxy. Log in vereist; limiet 25 verzoeken/dag.</p>

        {!uid && (
          <div className="mb-4 p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-300" />
            <div className="text-xs text-gray-400">Account verplicht om te gebruiken. Ga naar Settings om in te loggen.</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {proxySites.map(site => (
            <Link key={site.id} href={`/proxy/site/${site.id}`} className="group p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 transition block">
              <div className="text-white font-medium truncate">{site.title}</div>
              <div className="text-[11px] text-gray-400 truncate">{site.directUrl}</div>
              <div className="mt-2 text-xs text-emerald-300 opacity-0 group-hover:opacity-100 transition">Bekijken →</div>
            </Link>
          ))}
        </div>

        {/* Blocking modal while proxy is WIP */}
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-xl">
            <div className="text-white text-lg font-semibold mb-2">Proxy binnenkort beschikbaar</div>
            <div className="text-sm text-gray-300 mb-4">We zijn bezig met de Proxy. Verwachte oplevering: 5 oktober. Excuses voor het ongemak.</div>
            <div className="text-xs text-gray-400 mb-4">Je kunt wel gebruik maken van andere onderdelen:</div>
            <div className="flex gap-2 justify-center">
              <Link href="/" className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-200 text-sm">Games</Link>
              <Link href="/movies" className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-200 text-sm">Movies</Link>
              <Link href="/pjotter-ai" className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-gray-200 text-sm">Pjotter‑AI</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

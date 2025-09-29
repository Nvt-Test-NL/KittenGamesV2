"use client"

import React, { useEffect, useMemo, useState } from "react"
import Header from "../../components/Header"
import { getFirebaseAuth } from "../../lib/firebase/client"
import { Lock } from "lucide-react"

const tiles = [
  { id: 'proxitok', label: 'TikTok via ProxiTok', url: 'https://proxitok.pabloferreiro.es' },
  { id: 'proxitok2', label: 'TikTok via ProxiTok (alt)', url: 'https://proxitok.r4fo.com' },
  { id: 'invidious', label: 'YouTube via Invidious', url: 'https://yewtu.be' },
  { id: 'piped', label: 'YouTube via Piped', url: 'https://piped.video' },
  { id: 'redlib', label: 'Reddit via Redlib', url: 'https://redlib.perennialte.ch' },
  { id: 'nitter', label: 'X via Nitter', url: 'https://nitter.net' },
  { id: 'wikiless', label: 'Wikipedia via Wikiless', url: 'https://wikiless.rawbit.ch' },
  { id: 'libremdb', label: 'IMDB via LibremDB', url: 'https://libremdb.iket.me' },
  { id: 'rimgo', label: 'Imgur via Rimgo', url: 'https://rimgo.pussthecat.org' },
  { id: 'breezewiki', label: 'Fandom via BreezeWiki', url: 'https://breezewiki.com' },
  { id: 'searxng', label: 'Metasearch via SearXNG', url: 'https://search.bus-hit.me' },
  { id: 'translate', label: 'Translate via SimplyTranslate', url: 'https://simplytranslate.org' },
]

function normalizeUrl(input: string): string | null {
  if (!input) return null
  let s = input.trim()
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { new URL(s); return s } catch { return null }
}

export default function ProxyHub() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [iframeSrc, setIframeSrc] = useState<string | null>(null)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(u => setUid(u?.uid || null))
  }, [])

  const go = async (target: string) => {
    const url = normalizeUrl(target)
    if (!url) { setError('Ongeldige URL'); return }
    if (!uid) { setError('Account verplicht. Log in om de proxy te gebruiken.'); return }
    setError(""); setLoading(true)
    try {
      // Route via our proxy API
      const prox = `/api/proxy?url=${encodeURIComponent(url)}&uid=${encodeURIComponent(uid)}`
      setIframeSrc(prox)
    } finally { setLoading(false) }
  }

  const openTile = (u: string) => go(u)

  return (
    <>
      <Header currentPage="proxy" />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <h1 className="text-2xl font-semibold text-white mb-3">Proxy Hub</h1>
        <p className="text-sm text-gray-400 mb-3">Probeer publieke pagina's te openen via onze proxy. Let op: logins/DRM kunnen niet werken; sommige sites laden beperkt. Gebruik op eigen risico.</p>

        <div className="mb-4 relative">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e)=>{ if (e.key==='Enter') go(input) }}
              placeholder="https://voorbeeld.com of zoekterm"
              className="flex-1 glass-input rounded-md px-3 py-2 text-sm"
            />
            <button onClick={()=>go(input)} className="px-4 py-2 rounded-md bg-emerald-600 text-white">Open</button>
          </div>
          {error && <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">{error}</div>}
          {!uid && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm rounded-lg border border-slate-800">
              <div className="text-center p-4">
                <Lock className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <div className="text-white font-medium">Account verplicht</div>
                <div className="text-xs text-gray-400">Log in via Settings om de proxy te gebruiken. Limiet: 25 verzoeken per dag per account.</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {tiles.map(t => (
            <button key={t.id} onClick={()=>openTile(t.url)} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-left hover:bg-slate-800/60 transition">
              <div className="text-white font-medium">{t.label}</div>
              <div className="text-xs text-gray-400 break-all">{t.url}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 relative" style={{minHeight:'60vh'}}>
          {!uid && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
              <div className="text-center p-4">
                <Lock className="w-7 h-7 mx-auto mb-2 text-gray-300" />
                <div className="text-white font-medium">Account verplicht</div>
                <div className="text-xs text-gray-400">Log in via Settings. Limiet: 25 verzoeken/dag.</div>
              </div>
            </div>
          )}
          {iframeSrc ? (
            <iframe src={iframeSrc} className="w-full h-[70vh]" sandbox="allow-scripts allow-same-origin allow-forms" />
          ) : (
            <div className="p-6 text-gray-400 text-sm">Kies een tegel of vul een URL in om te starten.</div>
          )}
        </div>
      </main>
    </>
  )
}

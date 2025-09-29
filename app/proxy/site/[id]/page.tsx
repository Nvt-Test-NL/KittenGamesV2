"use client"

import React, { useEffect, useMemo, useState } from "react"
import Header from "../../../components/Header"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { proxySites } from "../../../config/proxySites"
import { getFirebaseAuth } from "../../../lib/firebase/client"
import { ExternalLink, Lock } from "lucide-react"

function normalizeUrl(input: string): string | null {
  if (!input) return null
  let s = input.trim()
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try { new URL(s); return s } catch { return null }
}

export default function ProxySitePage() {
  const params = useParams() as { id: string }
  const site = useMemo(()=> proxySites.find(s => s.id === params.id), [params.id])
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [mode, setMode] = useState<'direct'|'proxy'>('direct')
  const [url, setUrl] = useState(site?.directUrl || '')
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const auth = getFirebaseAuth()
    return auth.onAuthStateChanged(u => setUid(u?.uid || null))
  }, [])

  useEffect(() => {
    if (!site) return
    setUrl(site.directUrl)
  }, [site])

  const buildSrc = (u: string) => {
    const n = normalizeUrl(u)
    if (!n) { setError('Ongeldige URL'); return }
    setError("")
    if (mode === 'direct') {
      setSrc(n)
    } else {
      if (!uid) { setError('Login vereist voor proxy'); return }
      setSrc(`/api/proxy?url=${encodeURIComponent(n)}&uid=${encodeURIComponent(uid)}`)
    }
  }

  useEffect(() => {
    if (!site) return
    buildSrc(site.directUrl)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, uid, site?.id])

  if (!site) {
    return (
      <>
        <Header currentPage="proxy" />
        <main className="container mx-auto px-4 pt-24 pb-10">
          <div className="text-gray-300">Niet gevonden.</div>
          <Link href="/proxy" className="text-emerald-400 text-sm">← Terug naar Proxy Hub</Link>
        </main>
      </>
    )
  }

  const croxyMain = 'https://www.croxyproxy.com/'
  const croxyServers = 'https://www.croxyproxy.com/servers'

  return (
    <>
      <Header currentPage="proxy" />
      <main className="container mx-auto px-4 pt-24 pb-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">{site.title}</h1>
            {site.description && <p className="text-sm text-gray-400">{site.description}</p>}
          </div>
          <Link href="/proxy" className="text-emerald-400 text-sm">← Proxy Hub</Link>
        </div>

        {!uid && (
          <div className="mb-3 p-3 rounded-lg border border-slate-800 bg-slate-900/60 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-300" />
            <div className="text-xs text-gray-400">Account verplicht voor proxy‑modus. Directe modus kan beperkt werken door blokkades.</div>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <div className="text-xs text-gray-400">Modus:</div>
          <button onClick={()=>setMode('direct')} className={`px-3 py-1.5 rounded-md border text-sm ${mode==='direct'?'bg-slate-800 border-emerald-400/30 text-white':'bg-slate-900/60 border-slate-700 text-gray-300'}`}>Direct</button>
          <button onClick={()=>setMode('proxy')} className={`px-3 py-1.5 rounded-md border text-sm ${mode==='proxy'?'bg-slate-800 border-emerald-400/30 text-white':'bg-slate-900/60 border-slate-700 text-gray-300'}`}>Via Proxy</button>
          <div className="ml-auto flex items-center gap-2">
            <Link href={site.directUrl} target="_blank" className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Open direct</Link>
            <Link href={croxyMain} target="_blank" className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> CroxyProxy</Link>
            <Link href={croxyServers} target="_blank" className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Croxy Servers</Link>
          </div>
        </div>

        <div className="mb-2 flex gap-2">
          <input value={url} onChange={(e)=>setUrl(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') buildSrc(url) }} placeholder="https://..." className="flex-1 glass-input rounded-md px-3 py-2 text-sm" />
          <button onClick={()=>buildSrc(url)} className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Open</button>
        </div>
        {error && <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">{error}</div>}

        {/* Mini display */}
        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60" style={{minHeight:'60vh'}}>
          {src ? (
            <iframe src={src} className="w-full h-[70vh]" sandbox="allow-scripts allow-same-origin allow-forms" />
          ) : (
            <div className="p-6 text-gray-400 text-sm">Geen bron.</div>
          )}
        </div>

        {/* Instances */}
        {site.instances && site.instances.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-400 mb-2">Alternatieve frontends/instances:</div>
            <div className="grid md:grid-cols-3 gap-2">
              {site.instances.map(i => (
                <button key={i.url} onClick={()=>{ setUrl(i.url); buildSrc(i.url) }} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-left hover:bg-slate-800/60">
                  <div className="text-white text-sm">{i.label}</div>
                  <div className="text-[11px] text-gray-400 break-all">{i.url}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

"use client"

import { useState, useCallback } from "react"
import GameGrid from "../components/GameGrid"
import Header from "../components/Header"
import BackToTop from "../components/BackToTop"
import OneTimePopup from '../components/OneTimePopup';
import { launchGame } from "../components/GameLaunchSettingsPanel"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [aiAsk, setAiAsk] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<Array<{ name: string; type: string; url: string }>>([])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleGameSelect = useCallback((slug: string, url: string | null) => {
    // This handler is now only used for games with newtab: true
    if (url) {
      launchGame(url)
    }
  }, [])

  const handleAiAsk = useCallback(async () => {
    const q = aiAsk.trim()
    if (!q) return
    try {
      setAiLoading(true)
      setAiResults([])
      const res = await fetch('/api/ai/games/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      const data = await res.json().catch(()=>({ items: [] }))
      const items: Array<{ name: string; type: string; image?: string; url: string }> = Array.isArray(data?.items) ? data.items : []
      setAiResults(items.slice(0,5).map(x=>({ name: x.name, type: x.type, url: x.url })))
      if (items.length) {
        // Open best match in-site via /play
        const enc = encodeURIComponent(q.toLowerCase().replace(/\s+/g,'-'))
        // The /play route expects a rot13 encoded slug built from name; we fallback by opening URL directly if needed.
        // For reliability, open URL directly here, and let user click /play by cards.
        window.open(items[0].url, '_blank', 'noopener')
      }
    } finally {
      setAiLoading(false)
    }
  }, [aiAsk])

  return (
    <>
      <Header 
        currentPage="games"
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
      />
      <main className="container mx-auto px-4 pt-24 pb-8"> {/* Ensure consistent top padding */}
        {/* Ask Pjotter-AI for a game */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-3 items-center">
          <div className="text-sm text-gray-300 md:w-48">Ask Pjotter‑AI</div>
          <input
            type="text"
            value={aiAsk}
            onChange={(e)=>setAiAsk(e.target.value)}
            placeholder="bijv. een race game zonder schieten"
            className="flex-1 glass-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
          />
          <button onClick={handleAiAsk} disabled={aiLoading} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white">
            {aiLoading ? 'Zoeken…' : 'Zoek & Open'}
          </button>
        </div>
        {aiResults.length > 0 && (
          <div className="mb-6 text-sm text-gray-300">
            Aanbevolen:
            <ul className="mt-2 list-disc list-inside space-y-1">
              {aiResults.map((g, i)=>(
                <li key={`aires-${i}`}><a href={g.url} target="_blank" rel="noopener" className="text-emerald-300 hover:text-emerald-200 underline">{g.name}</a> <span className="text-gray-500">— {g.type}</span></li>
              ))}
            </ul>
          </div>
        )}
        <GameGrid 
          onGameSelect={handleGameSelect} 
          selectedCategory={selectedCategory} 
          searchQuery={searchQuery} 
        />
      </main>
    </>
  );
}
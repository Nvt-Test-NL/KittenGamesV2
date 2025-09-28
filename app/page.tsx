"use client"

import { useState, useCallback, useMemo } from "react"
import GameGrid from "../components/GameGrid"
import Header from "../components/Header"
import BackToTop from "../components/BackToTop"
import OneTimePopup from '../components/OneTimePopup';
import { launchGame } from "../components/GameLaunchSettingsPanel"
import GameCard from "../components/GameGrid/GameCard"
import type { ProcessedGame } from "../utils/gamesApi"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [aiAsk, setAiAsk] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<Array<{ name: string; type: string; url: string; image?: string }>>([])

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
      setAiResults(items.slice(0,8))
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

  const aiResultGames: ProcessedGame[] = useMemo(() => {
    return aiResults.map((g) => ({
      name: g.name,
      type: g.type,
      image: g.image || `https://via.placeholder.com/300x300/2d3748/e2e8f0?text=${encodeURIComponent(g.name)}`,
      url: g.url,
    }))
  }, [aiResults])

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
        {aiResultGames.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">AI Aanbevolen</h3>
              <span className="text-xs text-gray-400">Klik op een kaart om te spelen</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {aiResultGames.map((game, idx) => (
                <GameCard key={`aires-${idx}-${game.name}`} game={game} />
              ))}
            </div>
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
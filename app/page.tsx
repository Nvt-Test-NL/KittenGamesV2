"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import GameGrid from "../components/GameGrid"
import Header from "../components/Header"
import BackToTop from "../components/BackToTop"
import OneTimePopup from '../components/OneTimePopup';
import { launchGame } from "../components/GameLaunchSettingsPanel"
import GameCard from "../components/GameGrid/GameCard"
import type { ProcessedGame } from "../utils/gamesApi"
import { getHistory, onHistoryChanged, type WatchProgress } from "../utils/history"
import { getFavorites, onFavoritesChanged, type FavItem } from "../utils/favorites"

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [aiAsk, setAiAsk] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<Array<{ name: string; type: string; url: string; image?: string }>>([])
  const UNLOCK_KEY = "ck_credit_unlocked_v1"
  const [unlocked, setUnlocked] = useState<boolean>(false)
  // AI Game Matchmaker
  const [moodPrompt, setMoodPrompt] = useState("")
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchResults, setMatchResults] = useState<Array<{ name: string; type: string; url: string; image?: string }>>([])
  // Smart Game Sessions
  const [sessionDuration, setSessionDuration] = useState<string>("10")
  const [sessionDifficulty, setSessionDifficulty] = useState<string>("easy")
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionResults, setSessionResults] = useState<Array<{ name: string; type: string; url: string; image?: string }>>([])
  // Quest Hub (MVP)
  type Quest = { id: string; title: string; type: 'daily'|'weekly'; xp: number; done: boolean }
  const [quests, setQuests] = useState<Quest[]>([])
  const [xp, setXp] = useState<number>(0)
  const [histNow, setHistNow] = useState<WatchProgress[]>([])
  const [favsNow, setFavsNow] = useState<FavItem[]>([])

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
    if (!unlocked) return
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

  const matchResultGames: ProcessedGame[] = useMemo(() => {
    return matchResults.map((g) => ({
      name: g.name,
      type: g.type,
      image: g.image || `https://via.placeholder.com/300x300/2d3748/e2e8f0?text=${encodeURIComponent(g.name)}`,
      url: g.url,
    }))
  }, [matchResults])

  const sessionResultGames: ProcessedGame[] = useMemo(() => {
    return sessionResults.map((g) => ({
      name: g.name,
      type: g.type,
      image: g.image || `https://via.placeholder.com/300x300/2d3748/e2e8f0?text=${encodeURIComponent(g.name)}`,
      url: g.url,
    }))
  }, [sessionResults])

  // Load unlock flag
  useEffect(() => {
    try { setUnlocked(localStorage.getItem(UNLOCK_KEY) === 'true') } catch {}
  }, [])

  // Load quests/xp from localStorage
  useEffect(() => {
    try {
      const q = JSON.parse(localStorage.getItem('kg_quests_v1') || 'null')
      const x = JSON.parse(localStorage.getItem('kg_xp_v1') || 'null')
      if (Array.isArray(q)) setQuests(q)
      else {
        // seed defaults
        setQuests([
          { id: 'd1', title: 'Speel 1 game', type: 'daily', xp: 10, done: false },
          { id: 'd2', title: 'Speel 10 minuten', type: 'daily', xp: 15, done: false },
          { id: 'w1', title: 'Voeg 3 favorieten toe', type: 'weekly', xp: 40, done: false },
        ])
      }
      if (typeof x === 'number') setXp(x)
    } catch {}
  }, [])

  // Live datasets for quest completion
  useEffect(() => {
    const updateHist = () => setHistNow(getHistory())
    const updateFavs = () => setFavsNow(getFavorites())
    updateHist(); updateFavs()
    const offH = onHistoryChanged(updateHist)
    const offF = onFavoritesChanged(updateFavs)
    return () => { offH && offH(); offF && offF() }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('kg_quests_v1', JSON.stringify(quests)) } catch {}
  }, [quests])
  useEffect(() => {
    try { localStorage.setItem('kg_xp_v1', JSON.stringify(xp)) } catch {}
  }, [xp])

  const isQuestCompleted = useCallback((q: Quest): boolean => {
    if (q.id === 'd1') {
      // Played at least one game/movie/series
      return histNow.length > 0
    }
    if (q.id === 'd2') {
      // Played/watched for 10 minutes (>= 600s) in any entry
      return histNow.some(h => (h.lastPositionSec ?? 0) >= 600)
    }
    if (q.id === 'w1') {
      // Added 3 favorites
      return favsNow.length >= 3
    }
    return false
  }, [histNow, favsNow])

  const claimQuest = useCallback((id: string) => {
    const q = quests.find(x => x.id === id)
    if (!q) return
    if (!isQuestCompleted(q) || q.done) return
    setQuests((prev) => prev.map(item => item.id === id ? { ...item, done: true } : item))
    setXp((v)=>v + q.xp)
  }, [quests, isQuestCompleted])

  // Effective selected category: when locked, prevent 'All'
  const effectiveSelectedCategory = useMemo(() => {
    if (unlocked) return selectedCategory
    return selectedCategory === 'All' ? 'puzzle' : selectedCategory
  }, [unlocked, selectedCategory])

  return (
    <>
      <Header 
        currentPage="games"
        onCategoryChange={handleCategoryChange}
        onSearch={handleSearch}
      />
      <main className="container mx-auto px-4 pt-24 pb-8"> {/* Ensure consistent top padding */}
        {!unlocked && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm">Om <strong>All games</strong> en <strong>Pjotter‑AI</strong> te gebruiken, kijk eerst de <strong>CodingKitten credit video</strong>.</span>
              <a href="/codingkitten" className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Ga naar CodingKitten</a>
            </div>
          </div>
        )}
        {/* Ask Pjotter-AI for a game */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-3 items-center">
          <div className="text-sm text-gray-300 md:w-48">Ask Pjotter‑AI</div>
          <input
            type="text"
            value={aiAsk}
            onChange={(e)=>setAiAsk(e.target.value)}
            placeholder="bijv. een race game zonder schieten"
            className={`flex-1 glass-input rounded-md px-3 py-2 text-sm focus:outline-none ${unlocked ? 'focus:border-emerald-400' : 'opacity-60'}`}
            disabled={!unlocked}
          />
          <button onClick={handleAiAsk} disabled={aiLoading || !unlocked} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white">
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

        {/* AI Game Matchmaker */}
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-white font-semibold">AI Game Matchmaker</div>
            <input
              value={moodPrompt}
              onChange={(e)=>setMoodPrompt(e.target.value)}
              placeholder="bv. 5 cozy games met korte sessies"
              className={`flex-1 glass-input rounded-md px-3 py-2 text-sm focus:outline-none ${unlocked ? 'focus:border-emerald-400' : 'opacity-60'}`}
              disabled={!unlocked}
            />
            <button
              disabled={matchLoading || !moodPrompt.trim() || !unlocked}
              onClick={async ()=>{
                try {
                  setMatchLoading(true)
                  setMatchResults([])
                  const res = await fetch('/api/ai/games/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: moodPrompt }) })
                  const data = await res.json().catch(()=>({ items: [] }))
                  const items: Array<{ name: string; type: string; image?: string; url: string }> = Array.isArray(data?.items) ? data.items : []
                  setMatchResults(items.slice(0,8))
                } finally { setMatchLoading(false) }
              }}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
            >{matchLoading ? 'Zoeken…' : 'Vind games'}</button>
          </div>
          {matchResultGames.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {matchResultGames.map((game, idx) => (
                <GameCard key={`match-${idx}-${game.name}`} game={game} />
              ))}
            </div>
          )}
        </div>

        {/* Smart Game Sessions */}
        <div className="mb-10 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="text-white font-semibold">Smart Game Sessions</div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="text-gray-400">Duur</label>
              <select value={sessionDuration} onChange={(e)=>setSessionDuration(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" disabled={!unlocked}>
                <option value="10">10 min</option>
                <option value="20">20 min</option>
                <option value="45">45 min</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <label className="text-gray-400">Moeilijkheid</label>
              <select value={sessionDifficulty} onChange={(e)=>setSessionDifficulty(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" disabled={!unlocked}>
                <option value="easy">Makkelijk</option>
                <option value="medium">Gemiddeld</option>
                <option value="hard">Moeilijk</option>
              </select>
            </div>
            <button
              disabled={sessionLoading || !unlocked}
              onClick={async ()=>{
                try {
                  setSessionLoading(true)
                  setSessionResults([])
                  const prompt = `Geef games uit mijn bibliotheek die passen bij een sessie van ${sessionDuration} minuten en een ${sessionDifficulty} moeilijkheid. Variatie oké, korte uitleg niet nodig.`
                  const res = await fetch('/api/ai/games/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: prompt }) })
                  const data = await res.json().catch(()=>({ items: [] }))
                  const items: Array<{ name: string; type: string; image?: string; url: string }> = Array.isArray(data?.items) ? data.items : []
                  setSessionResults(items.slice(0,8))
                } finally { setSessionLoading(false) }
              }}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
            >{sessionLoading ? 'Zoeken…' : 'Stel sessie voor'}</button>
          </div>
          {sessionResultGames.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {sessionResultGames.map((game, idx) => (
                <GameCard key={`sess-${idx}-${game.name}`} game={game} />
              ))}
            </div>
          )}
        </div>

        {/* Quest Hub (MVP) */}
        <section className="mb-8 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Quest Hub</h2>
            <div className="text-sm text-emerald-300">XP: <span className="font-semibold">{xp}</span></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {quests.map((q) => {
              const completed = isQuestCompleted(q)
              return (
              <div key={q.id} className={`flex items-center justify-between p-3 rounded-lg border ${q.type==='daily' ? 'border-cyan-400/20 bg-cyan-500/5' : 'border-emerald-400/20 bg-emerald-500/5'}`}>
                <div className="text-sm text-gray-100">
                  <div className="font-medium">{q.title}</div>
                  <div className="text-xs text-gray-400 capitalize">{q.type} • {q.xp} XP {(!q.done && !completed) ? '• niet voltooid' : ''}</div>
                </div>
                <button
                  disabled={q.done || !completed}
                  onClick={()=>claimQuest(q.id)}
                  className={`px-3 py-1.5 rounded-md text-sm border ${q.done ? 'opacity-60 cursor-not-allowed bg-slate-800 border-slate-700 text-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/40'}`}
                >{q.done ? 'Geclaimd' : (completed ? 'Claim' : 'Nog niet')}</button>
              </div>
            )})}
          </div>
          <div className="mt-2 text-xs text-gray-400">Opslag: lokaal. Bij login kan dit naar Firestore gesynchroniseerd worden.</div>
        </section>

        <GameGrid 
          onGameSelect={handleGameSelect} 
          selectedCategory={effectiveSelectedCategory} 
          searchQuery={searchQuery} 
        />
      </main>
    </>
  );
}
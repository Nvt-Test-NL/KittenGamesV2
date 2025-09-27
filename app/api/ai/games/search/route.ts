import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// AI-assisted game search. If OPENROUTER_API_KEY is present, we first
// ask the LLM to extract keywords and categories from the query.
// Then we filter the local library and return top matches.
// Fallback: pure keyword search without LLM.

const LIB_DIR = path.join(process.cwd(), 'KittenGames-gamelibrary-main')
const GAMES_JSON = path.join(LIB_DIR, 'games.json')

async function readGames() {
  const raw = await fs.readFile(GAMES_JSON, 'utf-8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) return []
  return data as Array<{ name: string; type: string; image: string; url: string; added?: string; newtab?: boolean | string }>
}

function simpleFilter(games: any[], query: string, hints?: { keywords?: string[], categories?: string[] }) {
  const q = query.toLowerCase()
  const kws = new Set((hints?.keywords || []).map(x => x.toLowerCase()))
  const cats = new Set((hints?.categories || []).map(x => x.toLowerCase()))

  const score = (g: any) => {
    let s = 0
    const name = (g.name || '').toLowerCase()
    const type = (g.type || '').toLowerCase()
    if (name.includes('car') || name.includes('auto')) s += 3
    if (type.includes('racing')) s += 4
    if (name.includes(q)) s += 2
    if (type.includes(q)) s += 2
    for (const k of kws) if (k && (name.includes(k) || type.includes(k))) s += 2
    for (const c of cats) if (c && type.includes(c)) s += 3
    return s
  }

  return games
    .map(g => ({ g, s: score(g) }))
    .filter(x => x.s > 0 || q.length >= 2)
    .sort((a,b) => b.s - a.s)
    .slice(0, 10)
    .map(x => x.g)
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json().catch(() => ({ query: '' }))
    if (!query || typeof query !== 'string') return NextResponse.json({ items: [] })

    const games = await readGames()

    const apiKey = process.env.OPENROUTER_API_KEY
    let hints: { keywords?: string[]; categories?: string[] } | undefined

    if (apiKey) {
      try {
        const sys = `Extract keywords and broad categories from a game request. Output ONLY JSON:\n{"keywords": string[], "categories": string[]}`
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost',
            'X-Title': 'KittenMovies',
          },
          body: JSON.stringify({
            model: 'x-ai/grok-4-fast:free',
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: query }
            ],
            max_tokens: 200,
            temperature: 0.2,
          })
        })
        if (res.ok) {
          const data = await res.json()
          const content: string = data.choices?.[0]?.message?.content || '{}'
          try { hints = JSON.parse(content) } catch { hints = undefined }
        }
      } catch {}
    }

    const results = simpleFilter(games, query, hints)
    return NextResponse.json({
      items: results.map(g => ({ name: g.name, type: g.type, image: g.image, url: g.url }))
    })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 200 })
  }
}

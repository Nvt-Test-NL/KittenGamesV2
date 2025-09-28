import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

// AI-assisted game search.
// If OPENROUTER_API_KEY is present, we pass a compact version of the local games.json
// as context to the model and ask it to choose the best matches ONLY from that list.
// We then map chosen names back to full game objects.
// Fallback: a deterministic local keyword filter when no key or model error.

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
  const kwsArr = Array.from(kws)
  const catsArr = Array.from(cats)

  const score = (g: any) => {
    let s = 0
    const name = (g.name || '').toLowerCase()
    const type = (g.type || '').toLowerCase()
    if (name.includes('car') || name.includes('auto')) s += 3
    if (type.includes('racing')) s += 4
    if (name.includes(q)) s += 2
    if (type.includes(q)) s += 2
    for (let i = 0; i < kwsArr.length; i++) {
      const k = kwsArr[i]
      if (k && (name.includes(k) || type.includes(k))) s += 2
    }
    for (let j = 0; j < catsArr.length; j++) {
      const c = catsArr[j]
      if (c && type.includes(c)) s += 3
    }
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

    if (apiKey) {
      try {
        // Build a compact library listing to reduce token usage
        // Use only name and type for ranking; we will map back to image/url afterwards.
        const compact = games.map(g => ({ name: g.name, type: g.type }))
        // If extremely large, truncate to a safe upper bound
        const MAX_ITEMS = 1200
        const lib = compact.slice(0, MAX_ITEMS)

        const sys = `You are a recommender that ONLY selects games from the provided library. Output strictly JSON with this schema:\n{"items": [{"name": string, "reason"?: string}]}\nRules:\n- Choose 5-8 items that best match the user's request.\n- Use only names that appear EXACTLY in the library.\n- Prefer diversity but keep relevance high.\n- Keep "reason" short (<= 10 words).`

        const user = `User request: ${query}\nLibrary (name, type) JSON array:\n${JSON.stringify(lib)}`

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost',
            'X-Title': 'KittenGames',
          },
          body: JSON.stringify({
            model: 'x-ai/grok-4-fast:free',
            messages: [
              { role: 'system', content: sys },
              { role: 'user', content: user },
            ],
            temperature: 0.5,
            max_tokens: 400,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          const content: string = data.choices?.[0]?.message?.content || '{}'
          let picked: { items?: Array<{ name: string; reason?: string }> } = {}
          try { picked = JSON.parse(content) } catch {}
          const names = Array.isArray(picked.items) ? picked.items.map(x => x?.name).filter(Boolean) as string[] : []
          if (names.length) {
            // Map chosen names back to full records from original games array
            const byName = new Map<string, any>()
            for (const g of games) byName.set(g.name, g)
            const chosen = names
              .map(n => byName.get(n))
              .filter(Boolean)
              .slice(0, 8)
            if (chosen.length) {
              return NextResponse.json({
                items: chosen.map(g => ({ name: g.name, type: g.type, image: g.image, url: g.url }))
              })
            }
          }
        }
        // fallthrough to local filter if model returns nothing useful
      } catch {
        // fallthrough
      }
    }

    // No API key or model failed: local keyword filter as fallback
    const results = simpleFilter(games, query)
    return NextResponse.json({ items: results.map(g => ({ name: g.name, type: g.type, image: g.image, url: g.url })) })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: String(e) }, { status: 200 })
  }
}

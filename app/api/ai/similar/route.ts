import { NextRequest, NextResponse } from 'next/server'

// Similar recommendations (movies + TV) using OpenRouter free model
// POST body: {
//   target: { tmdbId: number, type: 'movie' | 'tv' },
//   favorites?: Array<{ tmdbId: number, type: 'movie'|'tv' }>,
//   history?: Array<{ tmdbId: number, type: 'movie'|'tv', finished?: boolean }>
// }
// Returns: { ids: Array<{ tmdbId: number, type: 'movie'|'tv', reason?: string }> }

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  const { target, favorites = [], history = [] } = await req.json().catch(() => ({ target: null, favorites: [], history: [] }))

  if (!apiKey) return NextResponse.json({ ids: [] })
  if (!target || typeof target.tmdbId !== 'number' || !['movie','tv'].includes(target.type)) {
    return NextResponse.json({ ids: [] })
  }

  const favs = Array.isArray(favorites) ? favorites.slice(0, 30) : []
  const recent = Array.isArray(history) ? history.slice(0, 30) : []

  const sys = `You are a recommendation assistant for films and TV shows. Output ONLY JSON with this schema:
{"ids": [{"tmdbId": number, "type": "movie"|"tv", "reason"?: string}]}
Rules:
- Return up to 5 items, ordered best match first.
- Use TMDB IDs only and correct type.
- Mix movies and shows as appropriate for the user.
- Prefer items similar to the target, but diversify slightly.
- Consider user's favorites and finished items as strong signals.
- Provide a short reason (max 10 words) for each.`

  const user = `Target: ${JSON.stringify(target)}\nFavorites: ${JSON.stringify(favs)}\nHistory (latest first): ${JSON.stringify(recent)}`

  try {
    const res = await fetch(OPENROUTER_URL, {
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
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        max_tokens: 300,
      })
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ ids: [], error: text }, { status: 200 })
    }

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content || '{}'
    let parsed: any
    try { parsed = JSON.parse(content) } catch { parsed = { ids: [] } }
    const ids = Array.isArray(parsed.ids) ? parsed.ids.slice(0, 5) : []
    const normalized = ids.map((x: any) => ({
      tmdbId: Number(x?.tmdbId),
      type: x?.type === 'tv' ? 'tv' : 'movie',
      reason: typeof x?.reason === 'string' ? x.reason : undefined,
    })).filter((x: any) => Number.isFinite(x.tmdbId))

    return NextResponse.json({ ids: normalized })
  } catch (e: any) {
    return NextResponse.json({ ids: [], error: String(e) }, { status: 200 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Generate up to 6 smart tags for a movie or TV show via OpenRouter (free model)
// POST body: { title: string, overview?: string, genres?: string[] }
// Returns: { tags: string[] }

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return NextResponse.json({ tags: [] })
  const { title, overview = '', genres = [] } = await req.json().catch(()=>({ title: '' }))
  if (!title || typeof title !== 'string') return NextResponse.json({ tags: [] })

  const sys = `You output ONLY JSON as {"tags": [string, ...]} with 3-6 concise content tags for discovery.
Rules:
- Lowercase words/phrases, 1-3 words each.
- No spoilers. No duplicates. No hashtags.
- Prefer genre, tone, theme, pacing, audience, vibe.`

  const user = `Item:\nTitle: ${title}\nGenres: ${Array.isArray(genres)?genres.join(', '):''}\nOverview: ${overview?.slice(0, 800)}`

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
        max_tokens: 200,
      })
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ tags: [], error: text }, { status: 200 })
    }

    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content || '{}'
    let parsed: any
    try { parsed = JSON.parse(content) } catch { parsed = { tags: [] } }
    let tags: string[] = Array.isArray(parsed.tags) ? parsed.tags : []
    tags = tags.map((t: any)=> String(t||'').toLowerCase().trim()).filter((t: string)=> t.length>0)
    // Limit to 6 unique
    const seen = new Set<string>()
    const unique: string[] = []
    for (const t of tags) { if (!seen.has(t)) { seen.add(t); unique.push(t) } if (unique.length>=6) break }
    return NextResponse.json({ tags: unique })
  } catch (e:any) {
    return NextResponse.json({ tags: [], error: String(e) }, { status: 200 })
  }
}

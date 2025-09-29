import { NextRequest, NextResponse } from "next/server"

// Simple, free-friendly reverse proxy for public pages.
// - Validates target host against ALLOWLIST
// - Strips cookies/auth headers
// - Blocks known risky domains (payments/streaming)
// - No login/DRM guarantees; best-effort only

const ALLOWLIST: string[] = [
  // Privacy frontends and public instances (can change over time)
  'proxitok.pabloferreiro.es',
  'proxitok.r4fo.com',
  'yewtu.be',
  'piped.video',
  'redlib.perennialte.ch',
  'nitter.net',
  'wikiless.rawbit.ch',
  'libremdb.iket.me',
  'rimgo.pussthecat.org',
  'breezewiki.com',
  'search.bus-hit.me',
  'simplytranslate.org',
  // Generic safe-ish domains you might want to try
  'wikipedia.org',
  'en.wikipedia.org',
  'nl.wikipedia.org',
]

const DENYLIST: string[] = [
  // Payments / streaming / login-heavy
  'netflix.com','disneyplus.com','primevideo.com','hulu.com','spotify.com',
  'paypal.com','stripe.com','adyen.com','mollie.com','bunq.com','rabobank.nl',
  // School portals (example placeholders) — extend as needed
]

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (DENYLIST.some(d => h === d || h.endsWith('.' + d))) return false
  if (ALLOWLIST.some(a => h === a || h.endsWith('.' + a))) return true
  return false
}

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailers','transfer-encoding','upgrade',
  'set-cookie','cookie','authorization','alt-svc','report-to','nel','content-security-policy','content-security-policy-report-only'
])

// Simple in-memory rate limit per uid per day (best-effort; instances may reset)
const LIMIT_PER_DAY = 25
const usageMap: Map<string, { day: string, count: number }> = new Map()

function checkAndInc(uid: string): { allowed: boolean, remaining: number } {
  const day = new Date().toISOString().slice(0,10)
  const key = uid
  const cur = usageMap.get(key)
  if (!cur || cur.day !== day) {
    usageMap.set(key, { day, count: 0 })
  }
  const entry = usageMap.get(key)!
  if (entry.count >= LIMIT_PER_DAY) {
    return { allowed: false, remaining: 0 }
  }
  entry.count += 1
  return { allowed: true, remaining: Math.max(0, LIMIT_PER_DAY - entry.count) }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'Auth required', message: 'Login required to use proxy' }, { status: 401 })
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

  // Rate limit per uid per day
  const rl = checkAndInc(uid)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded', message: '25 requests per day per account' }, { status: 429 })
  }

  let target: URL
  try { target = new URL(url) } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }
  if (!/^https?:$/i.test(target.protocol)) return NextResponse.json({ error: 'Only http/https' }, { status: 400 })

  if (!hostAllowed(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed', host: target.hostname }, { status: 403 })
  }

  // Build request to upstream
  const headers: Record<string,string> = {}
  // Pass minimal headers to avoid CORS/auth leakage
  const accept = req.headers.get('accept'); if (accept) headers['accept'] = accept
  headers['user-agent'] = 'KittenGames-Proxy/1.0'
  headers['accept-language'] = req.headers.get('accept-language') || 'nl,en;q=0.8'
  // Never forward cookies/authorization

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
  } catch (e:any) {
    clearTimeout(timeout)
    return NextResponse.json({ error: 'Upstream fetch failed', host: target.hostname, message: String(e?.message||e) }, { status: 502 })
  }
  clearTimeout(timeout)

  // Copy body stream and filter headers
  const resHeaders = new Headers()
  upstream.headers.forEach((v, k) => {
    if (HOP_BY_HOP.has(k.toLowerCase())) return
    // Soften CSP to allow iframe render; many sites will still not work fully
    if (k.toLowerCase() === 'x-frame-options') return
    if (k.toLowerCase() === 'frame-ancestors') return
    resHeaders.set(k, v)
  })
  // Set our own cache to avoid costs if the upstream allows
  if (!resHeaders.has('cache-control')) {
    resHeaders.set('cache-control', 'public, max-age=60, s-maxage=300')
  }
  resHeaders.set('access-control-allow-origin', '*')

  // Return streamed response
  const resp = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  })
  resp.headers.set('x-rate-limit-remaining', String(rl.remaining))
  return resp
}

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

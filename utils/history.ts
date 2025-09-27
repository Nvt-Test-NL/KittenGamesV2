// Client-side helpers for watch history and watchlist
// Use only in "use client" components

export type WatchItemType = 'movie' | 'tv'

export interface WatchProgress {
  tmdbId: number
  type: WatchItemType
  lastPositionSec: number
  durationSec?: number
  startedAt: number // epoch ms
  updatedAt: number // epoch ms
  finished?: boolean
}

const HISTORY_KEY = 'kg_watch_history_v1'
const WATCHLIST_KEY = 'kg_watchlist_v1'

export function getHistory(): WatchProgress[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as WatchProgress[]) : []
  } catch {
    return []
  }
}

export function saveHistory(items: WatchProgress[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 200)))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kg_history_changed'))
  }
}

export function upsertProgress(p: Omit<WatchProgress, 'startedAt' | 'updatedAt'>) {
  const items = getHistory()
  const idx = items.findIndex(x => x.tmdbId === p.tmdbId && x.type === p.type)
  const now = Date.now()
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...p, updatedAt: now }
  } else {
    items.unshift({ ...p, startedAt: now, updatedAt: now })
  }
  saveHistory(items)
}

export function markFinished(tmdbId: number, type: WatchItemType) {
  const items = getHistory()
  const idx = items.findIndex(x => x.tmdbId === tmdbId && x.type === type)
  if (idx >= 0) {
    items[idx].finished = true
    items[idx].updatedAt = Date.now()
    saveHistory(items)
  }
}

export function onHistoryChanged(handler: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('kg_history_changed', handler)
  return () => window.removeEventListener('kg_history_changed', handler)
}

export interface WatchlistEntry { tmdbId: number; type: WatchItemType; addedAt: number }

export function getWatchlist(): WatchlistEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY)
    return raw ? (JSON.parse(raw) as WatchlistEntry[]) : []
  } catch {
    return []
  }
}

export function setWatchlist(list: WatchlistEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list.slice(0, 500)))
}

export function addToWatchlist(tmdbId: number, type: WatchItemType) {
  const list = getWatchlist()
  if (!list.find(x => x.tmdbId === tmdbId && x.type === type)) {
    list.unshift({ tmdbId, type, addedAt: Date.now() })
    setWatchlist(list)
  }
}

export function removeFromWatchlist(tmdbId: number, type: WatchItemType) {
  const list = getWatchlist().filter(x => !(x.tmdbId === tmdbId && x.type === type))
  setWatchlist(list)
}

export function isInWatchlist(tmdbId: number, type: WatchItemType) {
  return getWatchlist().some(x => x.tmdbId === tmdbId && x.type === type)
}

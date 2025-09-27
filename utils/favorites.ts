export type FavItem = { tmdbId: number; type: 'movie' | 'tv' };

const KEY = 'kg_favorites_v1';

export function getFavorites(): FavItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorite(tmdbId: number, type: 'movie' | 'tv'): boolean {
  const favs = getFavorites();
  return favs.some(f => f.tmdbId === tmdbId && f.type === type);
}

export function addFavorite(tmdbId: number, type: 'movie' | 'tv') {
  const favs = getFavorites();
  if (favs.some(f => f.tmdbId === tmdbId && f.type === type)) return;
  const next = [{ tmdbId, type }, ...favs].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kg_favorites_changed'));
  }
}

export function removeFavorite(tmdbId: number, type: 'movie' | 'tv') {
  const favs = getFavorites();
  const next = favs.filter(f => !(f.tmdbId === tmdbId && f.type === type));
  localStorage.setItem(KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kg_favorites_changed'));
  }
}

export function onFavoritesChanged(handler: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('kg_favorites_changed', handler);
  return () => window.removeEventListener('kg_favorites_changed', handler);
}

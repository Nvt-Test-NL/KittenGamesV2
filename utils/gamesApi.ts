// Source JSON now uses this shape coming from /api/games/list
export interface Game {
  name: string
  type: string
  image: string
  url: string
  added?: string
  newtab?: boolean | string
}

export interface ProcessedGame extends Game {
  image: string
  url: string
}

// Cache for games data to avoid repeated API calls
let gamesCache: Game[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Base URLs for game content
// Use server proxy which reads from KittenGames-gamelibrary-main
const PRIMARY_GAMES_JSON_URL = "/api/games/list"

// Demo fallback (committed to repo) used when primary is missing (404)
const DEMO_GAMES_JSON_URL = "/demo-gf/games.json"

/**
 * Process raw game data to add computed properties
 */
function processGame(game: Game): ProcessedGame {
  return {
    ...game,
    image: game.image,
    url: game.url,
  }
}

/**
 * Fetch all games from the JSON file
 */
export async function fetchGames(forceRefresh = false): Promise<ProcessedGame[]> {
  const now = Date.now()
  
  // Return cached data if it's still fresh and not forcing refresh
  if (!forceRefresh && gamesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return gamesCache.map(g => processGame(g))
  }

  try {
    // Try primary location first
    let response = await fetch(PRIMARY_GAMES_JSON_URL)
    if (!response.ok) {
      if (response.status === 404) {
        // Fallback to demo data committed in repo so production builds have content
        const demoResponse = await fetch(DEMO_GAMES_JSON_URL)
        if (!demoResponse.ok) {
          throw new Error(`Failed to fetch games: primary 404; demo ${demoResponse.status} ${demoResponse.statusText}`)
        }
        const demoData: any[] = await demoResponse.json()
        // map demo format to Game if needed
        const normalized: Game[] = demoData.map((d: any) => ({
          name: d.name,
          type: d.type,
          image: d.thumbnail || d.image,
          url: d.url || `${DEMO_GAMES_JSON_URL.replace('/games.json','')}/${d.path}/index.html`,
          added: d.added,
        }))
        gamesCache = normalized
        cacheTimestamp = now
        return normalized.map(g => processGame(g))
      }
      throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`)
    }

    const data: Game[] = await response.json()

    // Update cache
    gamesCache = data
    cacheTimestamp = now

    return data.map(g => processGame(g))
  } catch (error) {
    console.error('Error fetching games:', error)
    
    // Return cached data if available, even if stale
    if (gamesCache) {
      console.warn('Using stale cached data due to fetch error')
      return gamesCache.map(g => processGame(g))
    }
    
    throw error
  }
}

/**
 * Find a specific game by its path/slug
 */
export async function findGameBySlug(slug: string): Promise<ProcessedGame | null> {
  try {
    const games = await fetchGames()
    const norm = slug.toLowerCase()
    const nameSlug = (s: string) => s.toLowerCase().replace(/\s+/g, "-")
    const game = games.find(g => nameSlug(g.name) === norm || g.url.toLowerCase().includes(norm)) || null
    return game
  } catch (error) {
    console.error('Error finding game by slug:', error)
    return null
  }
}

/**
 * Get games by category
 */
export async function getGamesByCategory(category: string): Promise<ProcessedGame[]> {
  try {
    const games = await fetchGames()
    
    if (category.toLowerCase() === 'all') {
      return games
    }
    
    return games.filter(game => 
      game.type.toLowerCase() === category.toLowerCase()
    )
  } catch (error) {
    console.error('Error getting games by category:', error)
    return []
  }
}

/**
 * Search games by name
 */
export async function searchGames(query: string): Promise<ProcessedGame[]> {
  try {
    const games = await fetchGames()
    const searchTerm = query.toLowerCase().trim()
    
    if (!searchTerm) {
      return games
    }
    
    return games.filter(game =>
      game.name.toLowerCase().includes(searchTerm) ||
      game.type.toLowerCase().includes(searchTerm)
    )
  } catch (error) {
    console.error('Error searching games:', error)
    return []
  }
}

/**
 * Get recently added games
 */
export async function getRecentGames(limit = 10): Promise<ProcessedGame[]> {
  try {
    const games = await fetchGames()
    
    // Sort by added date (newest first) and take the limit
    return games
      .slice()
      .sort((a, b) => (new Date(b.added || 0).getTime()) - (new Date(a.added || 0).getTime()))
      .slice(0, limit)
  } catch (error) {
    console.error('Error getting recent games:', error)
    return []
  }
}

/**
 * Get all unique game categories
 */
export async function getGameCategories(): Promise<string[]> {
  try {
    const games = await fetchGames()
    const categories = new Set(games.map(game => game.type))
    return ['All', ...Array.from(categories).sort()]
  } catch (error) {
    console.error('Error getting game categories:', error)
    return ['All']
  }
}

/**
 * Clear the games cache (useful for testing or forced refresh)
 */
export function clearGamesCache(): void {
  gamesCache = null
  cacheTimestamp = 0
}

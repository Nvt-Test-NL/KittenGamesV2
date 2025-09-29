export type ProxySite = {
  id: string
  title: string
  description?: string
  directUrl: string
  tags?: string[]
  instances?: { label: string, url: string }[]
}

export const proxySites: ProxySite[] = [
  {
    id: 'tiktok',
    title: 'TikTok via ProxiTok',
    description: 'Publieke TikTok weergave via ProxiTok frontends',
    directUrl: 'https://www.tiktok.com',
    tags: ['social','tiktok'],
    instances: [
      { label: 'ProxiTok #1', url: 'https://proxitok.pabloferreiro.es' },
      { label: 'ProxiTok #2', url: 'https://proxitok.r4fo.com' },
    ]
  },
  {
    id: 'youtube',
    title: 'YouTube via Invidious/Piped',
    description: 'Snelle leesweergave zonder trackers',
    directUrl: 'https://www.youtube.com',
    tags: ['video','youtube'],
    instances: [
      { label: 'Invidious', url: 'https://yewtu.be' },
      { label: 'Piped', url: 'https://piped.video' },
    ]
  },
  {
    id: 'reddit',
    title: 'Reddit via Redlib',
    directUrl: 'https://www.reddit.com',
    tags: ['reddit'],
    instances: [
      { label: 'Redlib', url: 'https://redlib.perennialte.ch' }
    ]
  },
  {
    id: 'x',
    title: 'X via Nitter',
    directUrl: 'https://x.com',
    tags: ['twitter','x'],
    instances: [
      { label: 'Nitter', url: 'https://nitter.net' }
    ]
  },
  {
    id: 'wikipedia',
    title: 'Wikipedia via Wikiless',
    directUrl: 'https://wikipedia.org',
    tags: ['docs'],
    instances: [
      { label: 'Wikiless', url: 'https://wikiless.rawbit.ch' }
    ]
  },
  {
    id: 'imgur',
    title: 'Imgur via Rimgo',
    directUrl: 'https://imgur.com',
    tags: ['images'],
    instances: [
      { label: 'Rimgo', url: 'https://rimgo.pussthecat.org' }
    ]
  },
  {
    id: 'fandom',
    title: 'Fandom via BreezeWiki',
    directUrl: 'https://www.fandom.com',
    tags: ['docs'],
    instances: [
      { label: 'BreezeWiki', url: 'https://breezewiki.com' }
    ]
  },
  {
    id: 'search',
    title: 'Metasearch via SearXNG',
    directUrl: 'https://www.google.com',
    tags: ['search'],
    instances: [
      { label: 'SearXNG', url: 'https://search.bus-hit.me' }
    ]
  },
  {
    id: 'proxy',
    title: 'Proxy Croxy',
    directUrl: 'https://www.google.com',
    tags: ['search'],
    instances: [
      { label: 'Croxy', url: 'https://51.159.195.115/search?q=snapchat&rdr=1&rdrig=CAA44D2FDE8E481C893C20D796C1BB7F&ntref=1&__cpo=aHR0cHM6Ly93d3cuYmluZy5jb20' }
    ]
  },
  {
    id: 'snapchat',
    title: 'Snapchat via Croxy',
    directUrl: 'https://www.google.com',
    tags: ['social','snapchat'],
    instances: [
      { label: 'Snapchat', url: 'https://51.159.195.115/search?q=snapchat&rdr=1&rdrig=CAA44D2FDE8E481C893C20D796C1BB7F&ntref=1&__cpo=aHR0cHM6Ly93d3cuYmluZy5jb20' }
    ]
  },
  {
    id: 'tiktok',
    title: 'Tiktok via ProxiTok',
    directUrl: 'https://proxitok.pabloferreiro.es',
    tags: ['social','tiktok'],
    instances: [
      { label: 'ProxiTok #1', url: 'https://proxitok.pabloferreiro.es' },
      { label: 'ProxiTok #2', url: 'https://proxitok.r4fo.com' },
    ]
  },
  {
    id: 'Tiktok met Proxy',
    title: 'Proxy Croxy',
    directUrl: 'https://www.google.com',
    tags: ['search'],
    instances: [
      { label: 'SearXNG', url: 'https://51.159.195.115/search?q=snapchat&rdr=1&rdrig=CAA44D2FDE8E481C893C20D796C1BB7F&ntref=1&__cpo=aHR0cHM6Ly93d3cuYmluZy5jb20' }
    ]
  },
]

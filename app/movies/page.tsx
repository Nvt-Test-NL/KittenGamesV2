"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback, Fragment } from "react";
import Header from "../../components/Header";
import dynamic from "next/dynamic";
const MovieCard = dynamic(() => import("../../components/MovieCard"), { ssr: false });
import { Movie, TVShow, TMDBResponse } from "../../types/tmdb";
import {
  getPopularMovies,
  getPopularTVShows,
  getTrendingAll,
  getBackdropUrl,
  getMovieDetails,
  getTVDetails,
  getSimilarMovies,
  getSimilarTV,
} from "../../utils/tmdb";
import { getHistory, onHistoryChanged, type WatchProgress } from "../../utils/history";
import { getFavorites, onFavoritesChanged, type FavItem } from "../../utils/favorites";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Film, Tv, Flame, Loader2 } from "lucide-react";
import AdInFeed from "../../components/ads/AdInFeed";

export default function Movies() {
  const [trendingItems, setTrendingItems] = useState<(Movie | TVShow)[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTVShows, setPopularTVShows] = useState<TVShow[]>([]);
  const [featuredItem, setFeaturedItem] = useState<Movie | TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trending");
  const [continueWatching, setContinueWatching] = useState<(Movie | TVShow)[]>([]);
  const [aiRecommended, setAiRecommended] = useState<(Movie | TVShow)[]>([]);
  const [favoritesItems, setFavoritesItems] = useState<(Movie | TVShow)[]>([]);
  type NextItem = { movie: Movie; reason?: string };
  const [whichNext, setWhichNext] = useState<NextItem[]>([]);
  const [whichNextLoading, setWhichNextLoading] = useState<boolean>(false);
  const [whichNextFilters, setWhichNextFilters] = useState<{ genresInclude: number[]; yearMin?: number; yearMax?: number }>({ genresInclude: [] });
  const [alreadyWatched, setAlreadyWatched] = useState<(Movie | TVShow)[]>([]);

  // Refs for auto-scroll carousels
  const filmsRowRef = useRef<HTMLDivElement | null>(null);
  const seriesRowRef = useRef<HTMLDivElement | null>(null);
  const filmsHoverRef = useRef(false);
  const seriesHoverRef = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trending content
        const trendingResponse: TMDBResponse = await getTrendingAll("week");
        const trending = trendingResponse.results.slice(0, 20);
        setTrendingItems(trending);

        // Set featured item (first trending item)
        if (trending.length > 0) {
          setFeaturedItem(trending[0]);
        }

        // Fetch popular movies
        const moviesResponse: TMDBResponse = await getPopularMovies();
        setPopularMovies(moviesResponse.results as Movie[]);

        // Fetch popular TV shows
        const tvResponse: TMDBResponse = await getPopularTVShows();
        setPopularTVShows(tvResponse.results as TVShow[]);
      } catch (error) {
        console.error("Error fetching TMDB data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper to compute "Which Movie Next" using OpenRouter (server proxy)
  const computeWhichNext = useCallback(async () => {
    try {
      setWhichNextLoading(true);
      const favs: FavItem[] = getFavorites();
      const hist: WatchProgress[] = getHistory();
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites: favs, history: hist, filters: whichNextFilters }),
      });
      if (!res.ok) throw new Error('recommend endpoint failed');
      const data = await res.json();
      const ids: { tmdbId: number; type: 'movie'; reason?: string }[] = Array.isArray(data?.ids) ? data.ids : [];
      const top10 = ids.slice(0, 10);
      const details: NextItem[] = [];
      for (const it of top10) {
        try {
          const m = await getMovieDetails(it.tmdbId);
          details.push({ movie: m, reason: it.reason });
        } catch {}
      }
      setWhichNext(details);
    } catch (e) {
      console.error('WhichNext error', e);
      setWhichNext([]);
    } finally {
      setWhichNextLoading(false);
    }
  }, [whichNextFilters]);

  // Run once on mount
  useEffect(() => {
    computeWhichNext();
  }, [computeWhichNext]);

  // Recompute when favorites or history change (live)
  useEffect(() => {
    const offFav = onFavoritesChanged(() => computeWhichNext());
    const offHist = onHistoryChanged(() => computeWhichNext());
    return () => { offFav && offFav(); offHist && offHist(); };
  }, [computeWhichNext]);

  // Live update Continue Watching and Already Watched on history changes
  useEffect(() => {
    const recomputeFromHistory = async () => {
      const history: WatchProgress[] = getHistory();
      const cw = history.filter(h => !h.finished).sort((a,b)=>b.updatedAt - a.updatedAt).slice(0, 10);
      const cwDetails: (Movie | TVShow)[] = [];
      for (const h of cw) {
        try {
          const item = h.type === 'movie' ? await getMovieDetails(h.tmdbId) : await getTVDetails(h.tmdbId);
          cwDetails.push(item);
        } catch {}
      }
      setContinueWatching(cwDetails);

      const watched = history.filter(h => h.finished).sort((a,b)=>b.updatedAt - a.updatedAt).slice(0, 12);
      const watchedDetails: (Movie | TVShow)[] = [];
      for (const h of watched) {
        try {
          const item = h.type === 'movie' ? await getMovieDetails(h.tmdbId) : await getTVDetails(h.tmdbId);
          watchedDetails.push(item);
        } catch {}
      }
      setAlreadyWatched(watchedDetails);
    };
    const off = onHistoryChanged(recomputeFromHistory);
    return () => { off && off(); };
  }, []);

  // Refresh favorites live when they change
  useEffect(() => {
    const updateFavs = async () => {
      const favs: FavItem[] = getFavorites();
      const favDetails: (Movie | TVShow)[] = [];
      for (const f of favs.slice(0, 12)) {
        try {
          const item = f.type === 'movie' ? await getMovieDetails(f.tmdbId) : await getTVDetails(f.tmdbId);
          favDetails.push(item);
        } catch {}
      }
      setFavoritesItems(favDetails);
    };
    const off = onFavoritesChanged(updateFavs);
    return () => { off && off(); };
  }, []);

  // Auto-scroll for Top 10 rails
  useEffect(() => {
    const makeAutoScroll = (el: HTMLDivElement | null) => {
      if (!el) return () => {};
      let dir = 1;
      const step = () => {
        if (!el) return;
        // pause when hovering
        if ((el === filmsRowRef.current && filmsHoverRef.current) || (el === seriesRowRef.current && seriesHoverRef.current)) {
          return;
        }
        const max = el.scrollWidth - el.clientWidth;
        const nearEnd = el.scrollLeft >= max - 10;
        const nearStart = el.scrollLeft <= 10;
        if (nearEnd) dir = -1;
        if (nearStart) dir = 1;
        el.scrollBy({ left: dir * 2, behavior: 'smooth' });
      };
      const id = window.setInterval(step, 50);
      return () => window.clearInterval(id);
    };
    const cleanFilms = makeAutoScroll(filmsRowRef.current);
    const cleanSeries = makeAutoScroll(seriesRowRef.current);
    return () => {
      cleanFilms && cleanFilms();
      cleanSeries && cleanSeries();
    };
  }, [popularMovies, popularTVShows]);

  // Load Continue Watching from localStorage and AI recommendations
  useEffect(() => {
    const loadPersonalized = async () => {
      try {
        const history: WatchProgress[] = getHistory();
        // Continue Watching: not finished, use most recent first, limit 10
        const cw = history.filter(h => !h.finished).sort((a,b)=>b.updatedAt - a.updatedAt).slice(0, 10);
        const cwDetails: (Movie | TVShow)[] = [];
        for (const h of cw) {
          try {
            const item = h.type === 'movie' ? await getMovieDetails(h.tmdbId) : await getTVDetails(h.tmdbId);
            cwDetails.push(item);
          } catch {}
          if (cwDetails.length >= 10) break;
        }
        setContinueWatching(cwDetails);

        // Already watched (finished)
        const watched = history.filter(h => h.finished).sort((a,b)=>b.updatedAt - a.updatedAt).slice(0, 12);
        const watchedDetails: (Movie | TVShow)[] = [];
        for (const h of watched) {
          try {
            const item = h.type === 'movie' ? await getMovieDetails(h.tmdbId) : await getTVDetails(h.tmdbId);
            watchedDetails.push(item);
          } catch {}
        }
        setAlreadyWatched(watchedDetails);

        // Favorites
        const favs: FavItem[] = getFavorites();
        const favDetails: (Movie | TVShow)[] = [];
        for (const f of favs.slice(0, 12)) {
          try {
            const item = f.type === 'movie' ? await getMovieDetails(f.tmdbId) : await getTVDetails(f.tmdbId);
            favDetails.push(item);
          } catch {}
        }
        setFavoritesItems(favDetails);

        // AI recommendations via OpenRouter -> returns ids; if empty, fallback to TMDB similar from last item
        let recItems: (Movie | TVShow)[] = [];
        try {
          const res = await fetch('/api/ai/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: history.map(h => ({ tmdbId: h.tmdbId, type: h.type })) })
          });
          const data = await res.json();
          const ids: Array<{ tmdbId: number, type: 'movie'|'tv' }> = Array.isArray(data?.ids) ? data.ids : [];
          for (const id of ids) {
            try {
              const item = id.type === 'movie' ? await getMovieDetails(id.tmdbId) : await getTVDetails(id.tmdbId);
              recItems.push(item);
              if (recItems.length >= 6) break;
            } catch {}
          }
        } catch {}

        if (recItems.length === 0) {
          // Fallback: take last watched and fetch similar
          const last = history[0];
          if (last) {
            try {
              const similar = last.type === 'movie' ? await getSimilarMovies(last.tmdbId) : await getSimilarTV(last.tmdbId);
              recItems = (similar.results as any[]).slice(0, 12);
            } catch {}
          }
        }
        setAiRecommended(recItems.slice(0,6));
      } catch (e) {
        // ignore personalization failure
      }
    };
    // Delay slightly to allow client hydration
    setTimeout(loadPersonalized, 0);
  }, []);

  const isMovie = (item: Movie | TVShow): item is Movie => {
    return "title" in item;
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
        {/* Continue Watching */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Verder kijken</h2>
          {continueWatching.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
                {continueWatching.map((item: Movie | TVShow, idx: number) => (
                  <div key={`cw-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                    <MovieCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Geen titels om verder te kijken — begin met afspelen om hier te verschijnen.</div>
          )}
        </section>

        {/* Favorites */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Favorieten</h2>
          {favoritesItems.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
                {favoritesItems.map((item: Movie | TVShow, idx: number) => (
                  <div key={`fav-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                    <MovieCard item={item} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Nog geen favorieten — klik op ☆ Fav op een titel om toe te voegen.</div>
          )}
        </section>
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Continue Watching</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {continueWatching.map((item: Movie | TVShow) => (
                <MovieCard key={`cw-${('id' in item)? item.id : Math.random()}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* AI Recommends */}
        {aiRecommended.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">AI raadt aan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {aiRecommended.map((item: Movie | TVShow, idx: number) => (
                <Fragment key={`ai-${idx}-${('id' in item)? item.id : idx}`}>
                  <MovieCard item={item} />
                </Fragment>
              ))}
            </div>
          </section>
        )}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading movies and shows...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="movies" />

      {/* Featured Banner */}
      {featuredItem && (
        <section className="relative h-[70vh] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center">
            <img
              src={getBackdropUrl(featuredItem.backdrop_path, "w1280") || ''}
              alt="Backdrop"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
            <div className="max-w-2xl text-white pt-20">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">
                {isMovie(featuredItem) ? featuredItem.title : featuredItem.name}
              </h1>
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-lg">
                    {formatRating(featuredItem.vote_average)}
                  </span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-lg">
                  {isMovie(featuredItem)
                    ? new Date(featuredItem.release_date).getFullYear()
                    : new Date(featuredItem.first_air_date).getFullYear()}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-lg capitalize">
                  {isMovie(featuredItem) ? "Movie" : "TV Show"}
                </span>
              </div>
              <p className="text-lg text-gray-300 leading-relaxed mb-8 line-clamp-3">
                {featuredItem.overview}
              </p>
            </div>
          </div>
        </section>
      )}

      <main className="container mx-auto px-4 py-8 pt-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList>
              <TabsTrigger
                value="trending"
                className="flex items-center space-x-2"
              >
                <Flame className="w-4 h-4" />
                <span>Trending</span>
              </TabsTrigger>
              <TabsTrigger
                value="movies"
                className="flex items-center space-x-2"
              >
                <Film className="w-4 h-4" />
                <span>Movies</span>
              </TabsTrigger>
              <TabsTrigger
                value="tv"
                className="flex items-center space-x-2"
              >
                <Tv className="w-4 h-4" />
                <span>TV Shows</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trending" className="space-y-10">
            {/* Verder kijken */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Verder kijken</h2>
              {continueWatching.length > 0 ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4">
                    {continueWatching.map((item: Movie | TVShow, idx: number) => (
                      <div key={`cwtab-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                        <MovieCard item={item} showMarkFinished />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Geen titels om verder te kijken — begin met afspelen om hier te verschijnen.</div>
              )}
            </section>

            {/* Top films vandaag - horizontal scroll */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Top films vandaag</h2>
              <div className="relative">
                {/* Chevrons */}
                <button onClick={() => filmsRowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-slate-900/60 border border-slate-700/40 text-white hover:border-emerald-300/30">‹</button>
                <button onClick={() => filmsRowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-slate-900/60 border border-slate-700/40 text-white hover:border-emerald-300/30">›</button>
                <div className="overflow-x-auto pb-2">
                  <div
                    ref={filmsRowRef}
                    className="flex gap-4 snap-x snap-mandatory"
                    onMouseEnter={() => { filmsHoverRef.current = true; }}
                    onMouseLeave={() => { filmsHoverRef.current = false; }}
                  >
                  {popularMovies.slice(0, 10).map((movie: Movie, i: number) => (
                    <div key={`top-movie-${movie.id}`} className="shrink-0 w-40 sm:w-48 md:w-52 snap-start">
                      <MovieCard item={movie} rankNumber={i+1} />
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Which Movie Next */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Which Movie Next</h2>
              {/* Simple filters */}
              <div className="mb-3 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <label className="text-gray-400">Genres</label>
                  <select multiple value={whichNextFilters.genresInclude.map(String)} onChange={(e)=>{
                    const values = Array.from(e.target.selectedOptions).map(o=>Number(o.value));
                    setWhichNextFilters(prev=>({ ...prev, genresInclude: values }));
                    setTimeout(()=>computeWhichNext(), 0);
                  }} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white min-w-[180px] h-9">
                    {/* Common TMDB movie genres */}
                    <option value="28">Action</option>
                    <option value="12">Adventure</option>
                    <option value="16">Animation</option>
                    <option value="35">Comedy</option>
                    <option value="80">Crime</option>
                    <option value="18">Drama</option>
                    <option value="14">Fantasy</option>
                    <option value="27">Horror</option>
                    <option value="9648">Mystery</option>
                    <option value="878">Science Fiction</option>
                    <option value="53">Thriller</option>
                    <option value="10749">Romance</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <label className="text-gray-400">Year ≥</label>
                  <input type="number" value={whichNextFilters.yearMin ?? ''} placeholder="e.g. 2000" onChange={(e)=>{
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setWhichNextFilters(prev=>({ ...prev, yearMin: val }));
                  }} onBlur={()=>computeWhichNext()} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <label className="text-gray-400">Year ≤</label>
                  <input type="number" value={whichNextFilters.yearMax ?? ''} placeholder="e.g. 2025" onChange={(e)=>{
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setWhichNextFilters(prev=>({ ...prev, yearMax: val }));
                  }} onBlur={()=>computeWhichNext()} className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"/>
                </div>
                <button onClick={()=>computeWhichNext()} className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-gray-200 hover:bg-slate-700 text-sm">Opnieuw aanbevelen</button>
              </div>
              {whichNextLoading ? (
                <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300 inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <span>Bezig met aanbevelingen ophalen…</span>
                </div>
              ) : whichNext.length > 0 ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4">
                    {whichNext.map((item: NextItem, idx: number) => (
                      <div key={`next-${idx}-${item.movie.id}`} className="relative shrink-0 w-40 sm:w-48 md:w-52">
                        <div className="absolute -left-1 -top-2 text-6xl font-extrabold text-emerald-300/10 select-none pointer-events-none">{idx+1}</div>
                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 backdrop-blur-md"># {idx+1}</div>
                        {/* Reason chip */}
                        {item.reason && (
                          <div className="absolute bottom-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-black/60 border border-emerald-400/30 text-emerald-200 backdrop-blur-md max-w-[85%] truncate" title={item.reason}>
                            {item.reason}
                          </div>
                        )}
                        <MovieCard item={item.movie} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Nog geen aanbevelingen — voeg favorieten toe of kijk een film om suggesties te krijgen.</div>
              )}
            </section>

            {/* Favorieten */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Favorieten</h2>
              {favoritesItems.length > 0 ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4">
                    {favoritesItems.map((item: Movie | TVShow, idx: number) => (
                      <div key={`favtab-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                        <MovieCard item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Nog geen favorieten — klik op ☆ Fav op een titel om toe te voegen.</div>
              )}
            </section>

            {/* Top series vandaag - horizontal scroll */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Top series vandaag</h2>
              <div className="relative">
                {/* Chevrons */}
                <button onClick={() => seriesRowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-slate-900/60 border border-slate-700/40 text-white hover:border-emerald-300/30">‹</button>
                <button onClick={() => seriesRowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-slate-900/60 border border-slate-700/40 text-white hover:border-emerald-300/30">›</button>
                <div className="overflow-x-auto pb-2">
                  <div
                    ref={seriesRowRef}
                    className="flex gap-4 snap-x snap-mandatory"
                    onMouseEnter={() => { seriesHoverRef.current = true; }}
                    onMouseLeave={() => { seriesHoverRef.current = false; }}
                  >
                  {popularTVShows.slice(0, 10).map((show: TVShow, i: number) => (
                    <div key={`top-show-${show.id}`} className="shrink-0 w-40 sm:w-48 md:w-52 snap-start">
                      <MovieCard item={show} rankNumber={i+1} />
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Already Watched */}
            {alreadyWatched.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-4">Al gekeken</h2>
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4">
                    {alreadyWatched.map((item: Movie | TVShow, idx: number) => (
                      <div key={`watched-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                        <MovieCard item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Al gekeken */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Al gekeken</h2>
              {alreadyWatched.length > 0 ? (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4">
                    {alreadyWatched.map((item: Movie | TVShow, idx: number) => (
                      <div key={`watchedtab-${idx}-${('id' in item)? item.id : idx}`} className="shrink-0 w-40 sm:w-48 md:w-52">
                        <MovieCard item={item} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Nog niets uitgekeken — klik op “Klaar” in Verder kijken.</div>
              )}
            </section>

            {/* Trending grid */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Trending This Week</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {trendingItems.map((item: Movie | TVShow, idx: number) => (
                  <Fragment key={`trending-${idx}-${item.id}`}>
                    <MovieCard item={item} />
                    {((idx + 1) % 3 === 0) && (
                      <AdInFeed adSlot="5154592782" />
                    )}
                  </Fragment>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="movies" className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Popular Movies
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {popularMovies.map((movie: Movie) => (
                <MovieCard
                  key={movie.id}
                  item={movie}
                  onClick={() => console.log("Movie clicked:", movie)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tv" className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              Popular TV Shows
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {popularTVShows.map((show: TVShow) => (
                <MovieCard
                  key={show.id}
                  item={show}
                  onClick={() => console.log("TV Show clicked:", show)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
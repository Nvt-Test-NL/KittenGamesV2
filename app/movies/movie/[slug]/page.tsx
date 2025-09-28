"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../../../../components/Header";
import MovieCard from "../../../../components/MovieCard";
import StreamingErrorHelper from "../../../../components/StreamingErrorHelper";
import { Movie } from "../../../../types/tmdb";
import { getPosterUrl, getBackdropUrl, getMovieDetails, getTVDetails } from "../../../../utils/tmdb";
import { getStreamingUrl, getStreamingSettings, getNextDomainId, setStreamingSettings } from "../../../../components/StreamingSettingsPanel";
import { Loader2, Star, Calendar, Clock, ChevronLeft, Play } from "lucide-react";
import { addFavorite, removeFavorite, isFavorite, getFavorites } from "../../../../utils/favorites";
import { upsertProgress, getHistory } from "../../../../utils/history";
import axios from "axios";

interface MovieDetails extends Movie {
  runtime?: number;
  budget?: number;
  revenue?: number;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
}

export default function MovieDetail() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showError, setShowError] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [failAttempts, setFailAttempts] = useState(0);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backGuardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fav, setFav] = useState<boolean>(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<Array<{ item: Movie | any, type: 'movie'|'tv', reason?: string }>>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tmdb/movie/${slug}`);
        setMovie(response.data);
      } catch (error) {
        console.error("Error fetching movie details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchMovieDetails();
    }
  }, [slug]);

  // Smart Tags via OpenRouter
  useEffect(() => {
    const run = async () => {
      if (!movie) return;
      try {
        setTagsLoading(true);
        setTags([]);
        const res = await fetch('/api/ai/tags', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: movie.title,
            overview: movie.overview,
            genres: Array.isArray(movie.genres) ? movie.genres.map(g=>g.name) : [],
          })
        });
        const data = await res.json().catch(()=>({ tags: [] }));
        const t: string[] = Array.isArray(data?.tags) ? data.tags.slice(0,6) : [];
        setTags(t);
      } catch {
        setTags([]);
      } finally {
        setTagsLoading(false);
      }
    };
    run();
  }, [movie]);

  // Fetch AI similar recs (movies + tv) with reasons
  useEffect(() => {
    const run = async () => {
      if (!slug) return;
      try {
        setSimilarLoading(true);
        const favs = getFavorites();
        const hist = getHistory();
        const res = await fetch('/api/ai/similar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: { tmdbId: Number(slug), type: 'movie' }, favorites: favs, history: hist })
        });
        const data = await res.json();
        const ids: { tmdbId: number; type: 'movie'|'tv'; reason?: string }[] = Array.isArray(data?.ids) ? data.ids : [];
        const details: Array<{ item: any, type: 'movie'|'tv', reason?: string }> = [];
        for (const x of ids) {
          try {
            const it = x.type === 'movie' ? await getMovieDetails(x.tmdbId) : await getTVDetails(x.tmdbId);
            details.push({ item: it, type: x.type, reason: x.reason });
          } catch {}
        }
        setSimilarItems(details);
      } catch (e) {
        console.error('similar recs error', e);
        setSimilarItems([]);
      } finally {
        setSimilarLoading(false);
      }
    };
    run();
  }, [slug]);

  useEffect(() => {
    try {
      if (!slug) return;
      // slug is numeric id
      const idNum = Number(slug);
      if (!Number.isNaN(idNum)) setFav(isFavorite(idNum, 'movie'));
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (slug) {
      const url = getStreamingUrl('movie', slug);
      setEmbedUrl(url);
    }
  }, [slug]);

  // Clear any pending load timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      if (backGuardTimeoutRef.current) {
        clearTimeout(backGuardTimeoutRef.current);
        backGuardTimeoutRef.current = null;
      }
      if (typeof window !== 'undefined') {
        window.onpopstate = null as any;
      }
    };
  }, []);

  const installBackGuard = (durationMs = 8000) => {
    if (typeof window === 'undefined') return;
    try {
      // Push a dummy state and prevent immediate back navigation
      history.pushState(null, '', location.href);
      const handler = () => {
        history.go(1);
      };
      window.onpopstate = handler as any;
      if (backGuardTimeoutRef.current) clearTimeout(backGuardTimeoutRef.current);
      backGuardTimeoutRef.current = setTimeout(() => {
        if (window.onpopstate === handler) {
          window.onpopstate = null as any;
        }
        backGuardTimeoutRef.current = null;
      }, durationMs);
    } catch {}
  };

  const handleBackClick = () => {
    router.push("/movies");
  };

  const handlePlayClick = () => {
    setShowError(false);
    setTimeoutWarning(false);
    setFailAttempts(0);
    setShowPlayer(true);
    // Seed Continue Watching as soon as user starts playback
    try { upsertProgress({ tmdbId: Number(slug), type: 'movie', lastPositionSec: 5 }); } catch {}
    installBackGuard(6000);
    // Start timeout in case the iframe never fires onLoad due to X-Frame-Options/CSP
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      handleIframeError('timeout');
    }, 20000);
  };

  const handleIframeError = (source: 'timeout' | 'onerror' = 'onerror') => {
    // Try automatic domain switch if enabled
    try {
      const settings = getStreamingSettings();
      if (settings.autoSwitch) {
        setIsSwitching(true);
        // Keep player mounted for soft switch on timeout
        const nextId = getNextDomainId(settings.selectedDomain);
        const nextSettings = { ...settings, selectedDomain: nextId };
        setStreamingSettings(nextSettings);
        const url = getStreamingUrl('movie', slug);
        setEmbedUrl(url);
        setShowError(false);
        // restart timeout shorter on subsequent attempts
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
          handleIframeError('timeout');
        }, 8000);
        setTimeout(() => setIsSwitching(false), 400);
        if (source === 'timeout' || source === 'onerror') {
          setTimeoutWarning(true);
        }
        // For onerror we still fall through to error UI below
        return;
      }
    } catch (e) {
      // fall through to show helper
    }
    // For both timeout and onerror, show soft warning first; escalate after 2 attempts
    setFailAttempts((n: number) => {
      const next = n + 1;
      if (next >= 2) {
        setShowError(true);
      } else {
        setTimeoutWarning(true);
      }
      return next;
    });
  };

  const handleRetry = () => {
    setShowError(false);
    setShowPlayer(false);
    setTimeout(() => {
      const url = getStreamingUrl('movie', slug);
      setEmbedUrl(url);
      setShowPlayer(true);
    }, 100);
  };

  const handleDomainSwitch = () => {
    const url = getStreamingUrl('movie', slug);
    setEmbedUrl(url);
    setShowError(false);
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Some providers (e.g. vidsrc) break with sandbox; allow conditional unsandbox as a last resort
  const requireUnsandbox = /vidsrc\./i.test(embedUrl);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading movie details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Movie not found</h1>
            <button
              onClick={() => router.push("/movies")}
              className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition"
            >
              Back to Movies
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Full-screen backdrop image */}
      {movie.backdrop_path && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url(${getBackdropUrl(movie.backdrop_path, "original")})`,
              backgroundPosition: "center 15%",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />
          </div>
        </div>
      )}

      {/* Content positioned above backdrop */}
      <div className="relative z-10">
        <Header currentPage="movies" />

        {/* Back Button */}
        <div className="container mx-auto px-4 pt-24 pb-4">
          <button
            onClick={handleBackClick}
            className="flex items-center space-x-2 text-white hover:text-purple-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Movies</span>
          </button>
        </div>

        {/* Main content section */}
        <section className="container mx-auto px-4 py-8 min-h-[calc(100vh-12rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Movie Info - Left Column */}
            <div className="lg:col-span-5 text-white">
              <div className="flex flex-col md:flex-row lg:flex-col gap-6 items-start">
                {/* Poster - Only visible on medium screens */}
                <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl hidden md:block lg:hidden">
                  <Image
                    src={getPosterUrl(movie.poster_path, "w500") || ""}
                    alt={movie.title}
                    width={192}
                    height={288}
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Movie Info */}
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    {movie.title}
                  </h1>
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const idNum = Number(slug);
                        const type: 'movie' = 'movie';
                        if (fav) { removeFavorite(idNum, type); setFav(false); }
                        else { addFavorite(idNum, type); setFav(true); }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all backdrop-blur-md ${fav ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-slate-900/50 text-gray-300 border-slate-700/40 hover:border-emerald-300/30'}`}
                    >
                      {fav ? '★ Fav' : '☆ Fav'}
                    </button>
                  </div>
                  
                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      <span className="text-lg font-medium">
                        {movie.vote_average.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({movie.vote_count.toLocaleString()} votes)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-lg">
                        {new Date(movie.release_date).getFullYear()}
                      </span>
                    </div>
                    {movie.runtime && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-lg">{formatRuntime(movie.runtime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="px-3 py-1 bg-gray-800/60 border border-gray-700/50 rounded-full text-sm text-gray-300"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Smart Tags */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {tagsLoading && (
                        <span className="px-2 py-1 text-xs rounded-full bg-slate-900/60 border border-slate-700 text-gray-300">Tags laden…</span>
                      )}
                      {!tagsLoading && tags.map((t, i) => (
                        <span key={`tag-${i}`} className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 backdrop-blur-md">{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Overview */}
                  <p className="text-base text-gray-300 leading-relaxed mb-6">
                    {movie.overview}
                  </p>

                  {/* Play Button */}
                  {!showPlayer && (
                    <button
                      onClick={handlePlayClick}
                      className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors mb-6 transform hover:scale-105"
                    >
                      <Play className="w-5 h-5" />
                      <span>Watch Movie</span>
                    </button>
                  )}

                  {/* Movie Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex">
                      <span className="w-32 text-gray-400">Original Title</span>
                      <span>{movie.original_title}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-400">Release Date</span>
                      <span>{new Date(movie.release_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-gray-400">Language</span>
                      <span>{movie.original_language.toUpperCase()}</span>
                    </div>
                    {movie.budget && movie.budget > 0 && (
                      <div className="flex">
                        <span className="w-32 text-gray-400">Budget</span>
                        <span>{formatMoney(movie.budget)}</span>
                      </div>
                    )}
                    {movie.revenue && movie.revenue > 0 && (
                      <div className="flex">
                        <span className="w-32 text-gray-400">Revenue</span>
                        <span>{formatMoney(movie.revenue)}</span>
                      </div>
                    )}
                    {movie.production_countries && movie.production_countries.length > 0 && (
                      <div className="flex">
                        <span className="w-32 text-gray-400">Countries</span>
                        <span>{movie.production_countries.map(c => c.name).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player - Right Column */}
            <div className="lg:col-span-7">
              {showPlayer && (
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-gray-400">
                    If the player is blocked on this device, try opening the source directly.
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-sm text-white border border-gray-700"
                    >
                      Open in new tab
                    </a>
                  </div>
                </div>
              )}
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                {showPlayer ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    // Prevent framebusting/top navigation from the embed unless provider needs unsandbox
                    {...(!requireUnsandbox ? { sandbox: "allow-same-origin allow-scripts allow-forms allow-popups" } : {})}
                    // Some providers require a referrer to validate requests; use a permissive safe policy
                    referrerPolicy="origin-when-cross-origin"
                    allowFullScreen
                    title={movie.title}
                    onError={() => handleIframeError('onerror')}
                    onLoad={() => {
                      setShowError(false);
                      setIsSwitching(false);
                      setTimeoutWarning(false);
                      if (loadTimeoutRef.current) {
                        clearTimeout(loadTimeoutRef.current);
                        loadTimeoutRef.current = null;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 relative">
                    {/* Background poster with overlay */}
                    {movie.backdrop_path && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-20"
                        style={{
                          backgroundImage: `url(${getBackdropUrl(movie.backdrop_path, "w1280")})`,
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-black/80" />
                    
                    {/* Play Button Content */}
                    <div className="relative z-10 text-center text-white">
                      {isSwitching && (
                        <div className="mb-4 inline-flex items-center px-3 py-1.5 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs">
                          Switching source...
                        </div>
                      )}
                      <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors cursor-pointer transform hover:scale-110">
                        <Play className="w-8 h-8 ml-1" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Ready to Watch</h3>
                      <p className="text-gray-300 mb-1">{movie.title}</p>
                      {movie.runtime && (
                        <p className="text-gray-400 text-sm mb-4">{formatRuntime(movie.runtime)}</p>
                      )}
                      <button
                        onClick={handlePlayClick}
                        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors transform hover:scale-105"
                      >
                        Start Movie
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Error Helper */}
              {showError && (
                <StreamingErrorHelper
                  type="movie"
                  onRetry={handleRetry}
                  onDomainSwitch={handleDomainSwitch}
                />
              )}
              {/* Soft timeout warning */}
              {showPlayer && !showError && timeoutWarning && (
                <div className="mt-3 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm flex items-center justify-between">
                  <span>Player seems blocked or slow. You can switch source or open in a new tab.</span>
                  <div className="flex gap-2">
                    <button onClick={handleDomainSwitch} className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs">Switch source</button>
                    <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs">Open in new tab</a>
                  </div>
                </div>
              )}
              
              {/* Player Controls */}
              {showPlayer && !showError && (
                <div className="flex justify-between items-center mt-4 text-gray-400 text-sm">
                  <div>
                    <p>Now playing: <span className="text-white">{movie.title}</span></p>
                    {movie.runtime && (
                      <p>{formatRuntime(movie.runtime)} • {new Date(movie.release_date).getFullYear()}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setShowPlayer(false)}
                    className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded bg-gray-800/50 hover:bg-gray-700/50"
                  >
                    Exit Player
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Because you liked … */}
        <section className="container mx-auto px-4 pb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Because you liked {movie.title}</h2>
          {similarLoading ? (
            <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
              <span>Bezig met aanbevelingen ophalen…</span>
            </div>
          ) : similarItems.length > 0 ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4">
                {similarItems.map((s, idx) => (
                  <div key={`sim-${idx}-${s.type}-${s.item.id}`} className="relative shrink-0 w-40 sm:w-48 md:w-52">
                    {s.reason && (
                      <div className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-black/60 border border-emerald-400/30 text-emerald-200 backdrop-blur-md max-w-[85%] truncate" title={s.reason}>
                        {s.reason}
                      </div>
                    )}
                    {/* Reuse MovieCard which handles both movie and tv */}
                    {/* @ts-ignore */}
                    <MovieCard item={s.item} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">Geen soortgelijke aanbevelingen gevonden.</div>
          )}
        </section>
      </div>
    </div>
  );
}
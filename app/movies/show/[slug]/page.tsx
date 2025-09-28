"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../../../../components/Header";
import MovieCard from "../../../../components/MovieCard";
import StreamingErrorHelper from "../../../../components/StreamingErrorHelper";
import { TVShow } from "../../../../types/tmdb";
import { getPosterUrl, getBackdropUrl, getMovieDetails, getTVDetails } from "../../../../utils/tmdb";
import { getStreamingUrl, getStreamingSettings, getNextDomainId, setStreamingSettings } from "../../../../components/StreamingSettingsPanel";
import { Loader2, Star, Calendar, ChevronLeft, Play } from "lucide-react";
import { addFavorite, removeFavorite, isFavorite, getFavorites } from "../../../../utils/favorites";
import { upsertProgress, getHistory } from "../../../../utils/history";
import axios from "axios";

export default function ShowDetail() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const [show, setShow] = useState<TVShow | null>(null);
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
  const [similarItems, setSimilarItems] = useState<Array<{ item: any, type: 'movie'|'tv', reason?: string }>>([]);

  useEffect(() => {
    const fetchShowDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tmdb/tv/${slug}`);
        setShow(response.data);
      } catch (error) {
        console.error("Error fetching show details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchShowDetails();
    }
  }, [slug]);

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
          body: JSON.stringify({ target: { tmdbId: Number(slug), type: 'tv' }, favorites: favs, history: hist })
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
      const idNum = Number(slug);
      if (!Number.isNaN(idNum)) setFav(isFavorite(idNum, 'tv'));
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (slug) {
      const url = getStreamingUrl('tv', slug);
      setEmbedUrl(url);
    }
  }, [slug]);

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
    try { upsertProgress({ tmdbId: Number(slug), type: 'tv', lastPositionSec: 5 }); } catch {}
    installBackGuard(6000);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      handleIframeError('timeout');
    }, 20000);
  };

  const handleIframeError = (source: 'timeout' | 'onerror' = 'onerror') => {
    try {
      const settings = getStreamingSettings();
      if (settings.autoSwitch) {
        setIsSwitching(true);
        const nextId = getNextDomainId(settings.selectedDomain);
        const nextSettings = { ...settings, selectedDomain: nextId };
        setStreamingSettings(nextSettings);
        const url = getStreamingUrl('tv', slug);
        setEmbedUrl(url);
        setShowError(false);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
          handleIframeError('timeout');
        }, 8000);
        setTimeout(() => setIsSwitching(false), 400);
        if (source === 'timeout' || source === 'onerror') {
          setTimeoutWarning(true);
        }
        return;
      }
    } catch (e) {
      // fall through
    }
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
      const url = getStreamingUrl('tv', slug);
      setEmbedUrl(url);
      setShowPlayer(true);
    }, 100);
  };

  const handleDomainSwitch = () => {
    const url = getStreamingUrl('tv', slug);
    setEmbedUrl(url);
    setShowError(false);
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes || minutes <= 0) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const requireUnsandbox = /vidsrc\./i.test(embedUrl);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading series details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Series not found</h1>
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

  const epMinutes = Array.isArray(show.episode_run_time) && show.episode_run_time.length > 0 ? show.episode_run_time[0] : undefined;

  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Full-screen backdrop image */}
      {show.backdrop_path && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url(${getBackdropUrl(show.backdrop_path, "original")})`,
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
            {/* Show Info - Left Column */}
            <div className="lg:col-span-5 text-white">
              <div className="flex flex-col md:flex-row lg:flex-col gap-6 items-start">
                {/* Poster - Only visible on medium screens */}
                <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl hidden md:block lg:hidden">
                  <Image
                    src={getPosterUrl(show.poster_path, "w500") || ""}
                    alt={show.name}
                    width={192}
                    height={288}
                    className="object-cover w-full h-full"
                  />
                </div>

                {/* Show Info */}
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    {show.name}
                  </h1>
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const idNum = Number(slug);
                        const type: 'tv' = 'tv';
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
                        {show.vote_average.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-400">
                        ({show.vote_count.toLocaleString()} votes)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-lg">
                        {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'TBA'}
                      </span>
                    </div>
                    {typeof epMinutes === 'number' && epMinutes > 0 && (
                      <div className="flex items-center space-x-1">
                        <span className="text-lg">{formatRuntime(epMinutes)}</span>
                        <span className="text-sm text-gray-400">per episode</span>
                      </div>
                    )}
                  </div>

                  {/* Genres */}
                  {show.genres && show.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {show.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="px-3 py-1 bg-gray-800/60 border border-gray-700/50 rounded-full text-sm text-gray-300"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Overview */}
                  <p className="text-base text-gray-300 leading-relaxed mb-6">
                    {show.overview}
                  </p>

                  {/* Play Button */}
                  {!showPlayer && (
                    <button
                      onClick={handlePlayClick}
                      className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors mb-6 transform hover:scale-105"
                    >
                      <Play className="w-5 h-5" />
                      <span>Watch Series</span>
                    </button>
                  )}

                  {/* Show Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex">
                      <span className="w-40 text-gray-400">Original Name</span>
                      <span>{show.original_name}</span>
                    </div>
                    {typeof show.number_of_seasons === 'number' && (
                      <div className="flex">
                        <span className="w-40 text-gray-400">Seasons</span>
                        <span>{show.number_of_seasons}</span>
                      </div>
                    )}
                    {typeof show.number_of_episodes === 'number' && (
                      <div className="flex">
                        <span className="w-40 text-gray-400">Episodes</span>
                        <span>{show.number_of_episodes}</span>
                      </div>
                    )}
                    {show.origin_country && show.origin_country.length > 0 && (
                      <div className="flex">
                        <span className="w-40 text-gray-400">Origin</span>
                        <span>{show.origin_country.join(', ')}</span>
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
                    {...(!requireUnsandbox ? { sandbox: "allow-same-origin allow-scripts allow-forms allow-popups" } : {})}
                    referrerPolicy="origin-when-cross-origin"
                    allowFullScreen
                    title={show.name}
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
                    {show.backdrop_path && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-20"
                        style={{
                          backgroundImage: `url(${getBackdropUrl(show.backdrop_path, "w1280")})`,
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
                      <p className="text-gray-300 mb-1">{show.name}</p>
                      {typeof epMinutes === 'number' && (
                        <p className="text-gray-400 text-sm mb-4">{formatRuntime(epMinutes)} per episode</p>
                      )}
                      <button
                        onClick={handlePlayClick}
                        className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors transform hover:scale-105"
                      >
                        Start Series
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Helper */}
              {showError && (
                <StreamingErrorHelper
                  type="tv"
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
                    <p>Now playing: <span className="text-white">{show.name}</span></p>
                    {show.first_air_date && (
                      <p>{new Date(show.first_air_date).getFullYear()}</p>
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
          <h2 className="text-xl font-semibold text-white mb-3">Because you liked {show.name}</h2>
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
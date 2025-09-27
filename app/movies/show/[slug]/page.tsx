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
import { Loader2, Star, Calendar, LayoutList, ChevronLeft, Play } from "lucide-react";
import { addFavorite, removeFavorite, isFavorite, getFavorites } from "../../../../utils/favorites";
import { upsertProgress, getHistory } from "../../../../utils/history";
import axios from "axios";

interface Season {
  id: number;
  name: string;
  episode_count: number;
  season_number: number;
}

export default function ShowDetail() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const [show, setShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showError, setShowError] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backGuardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [failAttempts, setFailAttempts] = useState(0);
  const [fav, setFav] = useState<boolean>(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<Array<{ item: any, type: 'movie'|'tv', reason?: string }>>([]);

  useEffect(() => {
    const fetchShowDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tmdb/tv/${slug}`);
      } catch (error) {
        console.error("Error fetching show details:", error);
      } finally {
        setLoading(false);
      }
    };
  }, [slug]);

  useEffect(() => {
    try {
      const idNum = Number(slug);
      if (!Number.isNaN(idNum)) setFav(isFavorite(idNum, 'tv'));
    } catch {}
  }, [slug]);

  // Fetch AI similar recs (movies + tv) with reasons for TV show
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
    if (slug) {
      const url = getStreamingUrl('tv', slug, selectedSeason, selectedEpisode);
      setEmbedUrl(url);
    }
  }, [slug, selectedSeason, selectedEpisode]);

  const handleBackClick = () => {
    router.push("/movies");
  };

  const installBackGuard = (durationMs = 8000) => {
    if (typeof window === 'undefined') return;
    try {
      history.pushState(null, '', location.href);
      const handler = () => { history.go(1); };
      window.onpopstate = handler as any;
      if (backGuardTimeoutRef.current) clearTimeout(backGuardTimeoutRef.current);
      backGuardTimeoutRef.current = setTimeout(() => {
        if (window.onpopstate === handler) window.onpopstate = null as any;
        backGuardTimeoutRef.current = null;
      }, durationMs);
    } catch {}
  };

  const handlePlayClick = () => {
    setShowError(false);
    setTimeoutWarning(false);
    setFailAttempts(0);
    setShowPlayer(true);
    // Seed Continue Watching for TV (S/E ignored in simple history)
    try { upsertProgress({ tmdbId: Number(slug), type: 'tv', lastPositionSec: 5 }); } catch {}
    installBackGuard(6000);
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      handleIframeError('timeout');
    }, 20000);
  };

  const handleIframeError = (source: 'timeout' | 'onerror' = 'onerror') => {
    // Soft auto-switch mirrors like movies page
    try {
      const settings = getStreamingSettings();
      if (settings.autoSwitch) {
        // Do not hide player; just rotate source
        const nextId = getNextDomainId(settings.selectedDomain);
        const nextSettings = { ...settings, selectedDomain: nextId };
        setStreamingSettings(nextSettings);
        const url = getStreamingUrl('tv', slug, selectedSeason, selectedEpisode);
        setEmbedUrl(url);
        setShowError(false);
        // shorten subsequent timeout
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
          handleIframeError('timeout');
        }, 8000);
        if (source === 'timeout' || source === 'onerror') {
          setTimeoutWarning(true);
        }
        return;
      }
    } catch {}
    // Escalate to hard error after 2 failed attempts
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
    setTimeoutWarning(false);
    setShowPlayer(false);
    setTimeout(() => {
      const url = getStreamingUrl('tv', slug, selectedSeason, selectedEpisode);
      setEmbedUrl(url);
      setShowPlayer(true);
    }, 100);
  };

  const handleDomainSwitch = () => {
    try {
      const settings = getStreamingSettings();
      const nextId = getNextDomainId(settings.selectedDomain);
      const nextSettings = { ...settings, selectedDomain: nextId };
      setStreamingSettings(nextSettings);
    } catch {}
    const url = getStreamingUrl('tv', slug, selectedSeason, selectedEpisode);
    setEmbedUrl(url);
    setShowError(false);
    setTimeoutWarning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header currentPage="movies" />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading show details...</p>
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
            <h1 className="text-2xl font-bold mb-4">TV Show not found</h1>
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
      {show.backdrop_path && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-center bg-no-repeat bg-cover"
            style={{
              backgroundImage: `url(${getBackdropUrl(show.backdrop_path, "original")})`,
              backgroundPosition: "center 15%",
            }}
          >
            {/* Horizontal gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />

            {/* Bottom gradient for content readability */}
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
              {showPlayer && !showError && timeoutWarning && (
                <div className="mt-3 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-sm flex items-center justify-between">
                  <span>Player seems blocked or slow. You can switch source or open in a new tab.</span>
                  <div className="flex gap-2">
                    <button onClick={handleDomainSwitch} className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs">Switch source</button>
                    <a href={embedUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs">Open in new tab</a>
                  </div>
                </div>
              </div>

                {/* Show Info */}
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    {show?.name}
                  </h1>
                  {/* ... (rest of the code remains the same) */}

                  {/* ... (rest of the code remains the same) */}

                  {/* Because you liked … (TV) */}
                  <section className="container mx-auto px-4 pb-10">
                    <h2 className="text-xl font-semibold text-white mb-3">Because you liked {show?.name}</h2>
                    {similarLoading ? (
                      <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300 inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                        <span>Loading recommendations…</span>
                      </div>
                    ) : similarItems.length > 0 ? (
                      <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4">
                          {similarItems.map((s, idx) => (
                            <div key={`simtv-${idx}-${s.type}-${s.item.id}`} className="relative shrink-0 w-40 sm:w-48 md:w-52">
                              {s.reason && (
                                <div className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-black/60 border border-emerald-400/30 text-emerald-200 backdrop-blur-md max-w-[85%] truncate" title={s.reason}>
                                  {s.reason}
                                </div>
                              )}
                              {/* @ts-ignore */}
                              <MovieCard item={s.item} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800 text-gray-300">No similar recommendations found.</div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ... (rest of the code remains the same) */}
      </div>
    </div>
  );
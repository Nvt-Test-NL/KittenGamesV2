"use client";
import React from 'react';
import { Star, Calendar, Play, Film, Tv } from 'lucide-react';
import { Movie, TVShow } from '../types/tmdb';
import { getPosterUrl } from '../utils/tmdb';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { addFavorite, removeFavorite, isFavorite } from '../utils/favorites';
import { upsertProgress } from '../utils/history';

interface MovieCardProps {
  item: Movie | TVShow;
  onClick?: () => void;
  rankNumber?: number; // optional big rank for Top 10 rails
  showMarkFinished?: boolean; // when true (e.g., in Continue Watching), show 'Klaar' quick action
}

const isMovie = (item: Movie | TVShow): item is Movie => {
  return 'title' in item;
};

export default function MovieCard({ item, onClick, rankNumber, showMarkFinished }: MovieCardProps) {
  const title = isMovie(item) ? item.title : item.name;
  const releaseDate = isMovie(item) ? item.release_date : item.first_air_date;
  const posterUrl = getPosterUrl(item.poster_path, 'w500');
  const itemType: 'movie' | 'tv' = isMovie(item) ? 'movie' : 'tv';
  const [fav, setFav] = useState(false);

  useEffect(() => {
    const typeKey: 'movie' | 'tv' = isMovie(item) ? 'movie' : 'tv';
    setFav(isFavorite(item.id, typeKey));
  }, [item]);

  const toggleFav = () => {
    const typeKey: 'movie' | 'tv' = isMovie(item) ? 'movie' : 'tv';
    if (fav) {
      removeFavorite(item.id, typeKey);
      setFav(false);
    } else {
      addFavorite(item.id, typeKey);
      setFav(true);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBA';
    return new Date(dateString).getFullYear().toString();
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  const href = `/movies/${isMovie(item) ? 'movie' : 'show'}/${item.id}`;

  return (
    <Link href={href} prefetch={false} className="group block">
      <div className="relative bg-slate-900/50 backdrop-blur-sm border border-slate-700/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 ease-out cursor-pointer hover:scale-[1.02] hover:border-slate-600/60 hover:ring-1 hover:ring-emerald-300/20">
      {/* Rank overlay */}
      {typeof rankNumber === 'number' && (
        <div className="absolute -left-1 -top-2 text-8xl md:text-9xl font-extrabold text-emerald-300/10 select-none pointer-events-none drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]">
          {rankNumber}
        </div>
      )}
      {/* Type Badge (compact in Top10: icon only) */}
      <div className="absolute top-3 left-3 z-20">
        <div className={`flex items-center ${rankNumber ? 'px-1.5 py-1' : 'px-2.5 py-1'} rounded-full text-xs font-medium backdrop-blur-md border transition-all duration-300 ${
          itemType === 'movie' 
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-300/30 group-hover:bg-cyan-500/30' 
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-300/30 group-hover:bg-emerald-500/30'
        }`}>
          {itemType === 'movie' ? (
            <Film className="w-3 h-3" />
          ) : (
            <Tv className="w-3 h-3" />
          )}
          {!rankNumber && <span className="ml-1">{itemType === 'movie' ? 'Movie' : 'Series'}</span>}
        </div>
      </div>

      {/* Rating Badge (hidden in Top10) */}
      {!rankNumber && (
        <div className="absolute top-3 right-3 z-20">
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-medium text-white border border-gray-600/40 group-hover:bg-black/80 transition-all duration-300">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span>{formatRating(item.vote_average)}</span>
          </div>
        </div>
      )}
      {rankNumber && (
        <div className="absolute top-3 right-3 z-20">
          <div className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-300/30 backdrop-blur-md">Plek {rankNumber}</div>
        </div>
      )}

      <div className="relative aspect-[2/3] overflow-hidden">
        <img src={posterUrl || ''} alt={title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        {/* Hover content only for non-Top10 variant */}
        {!rankNumber && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span className="font-medium">{formatDate(releaseDate)}</span>
                </div>
              </div>
              <p className="text-gray-200 text-xs leading-relaxed line-clamp-3 opacity-90">
                {item.overview || 'No description available.'}
              </p>
            </div>
          </div>
        )}
        {/* Favorite toggle (hidden in Top10) */}
        {!rankNumber && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFav(); }}
            className={`absolute bottom-2 right-2 z-10 px-2 py-1 rounded-full text-xs border transition-all backdrop-blur-md ${fav ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-slate-900/50 text-gray-300 border-slate-700/40 hover:border-emerald-300/30'}`}
            aria-label="Toggle favorite"
          >
            {fav ? '★ Fav' : '☆ Fav'}
          </button>
        )}

        {/* Quick action: bottom-left button. In Continue Watching we show 'Klaar'; else '▶ Verder' */}
        {!rankNumber && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                if (showMarkFinished) {
                  // dynamically import to avoid circular import issues
                  import('../utils/history').then(({ markFinished }) => {
                    markFinished(item.id, itemType);
                  }).catch(() => {});
                } else {
                  upsertProgress({ tmdbId: item.id, type: itemType, lastPositionSec: 30 });
                }
              } catch {}
            }}
            className={`absolute bottom-2 left-2 z-10 px-2 py-1 rounded-full text-xs border transition-all backdrop-blur-md ${showMarkFinished ? 'bg-emerald-600/20 text-emerald-200 border-emerald-400/30' : 'bg-slate-900/50 text-gray-300 border-slate-700/40 hover:border-emerald-300/30'}`}
            aria-label={showMarkFinished ? 'Markeer als klaar' : 'Markeer als bezig'}
            title={showMarkFinished ? 'Verplaats naar Al gekeken' : 'Markeer als bezig (Verder kijken)'}
          >
            {showMarkFinished ? 'Klaar' : '▶ Verder'}
          </button>
        )}

        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-out" />
      </div>

      {/* Footer: hidden for Top10 rails to avoid long text blocks */}
      {!rankNumber && (
        <div className="p-4 space-y-2">
          <h3 className="text-white font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-gray-100 transition-colors duration-300">
            {title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
            <span className="font-medium">{formatDate(releaseDate)}</span>
            <div className="flex items-center space-x-1 opacity-80">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{formatRating(item.vote_average)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={`absolute inset-0 rounded-xl blur-xl -z-10 ${
          itemType === 'movie' ? 'bg-cyan-400/10' : 'bg-emerald-400/10'
        }`} />
      </div>
      </div>
    </Link>
  );
}
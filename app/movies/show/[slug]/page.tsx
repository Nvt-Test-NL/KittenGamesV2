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
import { getFavorites } from "../../../../utils/favorites";
import { upsertProgress, getHistory } from "../../../../utils/history";
import axios from "axios";

export default function ShowDetail() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="movies" />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <h1 className="text-2xl font-bold text-white mb-4">Series page temporarily unavailable</h1>
        <button
          onClick={() => router.push('/movies')}
          className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white"
        >
          Back to Movies
        </button>
      </main>
    </div>
  );
}
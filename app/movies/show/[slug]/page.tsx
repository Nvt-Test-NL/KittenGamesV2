"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Header from "../../../../components/Header";

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
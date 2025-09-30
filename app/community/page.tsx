"use client"

import React from "react"
import Header from "../../components/Header"
import Link from "next/link"
import CommunityGeneralChat from "../../components/CommunityGeneralChat"
import { MessageCircle, PlaySquare, Info, Tv } from "lucide-react"

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="community" />
      <main className="container mx-auto px-4 pt-24 pb-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Community</h1>
          <p className="text-sm text-gray-400">Praat mee in het algemene kanaal en navigeer naar andere onderdelen.</p>
        </div>

        {/* General chat */}
        <CommunityGeneralChat />

        {/* Shortcuts */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Secties</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/chat" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 transition block">
              <div className="flex items-center gap-2 text-white font-medium"><MessageCircle className="w-4 h-4"/>Chats</div>
              <div className="text-xs text-gray-400 mt-1">Directe berichten en rooms</div>
            </Link>
            <Link href="/live" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 transition block">
              <div className="flex items-center gap-2 text-white font-medium"><Tv className="w-4 h-4"/>Live</div>
              <div className="text-xs text-gray-400 mt-1">Events, nieuws en vrienden</div>
            </Link>
            <Link href="/about" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 transition block">
              <div className="flex items-center gap-2 text-white font-medium"><Info className="w-4 h-4"/>About</div>
              <div className="text-xs text-gray-400 mt-1">Over CatGames</div>
            </Link>
            <Link href="/updates" className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:bg-slate-800/60 transition block">
              <div className="flex items-center gap-2 text-white font-medium"><PlaySquare className="w-4 h-4"/>Updates</div>
              <div className="text-xs text-gray-400 mt-1">Nieuw en changelog</div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

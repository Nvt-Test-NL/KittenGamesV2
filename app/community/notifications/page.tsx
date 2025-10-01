"use client"

import React from "react"
import Header from "../../../components/Header"

export default function CommunityNotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="community" />
      <main className="container mx-auto px-4 pt-24 pb-10 space-y-4">
        <h1 className="text-2xl font-bold text-white">Community notificaties</h1>
        <p className="text-sm text-gray-400">Hier komen straks meldingen en aankondigingen vanuit de community en moderators. (Placeholder)</p>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-gray-300 text-sm">
          Nog niets te tonen.
        </div>
      </main>
    </div>
  )
}

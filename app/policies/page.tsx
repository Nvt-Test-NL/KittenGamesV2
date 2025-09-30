"use client"

import React from "react"
import Header from "../../components/Header"

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="community" />
      <main className="container mx-auto px-4 pt-24 pb-12 space-y-6">
        <h1 className="text-3xl font-bold text-white">Beleiden</h1>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white mb-2">AI Beleid</h2>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Gebruik is bedoeld voor educatieve/entertainment doeleinden.</li>
            <li>Onzin/kwade opdrachten worden geblokkeerd; betaalacties altijd verboden.</li>
            <li>Vanaf 02-10 is voor Pjotter‑AI een gratis account vereist.</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white mb-2">Opslagbeleid</h2>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Lokale opslag voor voorkeuren, quests, en UI-instellingen (localStorage).</li>
            <li>Bij inloggen kunnen Favorites/History/Quests gesynchroniseerd worden naar Firestore.</li>
            <li>Je kunt inzage en verwijdering van jouw gegevens aanvragen; mail via About/Updates.</li>
            <li>Gevoelige velden worden nooit publiek gedeeld; profielen tonen enkel naam/e‑mail (optioneel) en zichtbaarheid.</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-xl font-semibold text-white mb-2">Chat & Community Regels</h2>
          <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
            <li>Geen beledigingen, haat, NSFW, spam of reclame.</li>
            <li>Respecteer privacy: deel geen persoonlijke gegevens.</li>
            <li>Moderatie kan berichten verwijderen of accounts beperken bij overtreding.</li>
            <li>Bij eerste post moet je akkoord gaan met de regels.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

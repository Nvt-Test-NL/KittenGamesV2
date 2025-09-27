"use client";
import React from "react";
import Header from "../../components/Header";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -bottom-20 -right-16 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <Header currentPage="about" />

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Hero */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-md">
            <div className="p-6 md:p-10">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                KittenGames — Reborn
              </h1>
              <p className="text-gray-300 max-w-3xl text-base md:text-lg">
                Van een eenvoudige Google Site naar een moderne app met AI‑assistent. Donkere UI, glas‑morfisme, en
                focus op plezier: spelen, kijken, ontdekken.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="grid lg:grid-cols-2 gap-6 mb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">Ons verhaal</h2>
            <p className="text-gray-300 leading-relaxed">
              KittenGames begon als CodingKittenGames — één pagina met vijf mini‑games voor vrienden. Daarna kwam
              KittenSchool (Google Site), vervolgens KittenGames V1 (eerste echte site), V2 (meer games, strakker), V3
              (mijn eerste Next.js‑build op Vercel). Het was nog rommelig, maar het ging ergens naartoe — en dat werd V4.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-3">Reborn Time</h2>
            <p className="text-gray-300 leading-relaxed">
              V4 is ‘Reborn’: modern, sneller, met Pjotter‑AI aan boord. We omarmen een donkere look met
              glas‑morf‑accenten en zetten in op privacy‑vriendelijke features zoals lokale geschiedenis en watchlists.
            </p>
          </div>
        </section>

        {/* Design & Tech */}
        <section className="grid lg:grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Design</h3>
            <ul className="text-gray-300 space-y-1 list-disc list-inside">
              <li>Donker kleurenschema (geen blauw/wit)</li>
              <li>Glas‑morfisme en subtiele animaties</li>
              <li>Focus op rust & leesbaarheid</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Techniek</h3>
            <ul className="text-gray-300 space-y-1 list-disc list-inside">
              <li>Next.js (app router) + Tailwind</li>
              <li>Pjotter‑AI via OpenRouter</li>
              <li>TMDB voor films & series</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Toekomst</h3>
            <ul className="text-gray-300 space-y-1 list-disc list-inside">
              <li>Markdown antwoorden in Pjotter‑AI</li>
              <li>Meer interactieve lijsten en AI‑features</li>
              <li>Extra glass‑morf polish</li>
            </ul>
          </div>
        </section>

        {/* Credits */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Credits</h3>
          <p className="text-gray-300">
            Gemaakt door CondingKitten en Pjotters-Company. Feedback of ideeën? Laat het ons weten via de Updates‑pagina of de
            Request‑knop in de navigatie.
          </p>
        </section>
      </main>
    </div>
  );
}

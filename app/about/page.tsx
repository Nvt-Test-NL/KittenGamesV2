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
              Helaas hebben we ook in deze tijd afscheid moeten nemen van de starter van deze site: CodingKittenGames.
              We willen graag onze hartelijke dank uiten voor de tijd die jij besteedde aan deze site en de jij gemaakte
              momenten. We hopen dat jij nog steeds een plezier vindt in de games die we hier hebben. Gelukkig stoppen we niet
              volledig, maar de site is overgenomen door de Pjotter-Company.
            </p>
          </div>
        </section>

        {/* In Memoriam */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            {/* subtle glow */}
            <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 bg-emerald-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 w-64 h-64 bg-cyan-500/10 blur-[110px]" />
            <div className="relative p-6 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="px-2 py-0.5 text-xs rounded-full bg-emerald-400/15 border border-emerald-300/20 text-emerald-200 backdrop-blur-md">Tribute</div>
                <h2 className="text-2xl md:text-3xl font-semibold text-white">In Memoriam — CodingKittenGames</h2>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-4xl">
                V4 is ‘Reborn’: modern, sneller, met Pjotter‑AI aan boord. We omarmen een donkere look met
                glas‑morf‑accenten en zetten in op privacy‑vriendelijke features zoals lokale geschiedenis en watchlists. 
                Helaas hebben we ook in deze tijd afscheid moeten nemen van de starter van deze site: CodingKittenGames.
                We willen graag onze hartelijke dank uiten voor de tijd die jij besteedde aan deze site en de jij gemaakte
                momenten. We hopen dat jij nog steeds een plezier vindt in de games die we hier hebben. Gelukkig stoppen we niet
                volledig, maar de site is overgenomen door de Pjotter-Company.
              </p>

              {/* Mini timeline + gallery */}
              <div className="mt-6 grid md:grid-cols-2 gap-6">
                {/* Timeline */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="text-white font-semibold mb-3">Memorable Moments</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li><span className="text-emerald-300">V1</span> — Eerste echte site, de basis werd gelegd.</li>
                    <li><span className="text-emerald-300">V2</span> — Meer games, strakkere UI, groeiende community.</li>
                    <li><span className="text-emerald-300">V3</span> — Eerste Next.js‑build op Vercel, grote stap vooruit.</li>
                    <li><span className="text-emerald-300">V4 Reborn</span> — Donker, glas‑morf, Pjotter‑AI aan boord.</li>
                  </ul>
                </div>

                {/* Gallery with soft auto-scroll */}
                <GalleryStrip />
              </div>
            </div>
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
            Gemaakt door CodingKitten en Pieter. Feedback of ideeën? Laat het ons weten via de Updates‑pagina of de
            Request‑knop in de navigatie.
          </p>
        </section>
      </main>
    </div>
  );
}

function GalleryStrip() {
  const stripRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const el = stripRef.current
    if (!el) return
    let dir = 1
    const tick = () => {
      if (!el) return
      if (el.matches(':hover')) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const nearEnd = el.scrollLeft >= max - 8
      const nearStart = el.scrollLeft <= 8
      if (nearEnd) dir = -1
      if (nearStart) dir = 1
      el.scrollBy({ left: dir * 2, behavior: 'smooth' })
    }
    const id = window.setInterval(tick, 50)
    return () => window.clearInterval(id)
  }, [])

  const items = [
    { title: 'V1', sub: 'De start — eerste site' },
    { title: 'V2', sub: 'Meer games, strak UI' },
    { title: 'V3', sub: 'Next.js + Vercel' },
    { title: 'V4', sub: 'Reborn + Pjotter‑AI' },
    { title: 'Community', sub: 'Feedback & groei' },
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div ref={stripRef} className="flex gap-3 overflow-x-auto pb-2">
        {items.map((it, i) => (
          <div key={i} className="shrink-0 w-40 rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-md p-3">
            <div className="text-emerald-300 font-semibold">{it.title}</div>
            <div className="text-gray-300 text-sm">{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

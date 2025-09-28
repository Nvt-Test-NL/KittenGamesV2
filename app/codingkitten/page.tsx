"use client";
import React from "react";
import Header from "../../components/Header";

export default function CodingKittenPage() {
  const UNLOCK_KEY = "ck_credit_unlocked_v1";
  const [unlocked, setUnlocked] = React.useState<boolean>(false);
  const [showModal, setShowModal] = React.useState<boolean>(false);

  React.useEffect(() => {
    try { setUnlocked(localStorage.getItem(UNLOCK_KEY) === "true"); } catch {}
  }, []);

  const onVideoEnded = () => {
    try { localStorage.setItem(UNLOCK_KEY, "true"); } catch {}
    setUnlocked(true);
    setShowModal(false);
  };
  return (
    <div className="min-h-screen bg-gray-950 relative">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -bottom-20 -right-16 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <Header currentPage="codingkitten" />

      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Title */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-md">
            <div className="p-6 md:p-10">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                In Memoriam — CodingKittenGames
              </h1>
              <p className="text-gray-300 max-w-3xl text-base md:text-lg">
                Dank voor het fundament dat je hebt gelegd. Deze pagina is een blijvende herinnering aan de reis
                en de community die daardoor is ontstaan.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">
                  Bekijk de CodingKitten credit video
                </button>
                {unlocked ? (
                  <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-300/30">
                    Ontgrendeld: All games + Pjotter‑AI
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Kijk de video helemaal uit om te ontgrendelen</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tribute Body */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md">
            <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 bg-emerald-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-12 w-64 h-64 bg-cyan-500/10 blur-[110px]" />
            <div className="relative p-6 md:p-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="px-2 py-0.5 text-xs rounded-full bg-emerald-400/15 border border-emerald-300/20 text-emerald-200 backdrop-blur-md">Tribute</div>
                <h2 className="text-2xl md:text-3xl font-semibold text-white">Reborn — met respect voor het origineel</h2>
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

                {/* Gallery */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <div className="flex gap-3 overflow-x-auto pb-2" data-autoscroll="true">
                    {["V1", "V2", "V3", "V4", "Community"].map((label, i) => (
                      <div key={i} className="shrink-0 w-40 rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur-md p-3">
                        <div className="text-emerald-300 font-semibold">{label}</div>
                        <div className="text-gray-300 text-sm">Blijvende herinnering</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Credits */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Credits</h3>
          <p className="text-gray-300">
            Gemaakt door CodingKitten en Pieter. Deze pagina eert het verleden en kijkt vooruit.
          </p>
        </section>
      </main>

      {/* Video Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowModal(false)} />
          <div className="relative z-10 w-[95%] max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-2xl">
            <h2 className="text-white font-semibold mb-3">CodingKitten Credit Video</h2>
            <p className="text-gray-300 text-sm mb-2">Kijk de volledige video om All games en Pjotter‑AI te ontgrendelen.</p>
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
              {/* TODO: vervang de src door jouw definitieve video-URL */}
              <video controls className="w-full h-full" onEnded={onVideoEnded}>
                <source src="/videos/codingkitten-credit.mp4" type="video/mp4" />
                Je browser ondersteunt geen HTML5 video.
              </video>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Je moet de video volledig uitkijken.</span>
              <button onClick={()=>setShowModal(false)} className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

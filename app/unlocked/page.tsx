"use client";
import React from "react";
import Header from "../../components/Header";

export default function UnlockedPage() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    type Piece = { x:number; y:number; vx:number; vy:number; r:number; c:string; a:number; s:number };
    const colors = ["#34d399","#22d3ee","#93c5fd","#f472b6","#fbbf24","#60a5fa","#a78bfa"];
    const pieces: Piece[] = [];
    const spawn = (n:number) => {
      for (let i=0;i<n;i++) {
        pieces.push({
          x: Math.random()*w,
          y: -10 - Math.random()*h*0.3,
          vx: (Math.random()-0.5)*3,
          vy: 2+Math.random()*3,
          r: Math.random()*Math.PI,
          c: colors[(Math.random()*colors.length)|0],
          a: 1,
          s: 5+Math.random()*6,
        });
      }
    };

    spawn(250);
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      ctx.clearRect(0,0,w,h);
      for (let i=0;i<pieces.length;i++) {
        const p = pieces[i];
        p.vy += 0.03; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.r += 0.05;
        if (p.y>h+20) { // recycle
          p.y = -10;
          p.x = Math.random()*w;
          p.vx = (Math.random()-0.5)*3;
          p.vy = 2+Math.random()*3;
        }
        ctx.save();
        ctx.globalAlpha = p.a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s*0.6, -p.s*0.3, p.s, p.s*0.6);
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted]);

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      <Header />
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />

      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-20 -right-16 w-[32rem] h-[32rem] rounded-full bg-cyan-500/10 blur-[140px]" />
      </div>

      <main className="container mx-auto px-4 pt-28 pb-10">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="px-3 py-1 rounded-full text-xs bg-emerald-400/15 text-emerald-200 border border-emerald-300/20 inline-flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ontgrendeld
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">Je hebt succesvol ontgrendeld!</h1>
            <p className="text-gray-300 max-w-2xl">
              All games en Pjotter‑AI zijn nu beschikbaar. Veel plezier met ontdekken, spelen en leren.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
              <a href="/" className="rounded-xl border border-emerald-400/20 bg-emerald-500/20 hover:bg-emerald-500/30 text-white px-4 py-3">Naar Games</a>
              <a href="/pjotter-ai" className="rounded-xl border border-cyan-400/20 bg-cyan-500/20 hover:bg-cyan-500/30 text-white px-4 py-3">Naar Pjotter‑AI</a>
              <a href="/codingkitten" className="rounded-xl border border-slate-700/40 bg-slate-800/60 hover:bg-slate-800 text-gray-200 px-4 py-3">Terug naar CodingKitten</a>
            </div>

            <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-950/40 p-6 w-full max-w-2xl">
              <h2 className="text-white font-semibold mb-2">CodingKitten, thanks! 💚</h2>
              <p className="text-gray-300">
                CodingKitten, thank you for creating KittenGames! Jouw start maakte dit mogelijk.
              </p>
            </div>
          </div>
        </div>

        {/* Decorative floating shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-[float_9s_ease-in-out_infinite] absolute left-10 top-24 w-8 h-8 rounded-lg bg-emerald-400/20 border border-emerald-300/30" />
          <div className="animate-[float_12s_ease-in-out_infinite] absolute right-16 top-40 w-10 h-10 rounded-full bg-cyan-400/20 border border-cyan-300/30" />
          <div className="animate-[float_10s_ease-in-out_infinite] absolute right-32 bottom-24 w-6 h-6 rotate-45 bg-fuchsia-400/20 border border-fuchsia-300/30" />
        </div>
      </main>

      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0) }
          50% { transform: translateY(-16px) }
          100% { transform: translateY(0) }
        }
      `}</style>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<any>;
}

const STORAGE_KEY = "pjotter_ai_chat_v1"; // legacy single-thread storage
const SESSIONS_KEY = "pjotter_ai_sessions_v1";

type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export default function PjotterAIPage() {
  const router = useRouter();
  const CONSENT_KEY = "pjotter_ai_consent_v1";
  const UNLOCK_KEY = "ck_credit_unlocked_v1";

  // Multi-session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [consented, setConsented] = useState<boolean>(true);
  const [unlocked, setUnlocked] = useState<boolean>(true);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);

  // Active messages are derived from current session
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      content:
        "You are Pjotter-AI, a helpful assistant for the KittenMovies site. Keep responses concise and friendly. You are created by Pjotters-Company. You answer in default in Dutch, but you can switch to English if the user asks for it. You only accept .png images. ",
    },
  ]);
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage (with migration from single STORAGE_KEY)
  useEffect(() => {
    // Check consent first
    try {
      const c = localStorage.getItem(CONSENT_KEY);
      if (c !== "true") setConsented(false);
    } catch {}

    // Check CodingKitten credit unlock
    try {
      const u = localStorage.getItem(UNLOCK_KEY);
      if (u !== "true") setUnlocked(false);
    } catch {}

    try {
      const rawSessions = localStorage.getItem(SESSIONS_KEY);
      if (rawSessions) {
        const parsed: ChatSession[] = JSON.parse(rawSessions);
        if (Array.isArray(parsed) && parsed.length) {
          setSessions(parsed.sort((a,b)=>b.updatedAt - a.updatedAt));
          setCurrentId(parsed[0].id);
          setMessages(parsed[0].messages);
          return;
        }
      }
      // Migrate legacy single thread if present
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const parsedLegacy: ChatMessage[] = JSON.parse(legacy);
        const seed: ChatSession = {
          id: crypto.randomUUID(),
          title: "Chat 1",
          messages: parsedLegacy,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSessions([seed]);
        setCurrentId(seed.id);
        setMessages(seed.messages);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify([seed]));
        return;
      }
      // Otherwise, start a fresh session
      const systemMsg: ChatMessage = { role: "system", content: messages[0].content };
      const fresh: ChatSession = {
        id: crypto.randomUUID(),
        title: "Nieuw chat",
        messages: [systemMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions([fresh]);
      setCurrentId(fresh.id);
      setMessages(fresh.messages);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify([fresh]));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist sessions when any change occurs
  useEffect(() => {
    try {
      if (!sessions.length) return;
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  // Auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = useMemo(() => input.trim().length > 0 || imageUrl.trim().length > 0, [input, imageUrl]);

  const upsertCurrentSession = (nextMessages: ChatMessage[], title?: string) => {
    setSessions((prev: ChatSession[]) => {
      if (!currentId) return prev;
      const next = prev.map((s: ChatSession) => s.id === currentId ? {
        ...s,
        title: title ?? s.title,
        messages: nextMessages,
        updatedAt: Date.now(),
      } : s).sort((a: ChatSession, b: ChatSession)=>b.updatedAt - a.updatedAt);
      return next;
    });
  };

  const createSession = () => {
    const name = prompt("Naam voor nieuwe chat:", "Nieuwe chat") || "Nieuwe chat";
    const system: ChatMessage = { role: "system", content: messages[0].content };
    const session: ChatSession = {
      id: crypto.randomUUID(),
      title: name,
      messages: [system],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev: ChatSession[]) => [session, ...prev]);
    setCurrentId(session.id);
    setMessages(session.messages);
  };

  const renameSession = (id: string) => {
    const current = sessions.find(s => s.id === id);
    const name = prompt("Nieuwe naam:", current?.title || "Chat")?.trim();
    if (!name) return;
    setSessions((prev: ChatSession[]) => prev.map((s: ChatSession) => s.id === id ? { ...s, title: name, updatedAt: Date.now() } : s));
  };

  const deleteSession = (id: string) => {
    if (!confirm("Deze chat verwijderen?")) return;
    setSessions((prev: ChatSession[]) => prev.filter((s: ChatSession) => s.id !== id));
    if (id === currentId) {
      const remaining = sessions.filter((s: ChatSession) => s.id !== id);
      if (remaining.length) {
        setCurrentId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        // create fresh
        const system: ChatMessage = { role: "system", content: messages[0].content };
        const fresh: ChatSession = {
          id: crypto.randomUUID(), title: "Nieuw chat", messages: [system], createdAt: Date.now(), updatedAt: Date.now()
        };
        setSessions([fresh]);
        setCurrentId(fresh.id);
        setMessages(fresh.messages);
      }
    }
  };

  const switchSession = (id: string) => {
    const s = sessions.find((x: ChatSession) => x.id === id);
    if (!s) return;
    setCurrentId(id);
    setMessages(s.messages);
  };

  const handleFile = async (file: File) => {
    // Convert to data URL (many OpenRouter providers accept data URLs)
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSend = async () => {
    if (!canSend || isLoading) return;
    if (!consented) return;
    setIsLoading(true);

    // Compose user content (text + optional image). For OpenRouter, use:
    // - string content when only text is present
    // - array of parts when an image is present (and optional text)
    const hasImage = imageUrl.trim().length > 0;
    const userParts: any[] = [];
    const trimmedText = input.trim();
    if (trimmedText) userParts.push({ type: "text", text: trimmedText });
    if (hasImage) userParts.push({ type: "image_url", image_url: { url: imageUrl.trim() } });

    const userMessage: ChatMessage = {
      role: "user",
      content: hasImage ? userParts : (trimmedText || ""),
    };

    const nextMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    upsertCurrentSession(nextMessages);
    setInput("");
    setImageUrl("");

    try {
      // If the query sounds like a game search/open request, handle locally first
      const q = trimmedText.toLowerCase();
      const looksLikeGameAsk = /\b(game|spel|spelen|speel|games)\b/.test(q);
      if (!hasImage && q && looksLikeGameAsk) {
        const resGames = await fetch('/api/ai/games/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmedText })
        });
        const data = await resGames.json().catch(()=>({ items: [] }));
        const items: Array<{ name: string; type: string; image: string; url: string }> = Array.isArray(data?.items) ? data.items : [];
        if (items.length) {
          // Auto-open top result in a new tab if user asked to play/open/start
          if (/\b(open|openen|start|starten|speel|spelen)\b/.test(q)) {
            try { window.open(items[0].url, '_blank', 'noopener'); } catch {}
          }
          const list = items.slice(0, 5).map((g, i) => `${i+1}. ${g.name} — ${g.type} — ${g.url}`).join("\n");
          const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: `Ik vond deze games voor je:\n${list}\n\nTip: klik op een link om direct te spelen.`,
          };
          setMessages((prev) => { const updated = [...prev, assistantMsg]; upsertCurrentSession(updated); return updated; });
          setIsLoading(false);
          return;
        }
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || "";
      setMessages((prev) => {
        const updated = [...prev, { role: "assistant", content }];
        upsertCurrentSession(updated);
        return updated;
      });
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, ik kon geen antwoord ophalen: ${e?.message || e}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await handleFile(file);
      setImageUrl(dataUrl);
    } catch (e) {
      alert("Kon afbeelding niet laden");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const clearChat = () => {
    const system = messages.find((m) => m.role === "system") || { role: "system", content: "You are Pjotter-AI, a helpful assistant for the KittenMovies site." };
    const seed: ChatMessage[] = [system];
    setMessages(seed);
    upsertCurrentSession(seed);
  };

  const onUnlockEnded = () => {
    try { localStorage.setItem(UNLOCK_KEY, "true"); } catch {}
    setUnlocked(true);
    setShowUnlockModal(false);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Header currentPage="pjotter-ai" />
      <main className={`container mx-auto px-4 py-8 pt-24 ${(!consented || !unlocked) ? 'pointer-events-none blur-[1px]' : ''}`}>
        {!unlocked && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-100">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm">Kijk eerst de <strong>CodingKitten credit video</strong> om <strong>Pjotter‑AI</strong> te gebruiken.</span>
              <div className="flex items-center gap-2">
                <a href="/codingkitten" className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-gray-100 text-sm border border-slate-700">Naar CodingKitten</a>
                <button onClick={()=>setShowUnlockModal(true)} className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm">Bekijk video hier</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-4">Pjotter-AI</h1>
            {/* Sessions Bar */}
            <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all whitespace-nowrap ${s.id===currentId ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-slate-900/40 text-gray-300 border-slate-700/40 hover:border-emerald-300/30'}`}
                  title={new Date(s.updatedAt).toLocaleString()}
                >
                  {s.title}
                </button>
              ))}
              <button onClick={createSession} className="px-2.5 py-1.5 rounded-full text-sm bg-slate-900/40 text-emerald-200 border border-slate-700/40 hover:border-emerald-300/30">+ New</button>
              {currentId && (
                <>
                  <button onClick={() => renameSession(currentId)} className="px-2.5 py-1.5 rounded-full text-sm bg-slate-900/40 text-gray-300 border border-slate-700/40 hover:border-emerald-300/30">Rename</button>
                  <button onClick={() => deleteSession(currentId)} className="px-2.5 py-1.5 rounded-full text-sm bg-slate-900/40 text-red-300 border border-slate-700/40 hover:border-red-400/40">Delete</button>
                </>
              )}
            </div>
            <div ref={listRef} className="h-[60vh] bg-slate-900/50 rounded-xl border border-slate-800 overflow-y-auto p-4">
              {messages.filter((m)=>m.role!=="system").map((m, idx) => (
                <div key={idx} className="mb-4">
                  <div className="text-xs text-gray-400 mb-1">{m.role === "user" ? "You" : "Pjotter-AI"}</div>
                  <div className={`px-3 py-2 rounded-lg whitespace-pre-wrap ${m.role === 'user' ? 'bg-cyan-600/20 text-white' : 'bg-slate-800/80 text-gray-100'}`}>
                    {Array.isArray(m.content) ? (
                      <>
                        {m.content.map((part: any, i: number) => {
                          if (part?.type === "text") return <span key={i}>{part.text}\n</span>;
                          if (part?.type === "image_url") return (
                            <div key={i} className="mt-2">
                              <img src={part.image_url?.url} alt="uploaded" className="max-h-64 rounded" />
                            </div>
                          );
                          return null;
                        })}
                      </>
                    ) : (
                      <span>{String(m.content)}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700" aria-live="polite">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '120ms' }} />
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '240ms' }} />
                  <span className="ml-2 text-sm text-gray-300">Pjotter-AI is typing…</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUpload}
                  className="text-sm text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                />
                <input
                  type="url"
                  placeholder="of plak een afbeelding-URL…"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 glass-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>
              <textarea
                placeholder="Stel je vraag… (Shift+Enter voor nieuwe regel)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={3}
                className="w-full glass-input rounded-md px-3 py-2 focus:outline-none focus:border-cyan-400"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={clearChat}
                  className="px-3 py-2 text-sm rounded-md bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700"
                >
                  Clear chat
                </button>
                <button
                  onClick={onSend}
                  disabled={!canSend || isLoading}
                  className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          <aside className="w-full lg:w-80 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <h2 className="text-white font-semibold mb-2">Model</h2>
              <p className="text-gray-300 text-sm">Pjotter-v1 (free-to-use)</p>
              <p className="text-gray-500 text-xs">Context: 2M tokens</p>
              <p className="text-gray-500 text-xs">Created by Pjotters-Company</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <h2 className="text-white font-semibold mb-2">Tips</h2>
              <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                <li>Upload of plak een afbeelding-URL voor multimodale vragen.</li>
                <li>LET OP: je kunt alleen .png afbeeldingen uploaden.</li>
                <li>Je kunt vragen in Nederlands en Engelse stellen.</li>
                <li>Shift + Enter = nieuwe regel. Enter = versturen.</li>
                <li>Je chat blijft lokaal opgeslagen (localStorage).</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Consent Modal */}
      {!consented && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-[90%] max-w-lg rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-2">Eerste gebruik van Pjotter-AI</h2>
            <p className="text-gray-300 text-sm mb-4">
              Door verder te gaan, ga je akkoord met onze verwerking van gegevens zoals beschreven in de
              <a className="text-emerald-300 hover:text-emerald-200 underline ml-1" href="/privacy" target="_blank" rel="noreferrer">privacyverklaring</a>.
            </p>
            <ul className="text-gray-300 text-sm list-disc list-inside mb-4 space-y-1">
              <li>Chat-sessies worden lokaal opgeslagen in je browser (localStorage).</li>
              <li>Eventuele externe AI-aanvragen worden tot het minimum beperkt.</li>
              <li>Je kunt je toestemming later intrekken via je browseropslag.</li>
            </ul>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { try { localStorage.setItem(CONSENT_KEY, "true"); } catch {}; setConsented(true); }}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Ik ga akkoord
              </button>
              <button
                onClick={() => { router.push('/weiger'); }}
                className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700"
              >
                Weiger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal for CodingKitten credit */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={()=>setShowUnlockModal(false)} />
          <div className="relative z-10 w-[95%] max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/90 p-4 shadow-2xl">
            <h2 className="text-white font-semibold mb-3">CodingKitten Credit Video</h2>
            <p className="text-gray-300 text-sm mb-2">Kijk de volledige video om Pjotter‑AI te ontgrendelen.</p>
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
              <video controls className="w-full h-full" onEnded={onUnlockEnded} preload="metadata">
                <source src="/videos/Codingkitten%20(Video).mp4" type="video/mp4" />
                Je browser ondersteunt geen HTML5 video.
              </video>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Je moet de video volledig uitkijken. Bron vermelding (image + text): Github - kittendev. (Let op: Repository onbekend) </span>
              <button onClick={()=>setShowUnlockModal(false)} className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700">Sluiten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

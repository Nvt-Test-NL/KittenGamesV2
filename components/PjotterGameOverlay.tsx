"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  gameName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<any>;
}

export default function PjotterGameOverlay({ gameName, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "system",
      content:
        `Je bent Pjotter-AI voor KittenGames. Help kort en concreet. De huidige game is: ${gameName}. Als er een screenshot is meegegeven, gebruik dat voor context. Antwoord in het Nederlands.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [permissionNeeded, setPermissionNeeded] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Try to capture one frame via getDisplayMedia, with user consent
    const tryCapture = async () => {
      try {
        // Ask only once per open
        setPermissionNeeded(false);
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        // Wait a tick to have current frame
        await new Promise(r => setTimeout(r, 250));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const data = canvas.toDataURL('image/png');
          setImageUrl(data);
        }
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      } catch (e) {
        setPermissionNeeded(true);
      }
    };
    tryCapture();
  }, [isOpen]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const onSend = async () => {
    if (!input.trim() && !imageUrl) return;
    if (isLoading) return;
    setIsLoading(true);
    const userParts: any[] = [];
    if (input.trim()) userParts.push({ type: 'text', text: input.trim() });
    if (imageUrl) userParts.push({ type: 'image_url', image_url: { url: imageUrl }});
    const next: ChatMessage[] = [...messages, { role: 'user', content: userParts.length>1 ? userParts : (input.trim() || "") }];
    setMessages(next);
    setInput("");
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(()=>({choices:[{message:{content:"(geen antwoord)"}}]}));
      const content = data?.choices?.[0]?.message?.content || "";
      setMessages((prev)=>[...prev, { role:'assistant', content }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full md:w-[720px] mx-2 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white font-semibold">Pjotter‑AI Games • {gameName}</div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        {permissionNeeded && (
          <div className="mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">
            Pjotter‑AI wil voor de chat een screenshot maken zodat hij weet waar je mee bezig bent. Geef toestemming in de browser prompt of ga verder zonder screenshot.
          </div>
        )}
        <div className="h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-3 mb-3">
          {messages.filter(m=>m.role!=="system").map((m, i) => (
            <div key={i} className="mb-3">
              <div className="text-[11px] text-gray-400 mb-1">{m.role === 'user' ? 'Jij' : 'Pjotter‑AI'}</div>
              <div className={`px-3 py-2 rounded-lg whitespace-pre-wrap ${m.role === 'user' ? 'bg-cyan-600/20 text-white' : 'bg-slate-800/80 text-gray-100'}`}>
                {Array.isArray(m.content) ? (
                  <>
                    {m.content.map((part: any, idx: number) => {
                      if (part?.type === 'text') return <span key={idx}>{part.text}\n</span>;
                      if (part?.type === 'image_url') return (
                        <div key={idx} className="mt-2">
                          <img src={part.image_url?.url} alt="screenshot" className="max-h-48 rounded" />
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
            <div className="text-xs text-gray-400">Pjotter‑AI is aan het nadenken…</div>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e)=>setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Stel je vraag…"
            className="flex-1 glass-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
          />
          <button onClick={onSend} disabled={isLoading || (!input.trim() && !imageUrl)} className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white">
            Verstuur
          </button>
        </div>
      </div>
    </div>
  );
}

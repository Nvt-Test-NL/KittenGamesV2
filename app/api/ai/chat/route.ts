import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/chat
// Body: { messages: { role: 'system'|'user'|'assistant', content: string | Array<any> }[] }
// Uses OpenRouter: try x-ai/grok-4-fast:free then fall back to deepseek/deepseek-chat-v3.1:free
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY missing. Set it in Vercel Project Environment to enable chat." },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages } = body || {};
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }

  // Normalize messages: convert any multi-part (text + image_url) into plain text
  // so the selected model (which may not be vision-capable) can respond.
  const normalized = messages.map((m: any) => {
    const role = m?.role;
    const content = m?.content;
    if (Array.isArray(content)) {
      const texts: string[] = [];
      for (const part of content) {
        if (part?.type === 'text' && typeof part?.text === 'string') {
          texts.push(part.text);
        } else if (part?.type === 'image_url') {
          texts.push('[screenshot provided]');
        }
      }
      return { role, content: texts.join('\n') };
    }
    return { role, content: typeof content === 'string' ? content : '' };
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || undefined;

  const doRequest = async (model: string) => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(siteUrl ? { "HTTP-Referer": siteUrl, "X-Title": "KittenMovies" } : {}),
      },
      body: JSON.stringify({
        model,
        messages: normalized,
        temperature: 0.7,
      }),
      cache: "no-store",
    });
    return res;
  };

  const tryWithRetry = async (model: string, attempts = 2) => {
    let lastText = "";
    for (let i = 0; i < attempts; i++) {
      const res = await doRequest(model);
      if (res.ok) return res;
      lastText = await res.text();
      // 429/5xx: small backoff then retry
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      // non-retryable
      return new Response(lastText, { status: res.status });
    }
    return new Response(lastText || "Failed after retries", { status: 502 });
  };

  try {
    // 1) Try Grok first
    let res = await tryWithRetry("x-ai/grok-4-fast:free", 2);
    if (!res.ok) {
      // 2) Fallback to DeepSeek V3.1 (free)
      res = await tryWithRetry("deepseek/deepseek-chat-v3.1:free", 2);
    }
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "OpenRouter error", detail: text, status: res.status }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to reach OpenRouter", detail: String(err) }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/chat
// Body: { messages: { role: 'system'|'user'|'assistant', content: string | Array<any> }[] }
// Uses OpenRouter with x-ai/grok-4-fast:free
export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server." },
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || undefined;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(siteUrl ? { "HTTP-Referer": siteUrl, "X-Title": "KittenMovies" } : {}),
      },
      body: JSON.stringify({
        model: "x-ai/grok-4-fast:free",
        messages,
        // keep temperature modest for chat
        temperature: 0.7,
        // disable reasoning mode unless requested explicitly
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "OpenRouter error", detail: text, status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to reach OpenRouter", detail: String(err) },
      { status: 502 }
    );
  }
}

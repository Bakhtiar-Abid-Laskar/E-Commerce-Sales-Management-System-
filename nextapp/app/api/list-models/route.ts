import { NextRequest, NextResponse } from "next/server";

// GET /api/list-models — lists models available for your API key
export async function GET(req: NextRequest) {
  // ─── Require authentication ────────────────────────────────────────────────────
  const { requireAuth } = await import("@/lib/auth/middleware");
  const authResult = await requireAuth(req);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error?.message }, { status: res.status });
  }

  // Return only models that support generateContent
  const usable = (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes("generateContent")
    )
    .map((m: { name: string; displayName?: string }) => ({
      id: m.name.replace("models/", ""),
      displayName: m.displayName ?? m.name,
    }));

  return NextResponse.json({ models: usable });
}

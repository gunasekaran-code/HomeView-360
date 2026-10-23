import { connection } from "next/server";
import { getProvider } from "@/lib/tts/providers";

/** Tells the client whether a neural TTS provider is configured. */
export async function GET() {
  await connection();
  const provider = getProvider();
  return Response.json(
    { enabled: Boolean(provider), provider: provider?.name ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

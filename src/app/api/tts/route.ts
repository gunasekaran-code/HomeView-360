import { connection, type NextRequest } from "next/server";
import { narration } from "@/config/narration";
import { getProvider } from "@/lib/tts/providers";
import { defaultCharacterId, getCharacter, isCharacterId } from "@/config/voices";
import type { Lang, NarrationTrackId } from "@/types/tour";

/**
 * GET /api/tts?lang=ta&voice=pallavi&track=kitchen&i=2
 *
 * Synthesises one narration sentence with the configured neural TTS
 * provider. Only sentences from the narration script can be requested, so
 * the endpoint cannot be used as an open TTS proxy on the owner's API key.
 */

const cache = new Map<string, ArrayBuffer>();

export async function GET(request: NextRequest) {
  await connection();
  const provider = getProvider();
  if (!provider) return Response.json({ error: "TTS provider not configured" }, { status: 501 });

  const params = request.nextUrl.searchParams;
  const lang = params.get("lang") as Lang | null;
  const track = params.get("track") as NarrationTrackId | null;
  const index = Number(params.get("i"));
  const voice = params.get("voice");
  const character = getCharacter(isCharacterId(voice) ? voice : defaultCharacterId);
  if (!lang || !(lang in narration) || !track || !(track in narration[lang]) || !Number.isInteger(index)) {
    return Response.json({ error: "Unknown narration segment" }, { status: 400 });
  }
  const segment = narration[lang][track][index];
  if (!segment) return Response.json({ error: "Unknown narration segment" }, { status: 400 });

  const key = `${provider.name}:${character.id}:${lang}:${track}:${index}`;
  try {
    let audio = cache.get(key);
    if (!audio) {
      audio = await provider.synthesize(segment.text, lang, character);
      cache.set(key, audio);
    }
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Speech synthesis failed" }, { status: 502 });
  }
}

import "server-only";
import type { Lang } from "@/types/tour";
import type { VoiceCharacter } from "@/config/voices";

/**
 * Optional live text-to-speech providers. Configure ONE via environment
 * variables (server-side only — keys never reach the browser):
 *
 *   TTS_PROVIDER=azure       AZURE_SPEECH_KEY=…  AZURE_SPEECH_REGION=centralindia
 *                            (same Tamil Nadu voices as the pre-rendered clips: src/config/voices.ts)
 *   TTS_PROVIDER=google      GOOGLE_TTS_API_KEY=…  [GOOGLE_TTS_VOICE_TA_FEMALE=…, …_TA_MALE, …_EN_FEMALE, …_EN_MALE]
 *   TTS_PROVIDER=elevenlabs  ELEVENLABS_API_KEY=…  ELEVENLABS_VOICE_ID=…  [ELEVENLABS_VOICE_ID_MALE=…]
 *
 * Without configuration the client uses the pre-rendered clips instead.
 */

export type ProviderName = "google" | "azure" | "elevenlabs";

interface Provider {
  name: ProviderName;
  synthesize(text: string, lang: Lang, character: VoiceCharacter): Promise<ArrayBuffer>;
}

const env = (key: string) => process.env[key]?.trim() || undefined;

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

async function ensureOk(res: Response, provider: string) {
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`${provider} TTS failed (${res.status}) ${detail}`);
  }
  return res;
}

const google = (key: string): Provider => ({
  name: "google",
  async synthesize(text, lang, character) {
    const male = character.gender === "male";
    const locale = lang === "ta" ? "ta-IN" : "en-IN";
    const fallback = `${locale}-Wavenet-${male ? "B" : "A"}`;
    const voice = { languageCode: locale, name: env(`GOOGLE_TTS_VOICE_${lang.toUpperCase()}_${character.gender.toUpperCase()}`) ?? fallback };
    const res = await ensureOk(
      await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { text }, voice, audioConfig: { audioEncoding: "MP3", speakingRate: 0.95 } }),
      }),
      "Google",
    );
    const { audioContent } = (await res.json()) as { audioContent: string };
    const bytes = Buffer.from(audioContent, "base64");
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  },
});

const azure = (key: string, region: string): Provider => ({
  name: "azure",
  async synthesize(text, lang, character) {
    const voice = character.voices[lang];
    const locale = voice.slice(0, 5); // a ta-IN voice reads English in its own Tamil accent
    const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}"><prosody rate="${character.rate[lang]}">${escapeXml(text)}</prosody></voice></speak>`;
    const res = await ensureOk(
      await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
          "User-Agent": "home-360",
        },
        body: ssml,
      }),
      "Azure",
    );
    return res.arrayBuffer();
  },
});

const elevenlabs = (key: string, voiceId: string, maleVoiceId: string): Provider => ({
  name: "elevenlabs",
  async synthesize(text, _lang, character) {
    const id = character.gender === "male" ? maleVoiceId : voiceId;
    const res = await ensureOk(
      await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text, model_id: env("ELEVENLABS_MODEL_ID") ?? "eleven_multilingual_v2" }),
      }),
      "ElevenLabs",
    );
    return res.arrayBuffer();
  },
});

export function getProvider(): Provider | null {
  switch (env("TTS_PROVIDER")?.toLowerCase()) {
    case "google": {
      const key = env("GOOGLE_TTS_API_KEY");
      return key ? google(key) : null;
    }
    case "azure": {
      const key = env("AZURE_SPEECH_KEY");
      const region = env("AZURE_SPEECH_REGION");
      return key && region ? azure(key, region) : null;
    }
    case "elevenlabs": {
      const key = env("ELEVENLABS_API_KEY");
      const voice = env("ELEVENLABS_VOICE_ID");
      return key && voice ? elevenlabs(key, voice, env("ELEVENLABS_VOICE_ID_MALE") ?? voice) : null;
    }
    default:
      return null;
  }
}

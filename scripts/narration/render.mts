/**
 * Pre-render the guide's narration with native Tamil Nadu neural voices, one
 * clip per sentence per character per language, so the voice guide works in
 * every browser with no runtime API key.
 *
 *   npm run narration:render
 *
 * Engine (chosen automatically):
 *   - Azure Speech (official, licensed for commercial use) when
 *     AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are set.
 *   - Otherwise edge-tts (same Microsoft neural voices, no key). Install with
 *     `python3 -m venv .venv-tts && .venv-tts/bin/pip install -r scripts/narration/requirements.txt`
 *     or point EDGE_TTS at an edge-tts binary.
 *
 * Writes public/audio/narration/<character>/<lang>/<track>-<n>.mp3 and manifest.json.
 * Requires ffmpeg.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { narration } from "../../src/config/narration.ts";
import { voiceCharacters } from "../../src/config/voices.ts";

type Lang = "ta" | "en";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outRoot = join(root, "public", "audio", "narration");
const work = mkdtempSync(join(tmpdir(), "narration-"));

const azureKey = process.env.AZURE_SPEECH_KEY?.trim();
const azureRegion = process.env.AZURE_SPEECH_REGION?.trim();
const engine = azureKey && azureRegion ? "azure" : "edge-tts";
const edgeBin = process.env.EDGE_TTS ?? (existsSync(join(root, ".venv-tts/bin/edge-tts")) ? join(root, ".venv-tts/bin/edge-tts") : "edge-tts");

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

async function synthesize(text: string, voice: string, rate: string, outFile: string) {
  if (engine === "azure") {
    const locale = voice.slice(0, 5); // e.g. "ta-IN": the voice reads English text in its own accent
    const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`;
    const res = await fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-96kbitrate-mono-mp3",
        "User-Agent": "home-360",
      },
      body: ssml,
    });
    if (!res.ok) throw new Error(`Azure ${res.status} (${locale}): ${(await res.text()).slice(0, 200)}`);
    writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
  } else {
    execFileSync(edgeBin, ["--voice", voice, `--rate=${rate}`, "--text", text, "--write-media", outFile], { stdio: "pipe" });
  }
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

const manifest: Record<string, Record<string, Record<string, { src: string; duration: number }[]>>> = {};
console.log(`engine: ${engine}`);

for (const character of voiceCharacters) {
  manifest[character.id] = {};
  for (const lang of ["ta", "en"] as Lang[]) {
    const dir = join(outRoot, character.id, lang);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    manifest[character.id][lang] = {};
    for (const [track, segments] of Object.entries(narration[lang])) {
      const clips = [];
      for (const [i, seg] of segments.entries()) {
        const raw = join(work, `${character.id}-${lang}-${track}-${i}.mp3`);
        const file = `${track}-${i}.mp3`;
        await withRetry(() => synthesize(seg.text, character.voices[lang], character.rate[lang], raw));
        // Even loudness across voices + a short breath between sentences.
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5,apad=pad_dur=0.3",
          "-ac", "1", "-ar", "24000", "-b:a", "64k", join(dir, file)]);
        const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
          join(dir, file)]).toString().trim());
        console.log(`${character.id}/${lang}/${file}  ${duration.toFixed(2)}s`);
        clips.push({ src: `/audio/narration/${character.id}/${lang}/${file}`, duration: Math.round(duration * 100) / 100 });
      }
      manifest[character.id][lang][track] = clips;
    }
  }
}

writeFileSync(
  join(outRoot, "manifest.json"),
  JSON.stringify(
    {
      engine,
      characters: Object.fromEntries(voiceCharacters.map((c) => [c.id, c.voices])),
      tracks: manifest,
    },
    null,
    2,
  ),
);
rmSync(work, { recursive: true, force: true });
console.log("manifest written");

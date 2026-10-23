import type { Lang, NarrationTrackId } from "@/types/tour";
import { defaultCharacterId, type VoiceCharacterId } from "@/config/voices";

export type VoiceEngine = "api" | "file" | "speech" | "subtitles";

export interface NarrationItem {
  track: NarrationTrackId;
  index: number;
  text: string;
}

export interface NarratorState {
  status: "idle" | "loading" | "playing" | "paused";
  lang: Lang;
  items: NarrationItem[];
  /** Index into `items` of the sentence being spoken. */
  position: number;
  engine: VoiceEngine;
  /** Which guide character (voice) narrates. */
  character: VoiceCharacterId;
  /** Incremented when a queue finishes naturally (not when stopped). */
  completed: number;
}

type Clip = { src: string; duration: number };
type Manifest = { tracks: Record<string, Record<Lang, Record<string, Clip[]>>> };

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

/**
 * Plays narration one sentence at a time so subtitles stay in sync, with a
 * fallback chain per sentence:
 *   neural TTS API (if configured) → pre-rendered clip → browser speech →
 *   timed subtitles only.
 */
export class Narrator {
  private audio: HTMLAudioElement | null = null;
  private manifest: Manifest | null = null;
  private apiEnabled = false;
  private run = 0; // invalidates callbacks from a previous queue
  private timer: ReturnType<typeof setTimeout> | null = null;
  private timerEndsAt = 0;
  private timerRemaining = 0;
  private muted = false;
  private listeners = new Set<(s: NarratorState) => void>();
  state: NarratorState = {
    status: "idle",
    lang: "en",
    items: [],
    position: 0,
    engine: "file",
    character: defaultCharacterId,
    completed: 0,
  };

  async init() {
    if (typeof window === "undefined") return;
    this.audio = new Audio();
    this.audio.preload = "auto";
    const [manifest, status] = await Promise.all([
      fetch("/audio/narration/manifest.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/tts/status").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    this.manifest = manifest;
    this.apiEnabled = Boolean(status?.enabled);
    this.set({ engine: this.apiEnabled ? "api" : manifest ? "file" : "speech" });
  }

  /** Must run inside a user gesture so later programmatic playback is allowed (iOS). */
  unlock() {
    const a = this.audio;
    if (!a) return;
    a.src = SILENT_WAV;
    a.play().catch(() => {});
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }

  subscribe(fn: (s: NarratorState) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private set(patch: Partial<NarratorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  /** Switches the guide's voice; takes effect from the next sentence played. */
  setCharacter(character: VoiceCharacterId) {
    this.set({ character });
  }

  play(lang: Lang, items: NarrationItem[]) {
    this.halt();
    const run = ++this.run;
    this.set({ lang, items, position: 0, status: "loading" });
    this.speak(run, 0);
  }

  pause() {
    if (this.state.status !== "playing" && this.state.status !== "loading") return;
    this.audio?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.timerRemaining = Math.max(0, this.timerEndsAt - Date.now());
    }
    this.set({ status: "paused" });
  }

  resume() {
    if (this.state.status !== "paused") return;
    const run = this.run;
    const { engine, position } = this.state;
    this.set({ status: "playing" });
    if ((engine === "api" || engine === "file") && this.audio?.src && !this.audio.ended) {
      this.audio.play().catch(() => this.speak(run, position));
    } else if (engine === "subtitles" && this.timerRemaining > 0) {
      this.startTimer(run, position, this.timerRemaining);
    } else {
      // Browser speech cannot resume reliably mid-sentence: restart the sentence.
      this.speak(run, position);
    }
  }

  stop() {
    this.run++;
    this.halt();
    this.set({ status: "idle", position: 0 });
  }

  replay() {
    if (this.state.items.length) this.play(this.state.lang, this.state.items);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.audio) this.audio.muted = muted;
  }

  dispose() {
    this.stop();
    this.listeners.clear();
  }

  private halt() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.audio) {
      this.audio.onended = this.audio.onerror = this.audio.onplaying = null;
      this.audio.pause();
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  private next(run: number, position: number) {
    if (run !== this.run) return;
    if (position + 1 >= this.state.items.length) {
      this.set({ status: "idle", position: 0, completed: this.state.completed + 1 });
      return;
    }
    this.speak(run, position + 1);
  }

  private speak(run: number, position: number) {
    const item = this.state.items[position];
    if (!item) return;
    this.set({ position });
    const { lang, character } = this.state;
    const clip = this.manifest?.tracks[character]?.[lang]?.[item.track]?.[item.index];
    const apiUrl = `/api/tts?lang=${lang}&voice=${character}&track=${encodeURIComponent(item.track)}&i=${item.index}`;

    const sources: { engine: VoiceEngine; src: string }[] = [];
    if (this.apiEnabled) sources.push({ engine: "api", src: apiUrl });
    if (clip) sources.push({ engine: "file", src: clip.src });

    const tryAudio = (i: number) => {
      if (run !== this.run) return;
      const source = sources[i];
      if (!source || !this.audio) return this.speakWithBrowser(run, position, item, clip?.duration);
      const a = this.audio;
      a.muted = this.muted;
      a.onplaying = () => run === this.run && this.set({ status: "playing", engine: source.engine });
      a.onended = () => this.next(run, position);
      a.onerror = () => tryAudio(i + 1);
      a.src = source.src;
      a.play().catch((err: DOMException) => {
        if (run !== this.run) return;
        // Autoplay blocked: wait for the user to press play instead of skipping ahead.
        if (err?.name === "NotAllowedError") this.set({ status: "paused", engine: source.engine });
        else tryAudio(i + 1);
      });
    };
    tryAudio(0);
  }

  private speakWithBrowser(run: number, position: number, item: NarrationItem, knownDuration?: number) {
    const lang = this.state.lang;
    const synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
    const voice = synth ? pickVoice(synth.getVoices(), lang) : null;
    if (!synth || !voice) {
      // No usable voice: keep the guide moving with timed subtitles.
      this.set({ status: "playing", engine: "subtitles" });
      this.startTimer(run, position, (knownDuration ?? estimateSeconds(item.text, lang)) * 1000);
      return;
    }
    const u = new SpeechSynthesisUtterance(item.text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = lang === "ta" ? 0.95 : 1;
    u.volume = this.muted ? 0 : 1;
    u.onstart = () => run === this.run && this.set({ status: "playing", engine: "speech" });
    u.onend = () => this.state.status === "playing" && this.next(run, position);
    u.onerror = (e) => {
      if (run !== this.run || e.error === "interrupted" || e.error === "canceled") return;
      this.set({ engine: "subtitles" });
      this.startTimer(run, position, estimateSeconds(item.text, lang) * 1000);
    };
    synth.speak(u);
  }

  private startTimer(run: number, position: number, ms: number) {
    this.timerEndsAt = Date.now() + ms;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.next(run, position);
    }, ms);
  }
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang) {
  const prefix = lang === "ta" ? "ta" : "en";
  const matches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  if (lang === "en") return matches.find((v) => /en-IN/i.test(v.lang)) ?? matches[0] ?? null;
  return matches[0] ?? null;
}

/** Rough reading time used when no voice is available. */
function estimateSeconds(text: string, lang: Lang) {
  return Math.max(2.5, text.length * (lang === "ta" ? 0.085 : 0.065));
}

/** True when the browser has a voice for the language (Web Speech fallback only). */
export function hasBrowserVoice(lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return Boolean(pickVoice(window.speechSynthesis.getVoices(), lang));
}

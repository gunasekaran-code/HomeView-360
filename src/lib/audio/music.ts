import { getAudioContext } from "./context";

export interface MusicState {
  enabled: boolean;
  volume: number; // 0..1
  muted: boolean;
  /** Toolbar "mute all" — independent of the music panel's own mute. */
  globalMuted: boolean;
  ducked: boolean;
  status: "idle" | "loading" | "ready" | "error";
}

/** Level the music drops to (relative) while the voice guide speaks. */
const DUCK_LEVEL = 0.2;
const FADE = 0.6;

/**
 * Looping background music on Web Audio. Gain nodes (not element.volume,
 * which iOS ignores) handle volume, mute, on/off fades and ducking.
 */
export class MusicPlayer {
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private loadPromise: Promise<void> | null = null;
  private listeners = new Set<(s: MusicState) => void>();
  state: MusicState = { enabled: true, volume: 0.5, muted: false, globalMuted: false, ducked: false, status: "idle" };

  constructor(private readonly url: string) {}

  subscribe(fn: (s: MusicState) => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  private set(patch: Partial<MusicState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    const ctx = getAudioContext();
    if (!ctx) {
      this.set({ status: "error" });
      return Promise.resolve();
    }
    this.set({ status: "loading" });
    this.loadPromise = fetch(this.url)
      .then((r) => {
        if (!r.ok) throw new Error(`music ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        this.buffer = buffer;
        this.set({ status: "ready" });
        if (this.state.enabled) this.start();
      })
      .catch((err) => {
        console.warn("Background music unavailable", err);
        this.loadPromise = null;
        this.set({ status: "error" });
      });
    return this.loadPromise;
  }

  private targetGain() {
    const { enabled, muted, globalMuted, volume, ducked } = this.state;
    if (!enabled || muted || globalMuted) return 0;
    return volume * volume * (ducked ? DUCK_LEVEL : 1); // perceptual curve
  }

  private applyGain(seconds = FADE) {
    const ctx = getAudioContext();
    if (!ctx || !this.gain) return;
    const g = this.gain.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(g.value, ctx.currentTime);
    g.linearRampToValueAtTime(this.targetGain(), ctx.currentTime + seconds);
  }

  private start() {
    const ctx = getAudioContext();
    if (!ctx || !this.buffer || this.source) return;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.loop = true;
    // MP3 encoder padding adds a few ms of silence at each end; loop past it.
    const [start, end] = trimSilence(this.buffer);
    src.loopStart = start;
    src.loopEnd = end;
    src.connect(this.gain);
    src.start(0, start);
    this.source = src;
    this.applyGain(1.5);
  }

  private stopSource() {
    const ctx = getAudioContext();
    const src = this.source;
    const gain = this.gain;
    if (!ctx || !src || !gain) return;
    this.source = null;
    this.gain = null;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
    src.stop(ctx.currentTime + FADE + 0.05);
    src.onended = () => gain.disconnect();
  }

  setEnabled(enabled: boolean) {
    this.set({ enabled });
    if (enabled) {
      if (this.buffer) this.start();
      else void this.load();
      this.applyGain();
    } else {
      this.stopSource();
    }
  }

  setVolume(volume: number) {
    this.set({ volume: Math.min(1, Math.max(0, volume)) });
    this.applyGain(0.15);
  }

  setMuted(muted: boolean) {
    this.set({ muted });
    this.applyGain(0.3);
  }

  setGlobalMuted(globalMuted: boolean) {
    this.set({ globalMuted });
    this.applyGain(0.3);
  }

  setDucked(ducked: boolean) {
    if (ducked === this.state.ducked) return;
    this.set({ ducked });
    this.applyGain(ducked ? 0.5 : 1.2);
  }

  dispose() {
    this.stopSource();
    this.listeners.clear();
  }
}

function trimSilence(buffer: AudioBuffer): [number, number] {
  const data = buffer.getChannelData(0);
  const threshold = 1e-4;
  let a = 0;
  let b = data.length - 1;
  while (a < b && Math.abs(data[a]) < threshold) a++;
  while (b > a && Math.abs(data[b]) < threshold) b--;
  return [a / buffer.sampleRate, (b + 1) / buffer.sampleRate];
}

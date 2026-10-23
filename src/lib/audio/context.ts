let ctx: AudioContext | null = null;

/** Shared AudioContext, created lazily (browsers require a user gesture to start it). */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Call from a click/tap handler to satisfy autoplay policies. */
export async function unlockAudioContext() {
  const c = getAudioContext();
  if (c && c.state !== "running") {
    try {
      await c.resume();
    } catch {
      /* resumed on the next gesture */
    }
  }
}

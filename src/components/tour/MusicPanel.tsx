import { t } from "@/config/i18n";
import type { MusicState } from "@/lib/audio/music";
import type { Lang } from "@/types/tour";
import { MusicIcon, SparkleIcon, VolumeOffIcon, VolumeOnIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";

export function MusicPanel({
  lang,
  music,
  onEnabled,
  onVolume,
  onMuted,
  onClose,
}: {
  lang: Lang;
  music: MusicState;
  onEnabled(on: boolean): void;
  onVolume(v: number): void;
  onMuted(m: boolean): void;
  onClose(): void;
}) {
  const pct = Math.round(music.volume * 100);
  const shown = music.muted ? 0 : pct;
  const playing = music.enabled && !music.muted && !music.globalMuted && music.status === "ready";

  return (
    <Popover anchorId="tool-music" title={t(lang, "music")} icon={<MusicIcon size={14} />} closeLabel={t(lang, "close")} onClose={onClose}>
      <div className="glass-tile flex items-center gap-3 rounded-2xl p-3">
        <div className={`accent-gradient grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-lg ${playing ? "spin-slow" : ""}`}>
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#0e1220]">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">Mohanam Ambient</p>
          <p className="text-xs text-white/60">
            {music.status === "loading" ? t(lang, "loading") : music.enabled ? t(lang, "musicOn") : t(lang, "musicOff")}
            {music.status === "error" && " · ⚠"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={music.enabled}
          aria-label={music.enabled ? t(lang, "musicOn") : t(lang, "musicOff")}
          onClick={() => onEnabled(!music.enabled)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${music.enabled ? "accent-gradient" : "bg-white/20"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${music.enabled ? "left-6" : "left-1"}`} />
        </button>
      </div>

      <div className={`mt-4 flex items-center gap-3 px-1 transition ${music.enabled ? "" : "pointer-events-none opacity-40"}`}>
        <button
          type="button"
          onClick={() => onMuted(!music.muted)}
          aria-label={music.muted ? t(lang, "unmute") : t(lang, "mute")}
          title={music.muted ? t(lang, "unmute") : t(lang, "mute")}
          className="glass-tile glass-hover grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
        >
          {music.muted || pct === 0 ? <VolumeOffIcon size={18} /> : <VolumeOnIcon size={18} />}
        </button>
        <label className="sr-only" htmlFor="music-volume">
          {t(lang, "volume")}
        </label>
        <input
          id="music-volume"
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => onVolume(Number(e.target.value) / 100)}
          className="slider w-full"
          style={{ ["--fill" as string]: `${shown}%` }}
        />
        <span className="w-10 text-right text-xs font-medium tabular-nums text-white/80">{shown}%</span>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-500/15 px-3 py-2.5 text-[11px] leading-snug text-brand-300">
        <SparkleIcon size={14} className="mt-px shrink-0" />
        {t(lang, "ducking")}
      </p>
    </Popover>
  );
}

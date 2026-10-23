/* eslint-disable @next/next/no-img-element */
import { property, scenes } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, Scene } from "@/types/tour";
import { MusicIcon, PlayIcon, SparkleIcon, Spinner, TargetIcon, WhatsAppIcon } from "@/components/ui/icons";
import { Home360Logo } from "./BrandBadge";
import { CharacterPicker } from "./Assistant";
import type { VoiceCharacterId } from "@/config/voices";

function LangSwitch({ lang, onLang, compact = false }: { lang: Lang; onLang(l: Lang): void; compact?: boolean }) {
  return (
    <div className="glass flex rounded-full p-1" role="radiogroup" aria-label={t(lang, "language")}>
      {(["ta", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={lang === l}
          onClick={() => onLang(l)}
          className={`rounded-full font-medium transition ${compact ? "px-3 py-1 text-xs" : "px-5 py-1.5 text-sm"} ${
            lang === l ? "bg-white text-slate-900 shadow" : "text-white/75 hover:text-white"
          }`}
        >
          {l === "ta" ? "தமிழ்" : compact ? "EN" : "English"}
        </button>
      ))}
    </div>
  );
}

export function StartOverlay({
  lang,
  scene,
  ready,
  leaving = false,
  character,
  onCharacter,
  onLang,
  onStart,
}: {
  lang: Lang;
  scene: Scene;
  ready: boolean;
  /** Fades out after "Start" (0.7 s) to reveal the room smoothly. */
  leaving?: boolean;
  character: VoiceCharacterId;
  onCharacter(id: VoiceCharacterId): void;
  onLang(l: Lang): void;
  onStart(): void;
}) {
  const pills = [
    { icon: <TargetIcon size={14} />, text: `${scenes.length} ${t(lang, "rooms")}` },
    { icon: <SparkleIcon size={14} />, text: t(lang, "assistantShort") },
    { icon: <MusicIcon size={14} />, text: t(lang, "music") },
  ];
  return (
    <div
      className={`absolute inset-0 z-50 flex overflow-y-auto overflow-x-hidden bg-[#07090d] p-4 transition-opacity duration-700 ease-in-out ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <img src={scene.panorama.preview} alt="" className="animate-ken-burns fixed inset-0 h-full w-full object-cover opacity-70" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#07090d]/50 via-[#07090d]/35 to-[#07090d]/90" />
      {/* soft colour blobs behind the glass */}
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-violet-glow/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-cyan-glow/30 blur-3xl" />

      <div className="glass-strong relative m-auto flex w-full max-w-md animate-rise-in flex-col items-center rounded-[32px] px-5 py-7 text-center sm:max-w-lg sm:px-10 sm:py-9">
        <div className="accent-ring w-36 rounded-2xl bg-gradient-to-br from-[#3a6ff0]/70 via-[#4f8cff]/40 to-[#2fd4ff]/30 p-3 shadow-2xl sm:w-44">
          <Home360Logo className="h-auto w-full drop-shadow-lg" />
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          <span className="accent-text">{property.tagline[lang]}</span>
        </h1>
        <p className="mt-2 text-sm text-white/75 sm:text-base">{t(lang, "startHint")}</p>

        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {pills.map((p) => (
            <li key={p.text} className="glass-tile flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white/85">
              <span className="text-cyan-glow">{p.icon}</span>
              {p.text}
            </li>
          ))}
        </ul>

        <div className="mt-6 grid w-full grid-cols-3 gap-2">
          {scenes.map((s) => (
            <figure key={s.id} className="overflow-hidden rounded-xl ring-1 ring-white/15">
              <img src={s.panorama.thumb} alt="" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="truncate bg-black/40 px-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-white/85">
                {s.title[lang].split(" & ")[0]}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6">
          <LangSwitch lang={lang} onLang={onLang} />
        </div>

        <div className="mt-5 w-full">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{t(lang, "chooseGuide")}</p>
          <CharacterPicker lang={lang} value={character} onChange={onCharacter} tone="hero" />
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!ready}
          className="group relative mt-6 flex w-full items-center justify-center gap-3 rounded-full px-7 py-4 text-base font-semibold text-white transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:min-w-[280px]"
        >
          <span className="accent-gradient absolute inset-0 rounded-full blur-lg opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
          <span className="accent-gradient absolute inset-0 rounded-full ring-1 ring-white/40" aria-hidden="true" />
          <span className="relative flex items-center gap-3">
            {ready ? <PlayIcon size={20} /> : <Spinner size={20} />}
            {ready ? t(lang, "startTour") : t(lang, "loading")}
          </span>
        </button>
        <p className="mt-4 text-xs text-white/50">{t(lang, "dragHint")}</p>
      </div>
    </div>
  );
}

export function LoadingOverlay({ lang, progress, preview }: { lang: Lang; progress: number; preview?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" role="status" aria-live="polite">
      {preview && <img src={preview} alt="" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-80 blur-md" />}
      <div className="glass-strong relative flex min-w-[220px] flex-col items-center gap-3 rounded-3xl px-7 py-6 text-white">
        <span className="text-cyan-glow">
          <Spinner size={40} />
        </span>
        <span className="text-sm font-medium">
          {t(lang, "loading")} {progress > 0 && progress < 100 ? `${Math.round(progress)}%` : ""}
        </span>
        <span className="h-1.5 w-44 overflow-hidden rounded-full bg-white/15">
          <span className="accent-gradient block h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
        </span>
      </div>
    </div>
  );
}

export function ErrorOverlay({ lang, kind, onRetry }: { lang: Lang; kind: "webgl" | "load"; onRetry(): void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-6 backdrop-blur-sm" role="alert">
      <div className="glass-strong max-w-sm rounded-3xl p-7 text-center">
        <p className="text-base font-medium text-white">{kind === "webgl" ? t(lang, "webglError") : t(lang, "loadError")}</p>
        {kind === "load" && (
          <button
            type="button"
            onClick={onRetry}
            className="accent-gradient mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
          >
            {t(lang, "retry")}
          </button>
        )}
      </div>
    </div>
  );
}

export function WhatsAppButton({ lang, url }: { lang: Lang; url: string }) {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/[^\d]/g, "");
  const text = encodeURIComponent(`${t(lang, "whatsappMessage")} ${url}`);
  const href = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t(lang, "whatsapp")}
      title={t(lang, "whatsapp")}
      className="group relative grid h-14 w-14 place-items-center rounded-full text-white transition hover:scale-105 sm:h-16 sm:w-16"
    >
      <span className="absolute inset-0 rounded-full bg-[#25d366] opacity-50 blur-md transition group-hover:opacity-80" aria-hidden="true" />
      <span
        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5cf08f] to-[#128c4b] ring-2 ring-white/50"
        aria-hidden="true"
      />
      <WhatsAppIcon size={30} className="relative" />
    </a>
  );
}

export function LanguageToggle({ lang, onLang }: { lang: Lang; onLang(l: Lang): void }) {
  return <LangSwitch lang={lang} onLang={onLang} compact />;
}

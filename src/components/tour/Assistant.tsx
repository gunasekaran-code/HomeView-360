import { t, type StringKey } from "@/config/i18n";
import type { NarratorState, VoiceEngine } from "@/lib/audio/narrator";
import type { Lang, Scene } from "@/types/tour";
import { voiceCharacters, type VoiceCharacterId } from "@/config/voices";
import { CloseIcon, PauseIcon, PlayIcon, ReplayIcon, SparkleIcon, StopIcon, SubtitlesIcon } from "@/components/ui/icons";

const engineLabel: Record<VoiceEngine, StringKey> = {
  api: "engineApi",
  file: "engineFile",
  speech: "engineSpeech",
  subtitles: "subtitles",
};

function SpeakingBars() {
  return (
    <span className="flex h-3.5 items-end gap-[3px]" aria-hidden="true">
      <span className="speaking-bar" />
      <span className="speaking-bar" />
      <span className="speaking-bar" />
      <span className="speaking-bar" />
    </span>
  );
}

/** Floating AI guide button (sits above the WhatsApp button). */
export function AssistantButton({
  lang,
  speaking,
  open,
  onClick,
}: {
  lang: Lang;
  speaking: boolean;
  open: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={t(lang, "assistant")}
      title={t(lang, "assistant")}
      className="group relative grid h-14 w-14 place-items-center rounded-full text-white transition hover:scale-105 sm:h-16 sm:w-16"
    >
      {/* glow */}
      <span
        className={`accent-gradient absolute inset-0 rounded-full blur-md transition ${speaking ? "animate-pulse opacity-90" : "opacity-60 group-hover:opacity-90"}`}
        aria-hidden="true"
      />
      <span className="accent-gradient absolute inset-0 rounded-full ring-2 ring-white/60" aria-hidden="true" />
      <span className="relative">{speaking ? <SpeakingBars /> : <SparkleIcon size={28} />}</span>
      <span className="glass absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] font-bold leading-4 tracking-wider">AI</span>
    </button>
  );
}

function Switch({ checked, onChange, label, icon }: { checked: boolean; onChange(): void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left text-sm text-white/85"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "accent-gradient" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/** Two guide characters, each a native Tamil Nadu voice for both languages. */
export function CharacterPicker({
  lang,
  value,
  onChange,
  tone = "panel",
}: {
  lang: Lang;
  value: VoiceCharacterId;
  onChange(id: VoiceCharacterId): void;
  tone?: "panel" | "hero";
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t(lang, "guideVoice")}>
      {voiceCharacters.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            className={`flex items-center gap-2.5 rounded-2xl p-2 text-left transition ${
              active ? "accent-ring bg-white/14" : "glass-tile glass-hover"
            } ${tone === "hero" ? "sm:p-2.5" : ""}`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold text-white shadow-lg ${
                c.gender === "female" ? "bg-gradient-to-br from-[#ff7eb3] to-[#7c5cff]" : "bg-gradient-to-br from-[#2fd4ff] to-[#3a6ff0]"
              }`}
              aria-hidden="true"
            >
              {c.name.ta.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{c.name[lang]}</span>
              <span className="block truncate text-[11px] text-white/60">{t(lang, c.gender)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AssistantPanel({
  lang,
  scene,
  narrator,
  subtitles,
  autoNarrate,
  noVoiceWarning,
  onCharacter,
  onPlay,
  onPause,
  onResume,
  onStop,
  onReplay,
  onToggleSubtitles,
  onToggleAutoNarrate,
  onLang,
  onClose,
}: {
  lang: Lang;
  scene: Scene;
  narrator: NarratorState;
  subtitles: boolean;
  autoNarrate: boolean;
  noVoiceWarning: boolean;
  onCharacter(id: VoiceCharacterId): void;
  onPlay(): void;
  onPause(): void;
  onResume(): void;
  onStop(): void;
  onReplay(): void;
  onToggleSubtitles(): void;
  onToggleAutoNarrate(): void;
  onLang(l: Lang): void;
  onClose(): void;
}) {
  const { status, items, position } = narrator;
  const active = status !== "idle";
  const speaking = status === "playing" || status === "loading";
  const side =
    "glass-tile glass-hover grid h-11 w-11 place-items-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-white";
  const main =
    "accent-gradient grid h-16 w-16 place-items-center rounded-full text-white shadow-[0_10px_30px_-6px_rgb(79_140_255_/_0.8)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      role="dialog"
      aria-label={t(lang, "assistant")}
      className="glass-strong fixed max-sm:bg-[#0b0f19] inset-x-2 bottom-2 z-40 animate-sheet-in rounded-3xl p-4 sm:static sm:w-[360px] sm:animate-rise-in sm:p-5"
    >
      <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`accent-gradient relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-lg ${speaking ? "animate-pulse" : ""}`}>
            {speaking ? <SpeakingBars /> : <SparkleIcon size={20} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{t(lang, "assistant")}</h2>
            <p className="truncate text-xs text-white/60">
              {scene.title[lang]} · {narrator.engine === "file" || narrator.engine === "api" ? (voiceCharacters.find((c) => c.id === narrator.character)?.name[lang] ?? "") : t(lang, engineLabel[narrator.engine])}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t(lang, "close")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="glass-tile mt-4 flex rounded-full p-1 text-sm" role="radiogroup" aria-label={t(lang, "language")}>
        {(["ta", "en"] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={lang === l}
            onClick={() => onLang(l)}
            className={`flex-1 rounded-full py-1.5 font-medium transition ${lang === l ? "bg-white text-slate-900 shadow" : "text-white/70 hover:text-white"}`}
          >
            {l === "ta" ? "தமிழ்" : "English"}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {t(lang, "guideVoice")} · {t(lang, "tamilNaduVoice")}
      </p>
      <CharacterPicker lang={lang} value={narrator.character} onChange={onCharacter} />

      <div className="mt-5 flex items-center justify-center gap-5">
        <button type="button" onClick={onReplay} aria-label={t(lang, "replay")} title={t(lang, "replay")} className={side}>
          <ReplayIcon size={20} />
        </button>
        {speaking ? (
          <button type="button" onClick={onPause} aria-label={t(lang, "pause")} title={t(lang, "pause")} className={main}>
            <PauseIcon size={26} />
          </button>
        ) : (
          <button
            type="button"
            onClick={status === "paused" ? onResume : onPlay}
            aria-label={status === "paused" ? t(lang, "resume") : t(lang, "play")}
            title={status === "paused" ? t(lang, "resume") : t(lang, "play")}
            className={main}
          >
            <PlayIcon size={26} className="translate-x-0.5" />
          </button>
        )}
        <button type="button" onClick={onStop} disabled={!active} aria-label={t(lang, "stop")} title={t(lang, "stop")} className={side}>
          <StopIcon size={18} />
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                active && i < position ? "accent-gradient" : active && i === position ? "accent-gradient opacity-60" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      )}

      {active && items[position] && (
        <p className="glass-tile mt-3 rounded-2xl p-3 text-[13px] leading-relaxed text-white/90" aria-live="polite" lang={lang}>
          {items[position].text}
        </p>
      )}

      {noVoiceWarning && (
        <p className="mt-3 rounded-xl bg-amber-400/15 px-3 py-2 text-[11px] text-amber-200">{t(lang, "noTamilVoice")}</p>
      )}

      <div className="mt-4 space-y-1 border-t border-white/10 pt-3">
        <Switch checked={subtitles} onChange={onToggleSubtitles} label={t(lang, "subtitles")} icon={<SubtitlesIcon size={17} />} />
        <Switch checked={autoNarrate} onChange={onToggleAutoNarrate} label={t(lang, "autoNarrate")} />
      </div>
    </div>
  );
}

export function Subtitles({ text, lang }: { text: string; lang: Lang }) {
  return (
    <div className="pointer-events-none flex justify-center sm:px-4" aria-live="polite">
      <p
        key={text}
        lang={lang}
        className="glass-strong max-w-3xl animate-fade-in rounded-2xl px-4 py-2.5 text-center text-sm leading-relaxed text-white sm:px-6 sm:py-3 sm:text-lg"
      >
        {text}
      </p>
    </div>
  );
}

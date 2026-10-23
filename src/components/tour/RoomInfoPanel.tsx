/* eslint-disable @next/next/no-img-element */
import { sceneById } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, Scene, SceneId } from "@/types/tour";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

/** Room details: side sheet on tablet/desktop, bottom sheet on phones. */
export function RoomInfoPanel({
  lang,
  scene,
  onClose,
  onSelect,
}: {
  lang: Lang;
  scene: Scene;
  onClose(): void;
  onSelect(id: SceneId): void;
}) {
  const targets = [...new Set(scene.hotspots.map((h) => h.target))];
  return (
    <aside
      role="dialog"
      aria-label={t(lang, "info")}
      className="glass-strong fixed max-sm:bg-[#0b0f19] inset-x-2 bottom-2 z-40 flex max-h-[82dvh] animate-sheet-in flex-col overflow-hidden rounded-3xl sm:absolute sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:max-h-none sm:w-[380px] sm:animate-rise-in"
    >
      <div className="relative shrink-0">
        <img src={scene.panorama.thumb} alt={scene.title[lang]} className="aspect-[16/9] w-full object-cover sm:aspect-[16/10]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1220] via-[#0e1220]/20 to-transparent" />
        <button
          type="button"
          onClick={onClose}
          aria-label={t(lang, "close")}
          className="glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-white transition hover:scale-105"
        >
          <CloseIcon size={16} />
        </button>
        <div className="absolute inset-x-5 bottom-3">
          <span className="accent-gradient rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">360°</span>
          <h2 className="text-shadow mt-2 font-display text-xl uppercase tracking-wide text-white sm:text-2xl">{scene.title[lang]}</h2>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-5 pt-3">
        <p className="text-sm leading-relaxed text-white/75">{scene.summary[lang]}</p>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="glass-tile rounded-2xl p-3">
            <dt className="text-[10px] uppercase tracking-widest text-white/50">{t(lang, "measurement")}</dt>
            <dd className="mt-1 font-medium text-white">{scene.dimensions ?? t(lang, "notMeasured")}</dd>
          </div>
          <div className="glass-tile rounded-2xl p-3">
            <dt className="text-[10px] uppercase tracking-widest text-white/50">360°</dt>
            <dd className="mt-1 text-[12px] font-medium leading-snug text-white">{t(lang, "capturedWith")}</dd>
          </div>
        </dl>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{t(lang, "features")}</h3>
        <ul className="mt-2 space-y-2">
          {scene.features[lang].map((f) => (
            <li key={f} className="flex gap-2.5 text-sm text-white/90">
              <span className="accent-gradient mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full">
                <CheckIcon size={12} strokeWidth={3} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">{t(lang, "connectsTo")}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {targets.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className="accent-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              {sceneById[id].title[lang]} →
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

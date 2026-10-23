/* eslint-disable @next/next/no-img-element */
import { scenes } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, SceneId } from "@/types/tour";
import { CheckIcon } from "@/components/ui/icons";

export function Thumbnails({
  lang,
  current,
  visited,
  onSelect,
}: {
  lang: Lang;
  current: SceneId;
  visited: ReadonlySet<SceneId>;
  onSelect(id: SceneId): void;
}) {
  return (
    <div
      className="glass no-scrollbar flex max-w-[calc(100vw-16px)] animate-rise-in snap-x gap-2 overflow-x-auto rounded-3xl p-2 sm:gap-3 sm:p-2.5"
      role="list"
      aria-label={t(lang, "thumbnails")}
    >
      {scenes.map((s) => {
        const active = s.id === current;
        return (
          <button
            key={s.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(s.id)}
            aria-current={active ? "location" : undefined}
            className={`group relative w-28 shrink-0 snap-start overflow-hidden rounded-2xl text-left transition sm:w-40 lg:w-48 ${
              active ? "accent-ring scale-[1.02]" : "opacity-85 hover:opacity-100"
            }`}
          >
            <img src={s.panorama.thumb} alt="" className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-110" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2.5 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-wider text-white sm:text-xs">
              {s.title[lang]}
            </span>
            {visited.has(s.id) && (
              <span
                className="glass absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-white"
                aria-label={t(lang, "visited")}
              >
                <CheckIcon size={11} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

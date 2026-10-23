/* eslint-disable @next/next/no-img-element */
import { scenes } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, SceneId } from "@/types/tour";
import { CheckIcon, TargetIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";

export function RoomMenu({
  lang,
  current,
  visited,
  onSelect,
  onClose,
}: {
  lang: Lang;
  current: SceneId;
  visited: ReadonlySet<SceneId>;
  onSelect(id: SceneId): void;
  onClose(): void;
}) {
  return (
    <Popover anchorId="tool-rooms" title={t(lang, "rooms")} icon={<TargetIcon size={15} />} closeLabel={t(lang, "close")} onClose={onClose}>
      <ul className="space-y-1.5">
        {scenes.map((s, i) => {
          const active = s.id === current;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? "location" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${
                  active ? "accent-ring bg-white/14" : "glass-tile glass-hover"
                }`}
              >
                <img src={s.panorama.thumb} alt="" className="h-12 w-16 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-medium text-white/50">{String(i + 1).padStart(2, "0")}</span>
                  <span className="line-clamp-2 text-sm font-semibold uppercase leading-snug tracking-wide text-white">{s.title[lang]}</span>
                </span>
                {visited.has(s.id) && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 text-white" aria-label={t(lang, "visited")}>
                    <CheckIcon size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}

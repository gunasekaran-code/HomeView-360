import { sceneById, scenes } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, SceneId } from "@/types/tour";
import { MapIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";

const PAD = 8;
const FOV = 75;

function polar(cx: number, cy: number, r: number, bearing: number) {
  const b = (bearing * Math.PI) / 180;
  return [cx + r * Math.sin(b), cy - r * Math.cos(b)] as const;
}

/**
 * Schematic plan built from scene config. Room placement is derived from
 * the matching doorway directions between panoramas; it is not to scale.
 */
export function FloorPlan({
  lang,
  current,
  yaw,
  visited,
  onSelect,
  onClose,
}: {
  lang: Lang;
  current: SceneId;
  yaw: number;
  visited: ReadonlySet<SceneId>;
  onSelect(id: SceneId): void;
  onClose(): void;
}) {
  const xs = scenes.flatMap((s) => [s.floorPlan.x, s.floorPlan.x + s.floorPlan.w]);
  const ys = scenes.flatMap((s) => [s.floorPlan.y, s.floorPlan.y + s.floorPlan.h]);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const w = Math.max(...xs) - minX + PAD;
  const h = Math.max(...ys) - minY + PAD;

  const links = new Map<string, [SceneId, SceneId]>();
  scenes.forEach((s) => s.hotspots.forEach((hs) => links.set([s.id, hs.target].sort().join("|"), [s.id, hs.target])));

  const cur = sceneById[current].floorPlan;
  const bearing = yaw + cur.northOffset;
  const [ax, ay] = polar(cur.camera.x, cur.camera.y, 30, bearing - FOV / 2);
  const [bx, by] = polar(cur.camera.x, cur.camera.y, 30, bearing + FOV / 2);

  return (
    <Popover
      anchorId="tool-plan"
      title={t(lang, "floorPlan")}
      icon={<MapIcon size={14} />}
      closeLabel={t(lang, "close")}
      onClose={onClose}
      width="sm:w-[340px]"
    >
      <div className="glass-tile rounded-2xl p-3">
        <svg
          viewBox={`${minX} ${minY} ${w} ${h}`}
          className="mx-auto h-auto max-h-[42dvh] w-full"
          role="group"
          aria-label={t(lang, "floorPlan")}
        >
          <defs>
            <radialGradient id="cone" cx="0" cy="0" r="1">
              <stop offset="0" stopColor="#2fd4ff" stopOpacity="0.7" />
              <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {scenes.map((s) => {
            const r = s.floorPlan;
            const active = s.id === current;
            return (
              <g key={s.id}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={3}
                  className={active ? "fill-brand-400/20 stroke-brand-300" : "fill-white/5 stroke-white/35"}
                  strokeWidth={active ? 1.4 : 0.8}
                />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + 11}
                  textAnchor="middle"
                  className={`text-[7px] font-semibold uppercase ${active ? "fill-white" : "fill-white/60"}`}
                >
                  {/* Short name ("Kitchen") keeps labels inside the schematic boxes. */}
                  {s.title[lang].split(" & ")[0]}
                </text>
              </g>
            );
          })}
          {[...links.values()].map(([a, b]) => {
            const p = sceneById[a].floorPlan.camera;
            const q = sceneById[b].floorPlan.camera;
            return (
              <line
                key={`${a}-${b}`}
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                className="stroke-white/40"
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
            );
          })}
          <path d={`M${cur.camera.x} ${cur.camera.y} L${ax} ${ay} A30 30 0 0 1 ${bx} ${by} Z`} fill="url(#cone)" />
          {scenes.map((s) => {
            const c = s.floorPlan.camera;
            const active = s.id === current;
            return (
              <g
                key={s.id}
                role="button"
                tabIndex={0}
                aria-label={`${t(lang, "goTo")} ${s.title[lang]}`}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(s.id)}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-cyan-glow"
              >
                <circle cx={c.x} cy={c.y} r={9} fill="transparent" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={active ? 4.5 : 3.5}
                  className={
                    active
                      ? "fill-cyan-glow stroke-white"
                      : visited.has(s.id)
                        ? "fill-white/70 stroke-white"
                        : "fill-transparent stroke-white"
                  }
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 space-y-1 px-1 text-[11px] text-white/65">
        <p className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-glow shadow-[0_0_10px_#2fd4ff]" /> {t(lang, "youAreHere")}
        </p>
        <p className="italic">{t(lang, "floorPlanNote")}</p>
      </div>
    </Popover>
  );
}

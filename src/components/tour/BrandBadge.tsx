import { property } from "@/config/tour";
import { t } from "@/config/i18n";
import type { Lang, Scene } from "@/types/tour";
import { FacebookIcon, GlobeIcon, InstagramIcon, YoutubeIcon } from "@/components/ui/icons";

/** Home 360 mark: a house inside a 360° orbit. */
export function Home360Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} role="img" aria-label="Home 360">
      <defs>
        <linearGradient id="h360-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf4a" />
          <stop offset="1" stopColor="#ff7a2f" />
        </linearGradient>
      </defs>
      <g transform="translate(60 22)">
        <ellipse rx="27" ry="9" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="120 10" transform="rotate(-8)" />
        <circle cx="0" cy="-9" r="9" fill="url(#h360-sun)" opacity="0.95" />
        <path d="M-12 6v-9l12-9 12 9v9z" fill="#fff" />
        <path d="M-4 6v-6h8v6z" fill="#e3342f" />
        <path d="M24 -3l5 1-3.5 3.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text x="60" y="56" textAnchor="middle" fontFamily="var(--font-lexend)" fontWeight="700" fontSize="17" fill="#fff" letterSpacing="0.5">
        Home<tspan fill="#ffcf4a">360</tspan>
      </text>
    </svg>
  );
}

export function BrandBadge({ lang, scene }: { lang: Lang; scene: Scene }) {
  const links = [
    { href: property.social.website, label: "Website", Icon: GlobeIcon },
    { href: property.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: property.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: property.social.youtube, label: "YouTube", Icon: YoutubeIcon },
  ].filter((l) => l.href);

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="glass accent-ring w-[104px] overflow-hidden rounded-2xl p-2 sm:w-[136px] sm:p-2.5 lg:w-[160px]">
        <div className="rounded-xl bg-gradient-to-br from-[#3a6ff0]/70 via-[#4f8cff]/40 to-[#2fd4ff]/30 p-1.5 sm:p-2">
          <Home360Logo className="h-auto w-full drop-shadow-lg" />
        </div>
      </div>
      {links.length > 0 && (
        <div className="flex gap-1.5">
          {links.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="glass grid h-8 w-8 place-items-center rounded-xl text-white transition hover:scale-110"
            >
              <Icon size={15} />
            </a>
          ))}
        </div>
      )}
      <div className="glass rounded-2xl px-3 py-1.5 text-right sm:px-4 sm:py-2" title={scene.dimensions ? undefined : t(lang, "notMeasured")}>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-[10px]">{t(lang, "measurement")}</div>
        <div className="text-[12px] font-semibold leading-tight tracking-wide text-white sm:text-sm">
          {scene.dimensions ?? <span className="text-white/80">{t(lang, "notMeasured")}</span>}
        </div>
      </div>
    </div>
  );
}

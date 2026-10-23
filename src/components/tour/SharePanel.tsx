"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { t } from "@/config/i18n";
import type { Lang } from "@/types/tour";
import { CheckIcon, CopyIcon, FacebookIcon, ShareIcon, WhatsAppIcon, XLogoIcon } from "@/components/ui/icons";
import { Popover } from "@/components/ui/Popover";

export function SharePanel({ lang, url, title, onClose }: { lang: Lang; url: string; title: string; onClose(): void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const enc = encodeURIComponent;
  const links = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, Icon: FacebookIcon, tint: "hover:bg-[#1877f2]" },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, Icon: XLogoIcon, tint: "hover:bg-black" },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} ${url}`)}`, Icon: WhatsAppIcon, tint: "hover:bg-[#25d366]" },
  ];

  return (
    <Popover anchorId="tool-share" title={t(lang, "share")} icon={<ShareIcon size={14} />} closeLabel={t(lang, "close")} onClose={onClose}>
      <div className="grid grid-cols-4 gap-2">
        {links.map(({ label, href, Icon, tint }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className={`glass-tile grid aspect-square place-items-center rounded-2xl text-white transition ${tint}`}
          >
            <Icon size={22} />
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          aria-label={t(lang, "copyLink")}
          title={t(lang, "copyLink")}
          className={`grid aspect-square place-items-center rounded-2xl text-white transition ${copied ? "accent-gradient" : "glass-tile glass-hover"}`}
        >
          {copied ? <CheckIcon size={22} /> : <CopyIcon size={20} />}
        </button>
      </div>
      <p className={`mt-1.5 h-4 text-center text-xs font-medium text-emerald-300 transition ${copied ? "opacity-100" : "opacity-0"}`} aria-live="polite">
        {copied ? t(lang, "copied") : ""}
      </p>

      <div className="mt-2 flex items-center gap-3 rounded-2xl glass-tile p-3 sm:flex-col">
        <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code" width={160} height={160} className="h-24 w-24 sm:h-40 sm:w-40" />
          ) : (
            <div className="h-24 w-24 animate-pulse rounded bg-neutral-200 sm:h-40 sm:w-40" />
          )}
        </div>
        <p className="text-xs leading-snug text-white/75 sm:text-center">{t(lang, "scanQr")}</p>
      </div>

      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={t(lang, "copyLink")}
        className="mt-3 w-full truncate rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80 outline-none focus:border-brand-400"
      />
      {canNativeShare && (
        <button
          type="button"
          onClick={() => navigator.share({ title, url }).catch(() => {})}
          className="accent-gradient mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          <ShareIcon size={16} /> {t(lang, "shareNative")}
        </button>
      )}
    </Popover>
  );
}

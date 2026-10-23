"use client";

import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Glass panel for toolbar actions.
 * - Tablet / desktop: floats beside the toolbar rail, aligned to its button.
 * - Phone: slides up as a bottom sheet.
 */
export function Popover({
  anchorId,
  title,
  icon,
  closeLabel,
  onClose,
  children,
  width = "sm:w-[300px]",
}: {
  anchorId: string;
  title: string;
  icon?: ReactNode;
  closeLabel: string;
  onClose(): void;
  children: ReactNode;
  width?: string;
}) {
  const [top, setTop] = useState(96);

  useLayoutEffect(() => {
    const place = () => {
      const el = document.getElementById(anchorId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Keep the panel on screen on short tablets / landscape phones.
      setTop(Math.max(12, Math.min(r.top - 8, window.innerHeight - 420)));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchorId]);

  return (
    <div
      role="dialog"
      aria-label={title}
      style={{ "--top": `${top}px` } as CSSProperties}
      className={`glass-strong fixed max-sm:bg-[#0b0f19] inset-x-2 bottom-2 z-40 animate-sheet-in rounded-3xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-[92px] sm:top-[var(--top)] sm:animate-pop-in sm:rounded-2xl ${width}`}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/30 sm:hidden" aria-hidden="true" />
      <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-3 sm:pt-4">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/90">
          {icon && <span className="grid h-7 w-7 place-items-center rounded-lg accent-gradient text-white shadow-lg">{icon}</span>}
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <CloseIcon size={16} />
        </button>
      </header>
      <div className="no-scrollbar max-h-[min(70dvh,calc(100dvh-140px))] overflow-y-auto px-3 pb-4 sm:px-4">{children}</div>
    </div>
  );
}

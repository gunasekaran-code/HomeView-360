import type { ReactNode } from "react";
import { t, type StringKey } from "@/config/i18n";
import type { Lang } from "@/types/tour";
import {
  ExitFullscreenIcon,
  FullscreenIcon,
  GridIcon,
  InfoIcon,
  MapIcon,
  MenuCollapseIcon,
  MenuExpandIcon,
  MusicIcon,
  RotateIcon,
  RouteIcon,
  ShareIcon,
  TargetIcon,
  VolumeOffIcon,
  VolumeOnIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@/components/ui/icons";

export type PanelId = "rooms" | "share" | "plan" | "info" | "music";

interface Props {
  lang: Lang;
  open: boolean;
  panel: PanelId | null;
  muted: boolean;
  autorotate: boolean;
  fullscreen: boolean;
  fullscreenSupported: boolean;
  thumbnails: boolean;
  guided: boolean;
  onToggleOpen(): void;
  onPanel(panel: PanelId): void;
  onToggleMute(): void;
  onToggleAutorotate(): void;
  onToggleFullscreen(): void;
  onToggleThumbnails(): void;
  onToggleGuided(): void;
  onZoom(delta: number): void;
}

function ToolButton({
  label,
  active,
  onClick,
  children,
  id,
}: {
  label: string;
  active?: boolean;
  onClick(): void;
  children: ReactNode;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-11 sm:w-11 ${
        active ? "accent-gradient text-white shadow-[0_6px_20px_-4px_rgb(79_140_255_/_0.7)]" : "text-white/85 hover:bg-white/12 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar(p: Props) {
  const L = (k: StringKey) => t(p.lang, k);
  const size = 22;
  const divider = <div className="mx-auto my-1 h-px w-6 shrink-0 bg-white/20" />;
  return (
    <nav className="flex flex-col items-start gap-3" aria-label={L("toolbar")}>
      <div className="glass rounded-2xl p-1">
        <ToolButton label={L("menu")} onClick={p.onToggleOpen} active={false}>
          {p.open ? <MenuCollapseIcon size={size} /> : <MenuExpandIcon size={size} />}
        </ToolButton>
      </div>
      {p.open && (
        <div className="glass no-scrollbar flex max-h-[calc(100dvh-220px)] animate-fade-in flex-col items-center gap-1 overflow-y-auto rounded-[22px] p-1 sm:max-h-[calc(100dvh-290px)]">
          <ToolButton id="tool-rooms" label={L("rooms")} active={p.panel === "rooms"} onClick={() => p.onPanel("rooms")}>
            <TargetIcon size={size} />
          </ToolButton>
          {p.fullscreenSupported && (
            <ToolButton label={p.fullscreen ? L("exitFullscreen") : L("fullscreen")} onClick={p.onToggleFullscreen}>
              {p.fullscreen ? <ExitFullscreenIcon size={size} /> : <FullscreenIcon size={size} />}
            </ToolButton>
          )}
          <ToolButton label={p.muted ? L("unmuteAll") : L("muteAll")} active={p.muted} onClick={p.onToggleMute}>
            {p.muted ? <VolumeOffIcon size={size} /> : <VolumeOnIcon size={size} />}
          </ToolButton>
          <ToolButton label={L("autorotate")} active={p.autorotate} onClick={p.onToggleAutorotate}>
            <RotateIcon size={size} />
          </ToolButton>
          <ToolButton id="tool-share" label={L("share")} active={p.panel === "share"} onClick={() => p.onPanel("share")}>
            <ShareIcon size={size} />
          </ToolButton>
          <ToolButton id="tool-plan" label={L("floorPlan")} active={p.panel === "plan"} onClick={() => p.onPanel("plan")}>
            <MapIcon size={size} />
          </ToolButton>
          {divider}
          <ToolButton label={L("info")} active={p.panel === "info"} onClick={() => p.onPanel("info")}>
            <InfoIcon size={size} />
          </ToolButton>
          <ToolButton label={L("thumbnails")} active={p.thumbnails} onClick={p.onToggleThumbnails}>
            <GridIcon size={size} />
          </ToolButton>
          <ToolButton label={p.guided ? L("stopGuidedTour") : L("guidedTour")} active={p.guided} onClick={p.onToggleGuided}>
            <RouteIcon size={size} />
          </ToolButton>
          <ToolButton id="tool-music" label={L("music")} active={p.panel === "music"} onClick={() => p.onPanel("music")}>
            <MusicIcon size={size} />
          </ToolButton>
          <div className="hidden flex-col items-center gap-1 [@media(hover:hover)]:flex">
            {divider}
            <ToolButton label={L("zoomIn")} onClick={() => p.onZoom(15)}>
              <ZoomInIcon size={size} />
            </ToolButton>
            <ToolButton label={L("zoomOut")} onClick={() => p.onZoom(-15)}>
              <ZoomOutIcon size={size} />
            </ToolButton>
          </div>
        </div>
      )}
    </nav>
  );
}

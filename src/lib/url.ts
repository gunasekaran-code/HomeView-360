import { isSceneId } from "@/config/tour";
import type { Lang, SceneId, ViewAngle } from "@/types/tour";

export interface UrlState {
  scene?: SceneId;
  lang?: Lang;
  view?: ViewAngle;
}

/** Reads `?scene=kitchen&lang=en&yaw=40&pitch=-5` from the current URL. */
export function readUrlState(): UrlState {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const scene = q.get("scene");
  const lang = q.get("lang");
  const yaw = Number(q.get("yaw"));
  const pitch = Number(q.get("pitch"));
  const hasView = q.has("yaw") && Number.isFinite(yaw) && Number.isFinite(pitch);
  return {
    scene: isSceneId(scene) ? scene : undefined,
    lang: lang === "ta" || lang === "en" ? lang : undefined,
    view: hasView ? { yaw: ((yaw % 360) + 360) % 360, pitch: Math.max(-90, Math.min(90, pitch)) } : undefined,
  };
}

export function buildTourUrl(state: { scene: SceneId; lang: Lang; view?: ViewAngle | null }) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("scene", state.scene);
  url.searchParams.set("lang", state.lang);
  if (state.view) {
    url.searchParams.set("yaw", String(Math.round(state.view.yaw)));
    url.searchParams.set("pitch", String(Math.round(state.view.pitch)));
  }
  return url.toString();
}

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EquirectangularAdapter, Viewer } from "@photo-sphere-viewer/core";
import { LinearMipmapLinearFilter } from "three";
import { MarkersPlugin, type MarkerConfig } from "@photo-sphere-viewer/markers-plugin";
import { AutorotatePlugin } from "@photo-sphere-viewer/autorotate-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import { sceneById, viewSettings } from "@/config/tour";
import { FISHEYE, fovSettings } from "@/lib/viewer/fov";
import type { Lang, Scene, SceneId, ViewAngle } from "@/types/tour";

export interface PanoramaViewerHandle {
  recenter(): void;
  zoom(delta: number): void;
  setAutorotate(on: boolean): void;
  reload(): void;
  getView(): ViewAngle | null;
}

interface Props {
  scene: Scene;
  /** View to show when the scene loads (defaults to the scene's initialView). */
  view?: ViewAngle;
  lang: Lang;
  autorotate: boolean;
  onNavigate(target: SceneId): void;
  onLoadingChange(loading: boolean, progress: number): void;
  onSceneReady(id: SceneId): void;
  onError(kind: "webgl" | "load"): void;
  onViewChange?(view: ViewAngle): void;
  onUserAutorotateChange(on: boolean): void;
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * Resolution tiers (GPU memory with mipmaps ≈ width × height × 5.3 bytes):
 * phones → 4K, tablets / standard desktops → 6K, high-DPI desktops → 8K.
 */
function pickSource(scene: Scene) {
  const maxTex = maxTextureSize();
  const shortSide = Math.min(window.screen.width, window.screen.height);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (shortSide < 600 || maxTex < 8192) return scene.panorama.medium;
  if (coarse) return scene.panorama.full;
  return maxTex >= 16384 && window.devicePixelRatio >= 1.5 ? scene.panorama.ultra : scene.panorama.full;
}

/**
 * PSV uploads panoramas without mipmaps, which makes zoomed-out views (each
 * screen pixel covering several texels) grainy and shimmering. Enable
 * trilinear mipmapping + anisotropic filtering for a clean, sharp image.
 */
class SharpEquirectangularAdapter extends EquirectangularAdapter {
  override setTexture(...args: Parameters<EquirectangularAdapter["setTexture"]>) {
    const texture = args[1].texture;
    if (!texture.generateMipmaps) {
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.anisotropy = 16; // three.js clamps to the GPU's maximum
      texture.needsUpdate = true;
    }
    super.setTexture(...args);
  }
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/**
 * Room-to-room crossfade. PSV's built-in fade does not render the incoming
 * room correctly in fisheye mode (needed for the 180° view), so the viewer
 * freezes the current frame on an overlay canvas, swaps the room underneath
 * instantly, then fades the overlay out. The camera never moves: no snapping.
 */
const FADE_MS = 1100;
const FADE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

let cachedMaxTexture: number | null = null;
function maxTextureSize() {
  if (cachedMaxTexture !== null) return cachedMaxTexture;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    cachedMaxTexture = gl ? (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) : 0;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cachedMaxTexture = 0;
  }
  return cachedMaxTexture;
}

function hotspotMarkers(scene: Scene, lang: Lang, onNavigate: (target: SceneId) => void): MarkerConfig[] {
  return scene.hotspots.map((h) => {
    const label = h.label?.[lang] ?? sceneById[h.target].title[lang];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "h360-hotspot";
    el.setAttribute("aria-label", label);
    const text = document.createElement("span");
    text.className = "h360-hotspot__label";
    text.textContent = label;
    const dot = document.createElement("span");
    dot.className = "h360-hotspot__dot";
    el.append(text, dot);
    // A real DOM click (mouse, touch, Enter/Space) — PSV's own select-marker
    // only fires for pointer gestures, which would leave keyboard users stuck.
    // Ignore the click that ends a drag, so panning near a hotspot never
    // jumps rooms by accident.
    let down: { x: number; y: number } | null = null;
    el.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const moved = down && e.detail > 0 ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
      down = null;
      if (moved < 6) onNavigate(h.target);
    });
    return {
      id: h.id,
      element: el,
      position: { yaw: rad(h.position.yaw), pitch: rad(h.position.pitch) },
      size: { width: 44, height: 44 },
      anchor: "center center",
      data: { target: h.target },
    };
  });
}

const PanoramaViewer = forwardRef<PanoramaViewerHandle, Props>(function PanoramaViewer(props, ref) {
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const loadedScene = useRef<SceneId | null>(null);
  const cb = useRef(props);
  useEffect(() => {
    cb.current = props;
  });
  const navigate = (target: SceneId) => cb.current.onNavigate(target);
  const fadeCanvas = useRef<HTMLCanvasElement>(null);

  /**
   * Copies the current frame onto the overlay canvas and shows it. Returns a
   * function that fades the overlay out once the next room is rendering.
   */
  const freezeFrame = () => {
    const gl = container.current?.querySelector("canvas");
    const overlay = fadeCanvas.current;
    const ctx = overlay?.getContext("2d");
    if (!gl || !overlay || !ctx || prefersReducedMotion()) return null;
    overlay.width = gl.width;
    overlay.height = gl.height;
    ctx.drawImage(gl, 0, 0);
    overlay.style.transition = "none";
    overlay.style.opacity = "1";
    return () => {
      // two frames: let PSV render the new room before revealing it
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          overlay.style.transition = `opacity ${FADE_MS}ms ${FADE_EASING}`;
          overlay.style.opacity = "0";
        }),
      );
    };
  };

  /** Zoom level that shows `viewSettings.initialHfov` on the current screen. */
  const initialZoom = useRef(50);

  // Create the viewer once.
  useEffect(() => {
    let viewer: Viewer | null = null;
    let raf = 0;

    const create = () => {
      if (!container.current) return;
      const { scene, view, lang } = cb.current;
      const start = view ?? scene.initialView;
      const el = container.current;
      const fov = fovSettings(viewSettings, el.clientWidth / Math.max(1, el.clientHeight));
      initialZoom.current = fov.initialZoom;
      try {
        viewer = new Viewer({
          container: container.current,
          adapter: SharpEquirectangularAdapter,
          panorama: pickSource(scene),
          defaultYaw: rad(start.yaw),
          defaultPitch: rad(start.pitch),
          // Wide-angle views up to 180°: see src/lib/viewer/fov.ts
          fisheye: FISHEYE,
          defaultZoomLvl: fov.initialZoom,
          minFov: fov.minFov,
          maxFov: fov.maxFov,
          navbar: false,
          loadingTxt: "",
          moveInertia: true,
          mousewheelCtrlKey: false,
          touchmoveTwoFingers: false,
          keyboard: "always",
          canvasBackground: "#0b0b0c",
          // Lets the room-change crossfade copy the last rendered frame.
          rendererParameters: { preserveDrawingBuffer: true },
          plugins: [
            [MarkersPlugin, { markers: hotspotMarkers(scene, lang, navigate) }],
            // autostartDelay: null disables the timed auto-start (typings only allow number).
            [AutorotatePlugin, { autostartDelay: null as unknown as number, autostartOnIdle: false, autorotatePitch: rad(-4), autorotateSpeed: "0.6rpm" }],
          ],
        });
      } catch (err) {
        console.error(err);
        cb.current.onError("webgl");
        return;
      }
      viewerRef.current = viewer;
      loadedScene.current = scene.id;

      viewer.addEventListener("panorama-load", () => cb.current.onLoadingChange(true, 0));
      viewer.addEventListener("load-progress", (e) => cb.current.onLoadingChange(true, e.progress));
      viewer.addEventListener("panorama-loaded", () => cb.current.onLoadingChange(false, 100));
      viewer.addEventListener("panorama-error", () => {
        cb.current.onLoadingChange(false, 0);
        cb.current.onError("load");
      });
      viewer.addEventListener(
        "ready",
        () => {
          cb.current.onSceneReady(scene.id);
          // Download + decode every other room now, so clicking a hotspot
          // swaps instantly instead of waiting for a multi-MB image.
          Object.values(sceneById)
            .filter((s) => s.id !== scene.id)
            .forEach((s) => viewer?.textureLoader.preloadPanorama(pickSource(s)).catch(() => {}));
        },
        { once: true },
      );

      // Keep the same perceived angles when the window resizes / phone rotates.
      viewer.addEventListener("size-updated", ({ size }) => {
        const next = fovSettings(viewSettings, size.width / Math.max(1, size.height));
        initialZoom.current = next.initialZoom;
        viewer?.setOptions({ minFov: next.minFov, maxFov: next.maxFov });
      });

      viewer.addEventListener("position-updated", ({ position }) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => cb.current.onViewChange?.({ yaw: deg(position.yaw), pitch: deg(position.pitch) }));
      });

      const autorotate = viewer.getPlugin<AutorotatePlugin>(AutorotatePlugin);
      autorotate.addEventListener("autorotate", (e) => cb.current.onUserAutorotateChange(e.autorotateEnabled));
    };

    // React Strict Mode (dev) mounts effects twice. three.js shares in-flight
    // image requests by URL, so destroying the throw-away first viewer would
    // abort the download the second viewer is waiting on. Deferring creation
    // by a tick means the first mount is cancelled before it requests anything.
    const timer = setTimeout(create, 0);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      viewer?.destroy();
      viewerRef.current = null;
      loadedScene.current = null;
    };
  }, []);

  // Scene changes: fade to the new panorama, then swap hotspots.
  const { scene, view, lang } = props;
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loadedScene.current === scene.id) return;
    loadedScene.current = scene.id;
    const markers = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
    markers.clearMarkers();

    // Every room opens on its configured start view (tour.ts → initialView).
    // The swap happens under the frozen frame, so the change of angle is never seen.
    const start = view ?? scene.initialView;
    const fade = freezeFrame();
    viewer
      .setPanorama(pickSource(scene), {
        position: { yaw: rad(start.yaw), pitch: rad(start.pitch) },
        zoom: initialZoom.current,
        transition: false,
      })
      .then((completed) => {
        if (!completed || loadedScene.current !== scene.id) return;
        fade?.();
        markers.setMarkers(hotspotMarkers(scene, cb.current.lang, navigate));
        cb.current.onSceneReady(scene.id);
      })
      .catch((err) => {
        console.error(err);
        fade?.(); // never leave the frozen frame covering the error message
        cb.current.onError("load");
      });
    // `view` is only read when the scene changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // Language changes: relabel hotspots in place.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || loadedScene.current !== scene.id) return;
    viewer.getPlugin<MarkersPlugin>(MarkersPlugin).setMarkers(hotspotMarkers(scene, lang, navigate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const autorotate = viewerRef.current?.getPlugin<AutorotatePlugin>(AutorotatePlugin);
    if (!autorotate) return;
    if (props.autorotate && !autorotate.isEnabled()) autorotate.start();
    if (!props.autorotate && autorotate.isEnabled()) autorotate.stop();
  }, [props.autorotate]);

  useImperativeHandle(ref, () => ({
    recenter() {
      const v = viewerRef.current;
      if (!v) return;
      const s = sceneById[loadedScene.current ?? scene.id];
      v.animate({ yaw: rad(s.initialView.yaw), pitch: rad(s.initialView.pitch), zoom: initialZoom.current, speed: "4rpm" });
    },
    zoom(delta) {
      const v = viewerRef.current;
      if (!v) return;
      v.animate({ zoom: Math.min(100, Math.max(0, v.getZoomLevel() + delta)), speed: 800 });
    },
    setAutorotate(on) {
      const a = viewerRef.current?.getPlugin<AutorotatePlugin>(AutorotatePlugin);
      if (on) a?.start();
      else a?.stop();
    },
    reload() {
      const v = viewerRef.current;
      if (!v) return;
      const s = sceneById[loadedScene.current ?? scene.id];
      v.setPanorama(pickSource(s), { transition: false })
        .then(() => v.getPlugin<MarkersPlugin>(MarkersPlugin).setMarkers(hotspotMarkers(s, cb.current.lang, navigate)))
        .catch(() => cb.current.onError("load"));
    },
    getView() {
      const v = viewerRef.current;
      if (!v) return null;
      const p = v.getPosition();
      return { yaw: deg(p.yaw), pitch: deg(p.pitch) };
    },
  }));

  return (
    <div className="absolute inset-0 h-full w-full">
      <div ref={container} className="absolute inset-0 h-full w-full" aria-label="360° panorama" role="application" />
      <canvas ref={fadeCanvas} className="pointer-events-none absolute inset-0 h-full w-full opacity-0" aria-hidden="true" />
    </div>
  );
});

export default PanoramaViewer;

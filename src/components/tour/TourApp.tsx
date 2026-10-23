"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { defaultSceneId, guidedTourOrder, sceneById, scenes } from "@/config/tour";
import { narration } from "@/config/narration";
import { isCharacterId, type VoiceCharacterId } from "@/config/voices";
import { t } from "@/config/i18n";
import { getAudioContext, unlockAudioContext } from "@/lib/audio/context";
import { MusicPlayer } from "@/lib/audio/music";
import { Narrator, type NarrationItem } from "@/lib/audio/narrator";
import { buildTourUrl, readUrlState } from "@/lib/url";
import type { Lang, NarrationTrackId, SceneId, ViewAngle } from "@/types/tour";
import type { PanoramaViewerHandle } from "@/components/viewer/PanoramaViewer";
import { CloseIcon } from "@/components/ui/icons";
import { Toolbar, type PanelId } from "./Toolbar";
import { BrandBadge } from "./BrandBadge";
import { RoomMenu } from "./RoomMenu";
import { SharePanel } from "./SharePanel";
import { FloorPlan } from "./FloorPlan";
import { MusicPanel } from "./MusicPanel";
import { RoomInfoPanel } from "./RoomInfoPanel";
import { Thumbnails } from "./Thumbnails";
import { AssistantButton, AssistantPanel, Subtitles } from "./Assistant";
import { ErrorOverlay, LanguageToggle, LoadingOverlay, StartOverlay, WhatsAppButton } from "./Overlays";

const PanoramaViewer = dynamic(() => import("@/components/viewer/PanoramaViewer"), { ssr: false });

const VOICE_KEY = "home360-voice";
const START_FADE_MS = 700;
const MUSIC_URL = process.env.NEXT_PUBLIC_MUSIC_URL || "/audio/music/ambient-loop.mp3";

function itemsFor(lang: Lang, tracks: NarrationTrackId[]): NarrationItem[] {
  return tracks.flatMap((track) => narration[lang][track].map((seg, index) => ({ track, index, text: seg.text })));
}

export default function TourApp() {
  const [initial] = useState(readUrlState);
  const [lang, setLangState] = useState<Lang>(initial.lang ?? "en");
  const [sceneId, setSceneId] = useState<SceneId>(initial.scene ?? defaultSceneId);
  const [arrivalView, setArrivalView] = useState<ViewAngle | undefined>(initial.view);
  const [started, setStarted] = useState(false);
  /** Start screen stays mounted briefly after "Start" so it can fade away. */
  const [showStart, setShowStart] = useState(true);
  const [narratorReady, setNarratorReady] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<SceneId>>(new Set());
  // Phones start with the toolbar collapsed so the panorama stays visible.
  const [toolbarOpen, setToolbarOpen] = useState(() => window.innerWidth >= 640);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [thumbs, setThumbs] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [autorotate, setAutorotate] = useState(false);
  const [loading, setLoading] = useState({ on: true, progress: 0 });
  // Rooms are pre-fetched, so most switches load instantly; only show the
  // loader for genuinely slow loads to keep the crossfade clean.
  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!loading.on) return;
    const timer = setTimeout(() => setSlowLoad(true), 350);
    return () => {
      clearTimeout(timer);
      setSlowLoad(false);
    };
  }, [loading.on]);
  const [error, setError] = useState<"webgl" | "load" | null>(null);
  const [mutedAll, setMutedAll] = useState(false);
  const [subtitles, setSubtitles] = useState(true);
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [guided, setGuided] = useState(false);
  const [planYaw, setPlanYaw] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenSupported] = useState(() => Boolean(document.fullscreenEnabled));
  const [shareUrl, setShareUrl] = useState("");

  const root = useRef<HTMLDivElement>(null);
  const viewer = useRef<PanoramaViewerHandle>(null);
  const lastNarrated = useRef<SceneId | null>(null);
  const pausedByVisibility = useRef(false);
  /** After the first room loads, slow loads show only a small spinner (no full-screen image swap mid-transition). */
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  // Stable, client-only audio engines for the lifetime of the tour.
  const [narrator] = useState(() => {
    const n = new Narrator();
    try {
      const saved = localStorage.getItem(VOICE_KEY);
      if (isCharacterId(saved)) n.setCharacter(saved);
    } catch {
      /* storage unavailable: keep the default guide */
    }
    return n;
  });
  const [music] = useState(() => new MusicPlayer(MUSIC_URL));
  const narr = useSyncExternalStore(
    useCallback((cb) => narrator.subscribe(cb), [narrator]),
    () => narrator.state,
    () => narrator.state,
  );
  const musicState = useSyncExternalStore(
    useCallback((cb) => music.subscribe(cb), [music]),
    () => music.state,
    () => music.state,
  );

  const scene = sceneById[sceneId];
  const sceneIndex = scenes.findIndex((s) => s.id === sceneId);
  const closePanel = useCallback(() => setPanel(null), []);

  /* ---------- setup ---------- */
  useEffect(() => {
    narrator.init().finally(() => setNarratorReady(true));
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      narrator.dispose();
      music.dispose();
    };
  }, [narrator, music]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Keep the address bar shareable.
  useEffect(() => {
    window.history.replaceState(null, "", buildTourUrl({ scene: sceneId, lang }));
  }, [sceneId, lang]);

  // Duck the music while the guide is talking.
  useEffect(() => {
    music.setDucked(narr.status === "playing" || narr.status === "loading");
  }, [music, narr.status]);

  useEffect(() => {
    narrator.setMuted(mutedAll);
    music.setGlobalMuted(mutedAll);
  }, [narrator, music, mutedAll]);

  // Pause audio when the tab is hidden; resume when it returns.
  useEffect(() => {
    const onVis = () => {
      const ctx = getAudioContext();
      if (document.hidden) {
        if (narrator.state.status === "playing" || narrator.state.status === "loading") {
          narrator.pause();
          pausedByVisibility.current = true;
        }
        void ctx?.suspend();
      } else {
        void ctx?.resume();
        if (pausedByVisibility.current) narrator.resume();
        pausedByVisibility.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [narrator]);

  /* ---------- narration ---------- */
  const narrateScene = useCallback(
    (id: SceneId, withWelcome = false) => {
      lastNarrated.current = id;
      narrator.play(lang, itemsFor(lang, withWelcome ? ["welcome", id] : [id]));
    },
    [narrator, lang],
  );

  const setLang = (next: Lang) => {
    if (next === lang) return;
    setLangState(next);
    const { status, items, position } = narrator.state;
    if (status !== "idle") {
      // Continue from the current sentence in the new language.
      narrator.play(
        next,
        items.slice(position).map((it) => ({ ...it, text: narration[next][it.track][it.index].text })),
      );
    }
  };

  const setCharacter = (id: VoiceCharacterId) => {
    if (id === narrator.state.character) return;
    narrator.setCharacter(id);
    try {
      localStorage.setItem(VOICE_KEY, id);
    } catch {
      /* not persisted */
    }
    // Continue the current narration in the newly chosen voice.
    const { status, items, position, lang: current } = narrator.state;
    if (status !== "idle") narrator.play(current, items.slice(position));
  };

  /* ---------- navigation ---------- */
  const goTo = useCallback(
    (id: SceneId, opts: { view?: ViewAngle; fromGuide?: boolean } = {}) => {
      if (!opts.fromGuide) setGuided(false);
      setPanel((p) => (p === "rooms" ? null : p));
      if (id === sceneId) return;
      narrator.stop();
      setError(null);
      setArrivalView(opts.view);
      setSceneId(id);
    },
    [narrator, sceneId],
  );

  const onSceneReady = useCallback(
    (id: SceneId) => {
      setVisited((v) => (v.has(id) ? v : new Set(v).add(id)));
      if (started && (autoNarrate || guided) && lastNarrated.current !== id) narrateScene(id);
    },
    [started, autoNarrate, guided, narrateScene],
  );

  /* ---------- guided tour ---------- */
  const startGuided = () => {
    setGuided(true);
    setAutorotate(true);
    setPanel(null);
    const first = guidedTourOrder[0];
    if (sceneId === first) narrateScene(first);
    else goTo(first, { fromGuide: true });
  };
  const stopGuided = () => {
    setGuided(false);
    setAutorotate(false);
  };

  // Advance when the current room's narration finishes.
  const completed = narr.completed;
  useEffect(() => {
    if (!guided || completed === 0) return;
    const idx = guidedTourOrder.indexOf(sceneId);
    const timer = setTimeout(() => {
      const next = guidedTourOrder[idx + 1];
      if (next) goTo(next, { fromGuide: true });
      else {
        setGuided(false);
        setAutorotate(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
    // Only react to a finished narration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);

  /* ---------- start ---------- */
  const start = () => {
    // Everything here runs inside the click so browsers allow audio.
    narrator.unlock();
    void unlockAudioContext().then(() => music.load());
    setStarted(true);
    setVisited((v) => new Set(v).add(sceneId));
    setTimeout(() => setShowStart(false), START_FADE_MS);
    if (autoNarrate) narrateScene(sceneId, true);
  };

  /* ---------- toolbar actions ---------- */
  const togglePanel = (p: PanelId) => {
    if (p === "share") setShareUrl(buildTourUrl({ scene: sceneId, lang, view: viewer.current?.getView() }));
    if (p === "plan") setPlanYaw(viewer.current?.getView()?.yaw ?? 0);
    setPanel((cur) => (cur === p ? null : p));
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setAssistantOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onViewChange = useCallback(
    (v: ViewAngle) => {
      if (panel === "plan") setPlanYaw(v.yaw);
    },
    [panel],
  );

  const speaking = narr.status === "playing" || narr.status === "loading";
  const subtitle = narr.status !== "idle" ? narr.items[narr.position]?.text : undefined;
  const guidedIndex = guidedTourOrder.indexOf(sceneId);
  const currentUrl = shareUrl || (typeof window !== "undefined" ? window.location.href : "");

  return (
    <div ref={root} className="relative h-dvh w-full select-none overflow-hidden bg-[#0b0b0c] text-white">
      <div
        className="absolute inset-0"
        onPointerDown={() => setPanel((p) => (p === "info" ? p : null))}
      >
        <PanoramaViewer
          ref={viewer}
          scene={scene}
          view={arrivalView}
          lang={lang}
          autorotate={autorotate}
          onNavigate={(id) => goTo(id)}
          onLoadingChange={(on, progress) => {
            setLoading({ on, progress });
            if (!on) setFirstLoadDone(true);
          }}
          onSceneReady={onSceneReady}
          onError={setError}
          onViewChange={onViewChange}
          onUserAutorotateChange={setAutorotate}
        />
      </div>

      {/* readability gradients */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 via-black/10 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />

      {started && loading.on && slowLoad && !error && <LoadingOverlay lang={lang} progress={loading.progress} preview={firstLoadDone ? undefined : scene.panorama.preview} />}
      {error && (
        <ErrorOverlay
          lang={lang}
          kind={error}
          onRetry={() => {
            setError(null);
            viewer.current?.reload();
          }}
        />
      )}

      {/* left toolbar */}
      <div className="absolute left-2 top-[max(env(safe-area-inset-top),10px)] z-30 sm:left-5 sm:top-6 lg:top-8">
        <Toolbar
          lang={lang}
          open={toolbarOpen}
          panel={panel}
          muted={mutedAll}
          autorotate={autorotate}
          fullscreen={fullscreen}
          fullscreenSupported={fullscreenSupported}
          thumbnails={thumbs}
          guided={guided}
          onToggleOpen={() => {
            setToolbarOpen((o) => !o);
            setPanel(null);
          }}
          onPanel={togglePanel}
          onToggleMute={() => setMutedAll((m) => !m)}
          onToggleAutorotate={() => setAutorotate((a) => !a)}
          onToggleFullscreen={toggleFullscreen}
          onToggleThumbnails={() => setThumbs((v) => !v)}
          onToggleGuided={() => (guided ? stopGuided() : startGuided())}
          onZoom={(d) => viewer.current?.zoom(d)}
        />
      </div>

      {toolbarOpen && panel === "rooms" && (
        <RoomMenu lang={lang} current={sceneId} visited={visited} onSelect={(id) => goTo(id)} onClose={closePanel} />
      )}
      {toolbarOpen && panel === "share" && (
        <SharePanel lang={lang} url={currentUrl} title={`Home 360 · ${scene.title[lang]}`} onClose={closePanel} />
      )}
      {toolbarOpen && panel === "plan" && (
        <FloorPlan lang={lang} current={sceneId} yaw={planYaw} visited={visited} onSelect={(id) => goTo(id)} onClose={closePanel} />
      )}
      {toolbarOpen && panel === "music" && (
        <MusicPanel
          lang={lang}
          music={musicState}
          onEnabled={(on) => {
            void unlockAudioContext();
            music.setEnabled(on);
          }}
          onVolume={(v) => music.setVolume(v)}
          onMuted={(m) => music.setMuted(m)}
          onClose={closePanel}
        />
      )}
      {panel === "info" && <RoomInfoPanel lang={lang} scene={scene} onClose={closePanel} onSelect={(id) => goTo(id)} />}

      {/* top right: logo, measurement, language */}
      <div className="absolute right-2 top-[max(env(safe-area-inset-top),10px)] z-20 flex flex-col items-end gap-2 sm:right-5 sm:top-6 lg:right-8 lg:top-8">
        <BrandBadge lang={lang} scene={scene} />
        <LanguageToggle lang={lang} onLang={setLang} />
      </div>

      {/* bottom centre: subtitles + thumbnails */}
      <div
        className={`pointer-events-none absolute bottom-[112px] left-2 right-[76px] z-20 flex flex-col items-center gap-3 sm:left-24 sm:bottom-[150px] lg:bottom-[164px] ${
          panel === "info" ? "sm:right-[410px]" : "sm:right-24"
        }`}
      >
        {started && subtitles && subtitle && !assistantOpen && <Subtitles text={subtitle} lang={lang} />}
        {thumbs && (
          <div className="pointer-events-auto">
            <Thumbnails lang={lang} current={sceneId} visited={visited} onSelect={(id) => goTo(id)} />
          </div>
        )}
      </div>

      {/* bottom left: room title (+ guided tour status) */}
      <div className="pointer-events-none absolute bottom-[max(env(safe-area-inset-bottom),14px)] left-3 right-20 z-20 sm:bottom-8 sm:left-6 sm:right-28 lg:bottom-10 lg:left-10">
        <div key={sceneId} className="animate-rise-in">
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3">
            <span className="glass pointer-events-auto inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11px] font-medium text-white/90 sm:text-xs">
              <span className="accent-gradient rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">360°</span>
              {String(sceneIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
            </span>
            {guided && (
              <span className="glass pointer-events-auto inline-flex animate-fade-in items-center gap-2 rounded-full py-1 pl-3 pr-1 text-[11px] sm:text-xs">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />
                {t(lang, "guidedTour")} · {guidedIndex + 1}/{guidedTourOrder.length}
                <button
                  type="button"
                  onClick={stopGuided}
                  aria-label={t(lang, "stopGuidedTour")}
                  className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/15"
                >
                  <CloseIcon size={13} />
                </button>
              </span>
            )}
          </div>
          <h1
            className={`text-shadow font-display text-[26px] uppercase leading-[1.05] tracking-wide sm:text-5xl lg:text-6xl ${lang === "ta" ? "font-bold" : ""}`}
          >
            {scene.title[lang]}
          </h1>
          <p className="text-shadow mt-2 hidden max-w-xl text-sm text-white/80 md:block lg:text-base">{scene.summary[lang]}</p>
        </div>
      </div>

      {/* bottom right: AI guide + WhatsApp */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),14px)] right-3 z-30 flex flex-col items-end gap-3 sm:bottom-8 sm:right-5 lg:bottom-10 lg:right-8">
        {assistantOpen && (
          <AssistantPanel
            lang={lang}
            scene={scene}
            narrator={narr}
            subtitles={subtitles}
            autoNarrate={autoNarrate}
            noVoiceWarning={narr.engine === "subtitles" && lang === "ta"}
            onCharacter={setCharacter}
            onPlay={() => narrateScene(sceneId)}
            onPause={() => narrator.pause()}
            onResume={() => narrator.resume()}
            onStop={() => narrator.stop()}
            onReplay={() => narrateScene(sceneId)}
            onToggleSubtitles={() => setSubtitles((s) => !s)}
            onToggleAutoNarrate={() => setAutoNarrate((a) => !a)}
            onLang={setLang}
            onClose={() => setAssistantOpen(false)}
          />
        )}
        <AssistantButton
          lang={lang}
          speaking={speaking}
          open={assistantOpen}
          onClick={() => {
            if (!assistantOpen && narr.status === "idle") narrateScene(sceneId);
            setAssistantOpen((o) => !o);
          }}
        />
        <WhatsAppButton lang={lang} url={currentUrl} />
      </div>

      {showStart && (
        <StartOverlay
          leaving={started}
          lang={lang}
          scene={scene}
          ready={narratorReady}
          character={narr.character}
          onCharacter={setCharacter}
          onLang={(l) => setLangState(l)}
          onStart={start}
        />
      )}
    </div>
  );
}

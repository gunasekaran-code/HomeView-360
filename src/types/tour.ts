export type Lang = "ta" | "en";

/** Text available in both supported languages. */
export type Localized = Record<Lang, string>;

/** Angles are in degrees; yaw 0 = centre of the stitched equirectangular image. */
export interface ViewAngle {
  yaw: number;
  pitch: number;
}

export interface Hotspot {
  id: string;
  /** Scene the hotspot leads to. */
  target: SceneId;
  position: ViewAngle;
  /** Where to look after arriving in the target scene. */
  arrivalView?: ViewAngle;
  label?: Localized;
}

export interface PanoramaSources {
  /** Native-resolution (5888x2944) equirectangular */
  full: string;
  /** 4096x2048 equirectangular for mobile GPUs */
  medium: string;
  /** 1024x512 placeholder shown while loading */
  preview: string;
  /** Rectilinear thumbnail */
  thumb: string;
}

export interface FloorPlanRoom {
  /** Rectangle in schematic plan units (not to scale). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Camera position inside the rectangle. */
  camera: { x: number; y: number };
  /**
   * Plan bearing (degrees, clockwise from plan-up) that corresponds to this
   * panorama's yaw 0. Derived from matching doorways between scenes.
   */
  northOffset: number;
}

export type SceneId = "living-room" | "kitchen" | "bedroom";

export interface Scene {
  id: SceneId;
  title: Localized;
  /** Short one-line summary used in menus and the info panel. */
  summary: Localized;
  /** Highlights visible in the panorama. */
  features: Record<Lang, string[]>;
  /**
   * Measured room size, e.g. `10'0" x 12'0"`. Left undefined when no
   * measurement was supplied — the UI then says so instead of guessing.
   */
  dimensions?: string;
  panorama: PanoramaSources;
  /** Stitched Insta360 export the panorama was built from (assets/jpg assets). */
  source: string;
  initialView: ViewAngle;
  hotspots: Hotspot[];
  floorPlan: FloorPlanRoom;
}

export interface NarrationSegment {
  text: string;
}

export type NarrationTrackId = SceneId | "welcome";

export type NarrationScript = Record<Lang, Record<NarrationTrackId, NarrationSegment[]>>;

export interface PropertyInfo {
  name: string;
  tagline: Localized;
  location?: Localized;
  social: { website?: string; instagram?: string; facebook?: string; youtube?: string };
}

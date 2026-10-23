import type { PropertyInfo, Scene, SceneId } from "@/types/tour";

/**
 * Central tour configuration.
 *
 * Panoramas are built from the Insta360 X5 stitched 360° exports in
 * "assets/jpg assets" by scripts/panorama/build_panoramas.py. Hotspot angles
 * were read off the stitched images at the actual doorways:
 *  - living room ↔ kitchen: open doorway beside the green feature wall
 *    (visible from both sides).
 *  - living room ↔ bedroom: maroon-curtained doorway (same curtain fabric
 *    seen from both rooms).
 *
 * No room was measured on site, so `dimensions` is intentionally left unset.
 */

const pano = (id: SceneId) => ({
  full: `/panoramas/${id}.jpg`,
  medium: `/panoramas/${id}-4k.jpg`,
  preview: `/panoramas/${id}-preview.jpg`,
  thumb: `/panoramas/${id}-thumb.jpg`,
});

export const property: PropertyInfo = {
  name: "Home 360",
  tagline: {
    ta: "360° மெய்நிகர் வீட்டுச் சுற்றுலா",
    en: "360° Virtual Home Tour",
  },
  social: {
    website: process.env.NEXT_PUBLIC_SOCIAL_WEBSITE || undefined,
    instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM || undefined,
    facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK || undefined,
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE || undefined,
  },
};

export const scenes: Scene[] = [
  {
    id: "living-room",
    title: { ta: "வரவேற்பறை", en: "Living Room" },
    summary: {
      ta: "பச்சை நிற அலங்காரச் சுவர், சோஃபாக்கள், கண்ணாடி அலமாரி மற்றும் டிவி பகுதி",
      en: "Green feature wall, sofas, glass display cabinet and TV corner",
    },
    features: {
      ta: [
        "தங்க நிற மூங்கில் ஓவியத்துடன் அடர் பச்சை அலங்காரச் சுவர்",
        "பூ வேலைப்பாடு உறைகளுடன் இரண்டு சோஃபாக்கள்",
        "விளக்குகளுடன் கூடிய கண்ணாடி அலங்கார அலமாரி",
        "டிவி மேசை மற்றும் ஸ்பீக்கர்கள்",
        "அலங்கார மேற்கூரை, மின்விசிறி, கார்னிஸ் விளிம்பு",
        "வெண்மையான தரை டைல்ஸ், சிவப்பு மர கதவுகள்",
      ],
      en: [
        "Deep green feature wall with gold bamboo stencil art",
        "Two sofas with patterned covers",
        "Lit glass display cabinet",
        "TV unit with speakers",
        "Decorative ceiling, ceiling fan and maroon cornice",
        "White vitrified floor tiles and red panelled wooden doors",
      ],
    },
    panorama: pano("living-room"),
    source: "IMG_5702.JPG.jpeg",
    initialView: { yaw: -3.7, pitch: -5 },
    hotspots: [
      { id: "living-to-kitchen", target: "kitchen", position: { yaw: 77, pitch: -4 } },
      { id: "living-to-bedroom", target: "bedroom", position: { yaw: 29, pitch: -2 } },
    ],
    floorPlan: { x: 0, y: 0, w: 100, h: 80, camera: { x: 50, y: 45 }, northOffset: 0 },
  },
  {
    id: "kitchen",
    title: { ta: "சமையலறை & உணவுப் பகுதி", en: "Kitchen & Dining" },
    summary: {
      ta: "கிரானைட் சமையல் மேடை, திறந்த அலமாரிகள் மற்றும் உணவு மேசை",
      en: "Granite counter, open shelving and a dining table",
    },
    features: {
      ta: [
        "கருப்பு கிரானைட் சமையல் மேடை மற்றும் எரிவாயு அடுப்பு",
        "பூ வடிவ டைல்ஸ் பதித்த சுவர், குடிநீர் சுத்திகரிப்பான்",
        "பாத்திரங்களுக்கான திறந்த அலமாரிகள், மேலே பரண்",
        "குளிர்சாதனப் பெட்டி",
        "நாற்காலிகளுடன் உணவு மேசை, கை கழுவும் தொட்டி",
        "கிரில் பொருத்திய ஜன்னல்கள்",
      ],
      en: [
        "Black granite counter with gas stove",
        "Floral tiled backsplash and water purifier",
        "Open utensil shelves with a storage loft above",
        "Refrigerator",
        "Dining table with chairs and a wash basin",
        "Grilled windows for ventilation",
      ],
    },
    panorama: pano("kitchen"),
    source: "IMG_5703.JPG.jpeg",
    initialView: { yaw: 1, pitch: -2 },
    hotspots: [{ id: "kitchen-to-living", target: "living-room", position: { yaw: 83, pitch: -4 } }],
    floorPlan: { x: 100, y: 0, w: 78, h: 85, camera: { x: 139, y: 27 }, northOffset: 176 },
  },
  {
    id: "bedroom",
    title: { ta: "படுக்கையறை", en: "Bedroom" },
    summary: {
      ta: "நீல நிற அலங்காரச் சுவர், உள்ளமைந்த அலமாரி மற்றும் டிரஸ்ஸிங் யூனிட்",
      en: "Turquoise feature wall, built-in wardrobe and dressing unit",
    },
    features: {
      ta: [
        "பிரகாசமான நீல நிற அலங்காரச் சுவர்",
        "மேகம் போன்ற வேலைப்பாடுடன் மேற்கூரை, துணி அலங்காரம்",
        "கண்ணாடியுடன் டிரஸ்ஸிங் யூனிட் கொண்ட உள்ளமைந்த அலமாரி",
        "கட்டில் மற்றும் LED விளக்குகள்",
        "இரண்டு மரக் கதவுகள், திரைச்சீலை வாசல்",
      ],
      en: [
        "Bright turquoise feature wall",
        "Textured cloud-pattern ceiling with fabric pelmet",
        "Built-in wardrobe with mirrored dressing unit",
        "Bed and LED lighting",
        "Two wooden doors and a curtained doorway",
      ],
    },
    panorama: pano("bedroom"),
    source: "IMG_5705.JPG.jpeg",
    initialView: { yaw: -5.6, pitch: -1 },
    hotspots: [{ id: "bedroom-to-living", target: "living-room", position: { yaw: -54, pitch: -2 } }],
    floorPlan: { x: 45, y: -72, w: 95, h: 72, camera: { x: 95, y: -35 }, northOffset: 263 },
  },
];

export const sceneById = Object.fromEntries(scenes.map((s) => [s.id, s])) as Record<SceneId, Scene>;

export const defaultSceneId: SceneId = "living-room";

/**
 * Horizontal field of view the visitor sees, in degrees.
 * - initialHfov: when a room opens (and after "recenter")
 * - maxHfov: fully zoomed out (180° = the whole half of the room)
 * - minHfov: fully zoomed in
 */
export const viewSettings = { initialHfov: 114, maxHfov: 180, minHfov: 40 };

/** Order used by the guided tour. */
export const guidedTourOrder: SceneId[] = ["living-room", "kitchen", "bedroom"];

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === "string" && value in sceneById;
}

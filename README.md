# Home 360 — 360° Virtual Home Tour

An immersive 360° walkthrough of a real home (living room, kitchen & dining, bedroom), built with Next.js 16, TypeScript, Tailwind CSS 4 and Photo Sphere Viewer. It has a Tamil AI voice guide and controllable background music.

```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
```

## Features

| Feature | Notes |
| --- | --- |
| 360° viewer | Drag, pinch/scroll zoom, keyboard, fullscreen, auto-rotate, touch. Opens at a 114° view and zooms out to a full 180° wide-angle view (set in `viewSettings`, `src/config/tour.ts`). Each room opens on its `initialView` (in `src/config/tour.ts`), both at the start and after every room change. The start screen fades away into the first room. Moving between rooms is a smooth 1.1 s crossfade with no camera movement: the current frame is frozen on an overlay and dissolved into the new room. All rooms are preloaded once the first one is showing. On desktop, hotspot labels stay hidden until the cursor comes near. Panoramas are 8K on high-DPI desktops, with mipmapped, anisotropic texture filtering. 6K on tablets and standard desktops, 4K on phones |
| Hotspots | Placed on the real doorways: living room ↔ kitchen, living room ↔ bedroom |
| Tamil AI voice guide | Narrates each room on entry or from the AI button. Play, pause, resume, stop and replay controls, Tamil/English subtitles synced per sentence |
| Background music | Original ambient loop with on/off, mute, volume and seamless looping. The music ducks to 20% while the guide speaks |
| Reference-matched UI | Left toolbar, logo top-right, measurement label, large room title bottom-left, white hotspot pills, floating WhatsApp button |
| Extras | Rooms menu with visited ticks, schematic floor plan with a live view cone, room info panel, thumbnail strip, guided tour, share links (Facebook, X, WhatsApp, copy), QR code, Tamil/English toggle, deep links (`?scene=kitchen&lang=en&yaw=40&pitch=-5`) |

## Where things live

```
src/config/tour.ts         scenes, hotspots, floor-plan layout, property info  ← edit here
src/config/narration.ts    Tamil + English narration (one sentence = one clip/subtitle)
src/config/i18n.ts         UI strings
src/types/tour.ts          shared types
src/components/viewer/     Photo Sphere Viewer wrapper
src/components/tour/       toolbar, panels, assistant, overlays, TourApp (state orchestration)
src/lib/audio/             Narrator (voice fallback chain), MusicPlayer (Web Audio + ducking)
src/app/api/tts/           optional neural TTS proxy (server-side keys)
scripts/                   asset pipelines (panoramas, narration, music)
assets/                    original Insta360 X5 .insp captures
```

## Asset pipeline

**Panoramas.** The `.insp` files are Insta360 X5 dual-fisheye JPEGs. `scripts/panorama/` reads each file's factory lens calibration from its trailer and stitches the two lenses into an equirectangular image. It uses a unified omnidirectional lens model and a jointly fitted lens alignment. The two lenses are joined along an optimal seam: the path in their overlap where both agree best, so moving objects like a spinning fan come from one lens instead of ghosting. Blending and all filters are wrap-aware, so there's no line at the ±180° edge. A nadir cap hides the tripod. Outputs go to `public/panoramas/`.

```bash
python3 -m venv .venv-pano && .venv-pano/bin/pip install -r scripts/panorama/requirements.txt
.venv-pano/bin/python scripts/panorama/build_panoramas.py
```

**Narration audio.** The guide has two characters with native Tamil Nadu neural voices: **Pallavi** (female, `ta-IN-PallaviNeural`) and **Valluvar** (male, `ta-IN-ValluvarNeural`). The same voice reads both languages, so the English narration keeps a natural Tamil accent. Visitors pick a guide on the start screen or in the AI panel, and the choice is remembered on their device. Characters and voices live in `src/config/voices.ts`.

`npm run narration:render` renders one MP3 per sentence, per character and per language, plus `manifest.json`. It needs ffmpeg and runs one of two ways:

- **Azure Speech (recommended for production):** set `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. This is the official API and is licensed for commercial use. The free tier covers this script many times over.
- **Without a key:** it uses `edge-tts` (`python3 -m venv .venv-tts && .venv-tts/bin/pip install -r scripts/narration/requirements.txt`). That's the same Microsoft voices through the Edge read-aloud service, which is fine for development and demos. Re-render with an Azure key before a commercial launch.

Re-run the script after editing `narration.ts` or `voices.ts`.

**Music.** `scripts/music/generate_ambient.py` synthesizes the original loop in `public/audio/music/` (tanpura drone with plucks in raga Mohanam). Set `NEXT_PUBLIC_MUSIC_URL` to use your own track instead.

## Voice engine fallback

For each sentence the guide tries these in order:

1. **Live TTS API**, if `TTS_PROVIDER` is configured (Azure, Google or ElevenLabs; see `.env.example`). It follows the selected guide character. Keys stay on the server. `/api/tts` only synthesizes sentences from `narration.ts`, so it can't be used as an open proxy.
2. **Pre-rendered Tamil Nadu voice clips** in `public/audio/narration/<character>/<lang>/`. This is the default and works in every browser with no key.
3. **Browser speech synthesis** with a `ta-IN` voice.
4. **Timed subtitles only**, if no voice is available. The guided tour still advances.

## Honesty notes

- **Assets.** The supplied captures show a different home from the reference screenshots. The tour uses only these three real rooms; there's no portico or staircase.
- **Measurements.** No room was measured, so the measurement label reads "Not measured". Add `dimensions: '10\'0" x 12\'0"'` to a scene in `tour.ts` once you have real figures.
- **Floor plan.** The plan is a schematic, labelled "not to scale". Room positions come from matching doorway directions between panoramas.
- **Bedroom link.** The living room ↔ bedroom connection is inferred from the matching maroon curtain fabric seen in both rooms. If it's the other curtained doorway, change the `living-to-bedroom` yaw in `tour.ts` (the left curtain is at about 1°).
- **Privacy.** The `.insp` files contain GPS coordinates in their EXIF data. The tour doesn't use them, and the published panoramas are re-encoded without metadata. Keep the raw `assets/` folder private if you deploy from this repo.

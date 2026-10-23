import type { Localized } from "@/types/tour";

/**
 * Guide characters. Each one is a single native Tamil Nadu (ta-IN) neural
 * voice that narrates BOTH languages, so the English narration carries the
 * same natural Tamil accent instead of switching to a different speaker.
 *
 * `voices` are Microsoft neural voice names (used by the pre-render script and
 * the optional Azure runtime provider). To use a separate Indian-English voice
 * for English, set e.g. `en: "en-IN-NeerjaNeural"`.
 */
export interface VoiceCharacter {
  id: "pallavi" | "valluvar";
  name: Localized;
  gender: "female" | "male";
  voices: { ta: string; en: string };
  /** SSML-style rate adjustments, e.g. "-5%". */
  rate: { ta: string; en: string };
}

export const voiceCharacters: VoiceCharacter[] = [
  {
    id: "pallavi",
    name: { ta: "பல்லவி", en: "Pallavi" },
    gender: "female",
    voices: { ta: "ta-IN-PallaviNeural", en: "ta-IN-PallaviNeural" },
    rate: { ta: "-6%", en: "-4%" },
  },
  {
    id: "valluvar",
    name: { ta: "வள்ளுவர்", en: "Valluvar" },
    gender: "male",
    voices: { ta: "ta-IN-ValluvarNeural", en: "ta-IN-ValluvarNeural" },
    rate: { ta: "-6%", en: "-4%" },
  },
];

export type VoiceCharacterId = VoiceCharacter["id"];

export const defaultCharacterId: VoiceCharacterId = "pallavi";

export function isCharacterId(value: unknown): value is VoiceCharacterId {
  return voiceCharacters.some((c) => c.id === value);
}

export function getCharacter(id: VoiceCharacterId): VoiceCharacter {
  return voiceCharacters.find((c) => c.id === id) ?? voiceCharacters[0];
}

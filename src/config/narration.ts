import type { NarrationScript } from "@/types/tour";

/**
 * Room narration, split into sentences. Each sentence is one audio clip and
 * one subtitle line, so subtitles stay in sync on every voice engine.
 *
 * Descriptions only mention what is visible in the panoramas.
 * Pre-rendered audio: `npm run narration:render` (macOS voices Vani / Tara).
 */
export const narration: NarrationScript = {
  ta: {
    welcome: [
      { text: "வணக்கம்! Home 360 மெய்நிகர் வீட்டுச் சுற்றுலாவிற்கு உங்களை அன்புடன் வரவேற்கிறோம்." },
      { text: "திரையை இழுத்து எல்லாத் திசைகளிலும் பாருங்கள். வெள்ளைப் புள்ளிகளைத் தொட்டு அடுத்த அறைக்குச் செல்லலாம்." },
    ],
    "living-room": [
      { text: "இது இந்த வீட்டின் வரவேற்பறை." },
      { text: "மஞ்சள் நிறச் சுவர்களுக்கு நடுவே, தங்க நிற மூங்கில் ஓவியம் வரையப்பட்ட அடர் பச்சைச் சுவர் இந்த அறைக்குத் தனி அழகைத் தருகிறது." },
      { text: "அமர்ந்து ஓய்வெடுக்க இரண்டு சோஃபாக்கள், அலங்காரப் பொருட்கள் நிறைந்த கண்ணாடி அலமாரி, மற்றும் டிவி மேசை இங்கே உள்ளன." },
      { text: "மேற்கூரையில் அலங்கார வேலைப்பாடும் மின்விசிறியும் உள்ளன. தரையில் வெண்மையான டைல்ஸ் பதிக்கப்பட்டுள்ளது." },
      { text: "பச்சைச் சுவர் அருகே உள்ள வாசல் வழியாகச் சமையலறைக்கும், சிவப்புத் திரைச்சீலை உள்ள வாசல் வழியாகப் படுக்கையறைக்கும் செல்லலாம்." },
    ],
    kitchen: [
      { text: "இது சமையலறை மற்றும் உணவருந்தும் பகுதி." },
      { text: "கருப்பு கிரானைட் சமையல் மேடை, எரிவாயு அடுப்பு, பூ வடிவ டைல்ஸ் பதித்த சுவர், மற்றும் குடிநீர் சுத்திகரிப்பான் இங்கே உள்ளன." },
      { text: "பாத்திரங்களை வைக்கத் திறந்த அலமாரிகளும், மேலே பொருட்களைச் சேமிக்கப் பரணும் உள்ளன. அருகிலேயே குளிர்சாதனப் பெட்டியும் இருக்கிறது." },
      { text: "மறுபுறம், நாற்காலிகளுடன் கூடிய உணவு மேசை, கை கழுவும் தொட்டி, மற்றும் காற்றோட்டத்திற்கான ஜன்னல் உள்ளன." },
      { text: "வலதுபுற வாசல் வழியாக மீண்டும் வரவேற்பறைக்குச் செல்லலாம்." },
    ],
    bedroom: [
      { text: "இது படுக்கையறை." },
      { text: "பிரகாசமான நீல நிறச் சுவரும், மேகம் போன்ற வேலைப்பாடுடன் கூடிய மேற்கூரையும் இந்த அறைக்குத் தனித்துவம் தருகின்றன." },
      { text: "கண்ணாடியுடன் கூடிய டிரஸ்ஸிங் யூனிட் கொண்ட உள்ளமைந்த அலமாரி, துணிகளைச் சேமிக்க விசாலமான இடத்தைத் தருகிறது." },
      { text: "கட்டில், சுவரில் படங்கள், மற்றும் LED விளக்குகள் இங்கே உள்ளன." },
      { text: "சிவப்புத் திரைச்சீலை உள்ள வாசல் வழியாக வரவேற்பறைக்குத் திரும்பலாம்." },
    ],
  },
  en: {
    welcome: [
      { text: "Welcome to the Home 360 virtual home tour." },
      { text: "Drag to look around in every direction, and tap the white points to move to the next room." },
    ],
    "living-room": [
      { text: "This is the living room." },
      { text: "Warm yellow walls frame a deep green feature wall decorated with gold bamboo stencil art." },
      { text: "There are two sofas to relax on, a glass display cabinet full of keepsakes, and a TV unit." },
      { text: "The ceiling has decorative detailing and a fan, and the floor is finished in white tiles." },
      { text: "The doorway beside the green wall leads to the kitchen, and the red-curtained doorway leads to the bedroom." },
    ],
    kitchen: [
      { text: "This is the kitchen and dining area." },
      { text: "It has a black granite counter with a gas stove, a floral tiled backsplash, and a water purifier." },
      { text: "Open shelves hold the utensils, with a storage loft above, and the refrigerator stands right beside them." },
      { text: "On the other side there is a dining table with chairs, a wash basin, and a window for ventilation." },
      { text: "The doorway on the right takes you back to the living room." },
    ],
    bedroom: [
      { text: "This is the bedroom." },
      { text: "A bright turquoise wall and a textured, cloud-pattern ceiling give this room its own character." },
      { text: "The built-in wardrobe with a mirrored dressing unit offers plenty of storage." },
      { text: "There is a bed, pictures on the wall, and LED lighting." },
      { text: "The red-curtained doorway takes you back to the living room." },
    ],
  },
};

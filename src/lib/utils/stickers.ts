export interface Sticker {
  id: string;
  name: string;
  image: string; // path under /stickers/
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: string;
}

// Blobcat sticker catalog — images from Tirifto's Blobcats (Free Art Licence) & tastytea (CC0)
export const STICKERS: Sticker[] = [
  // Cleaning / household
  { id: 'clean-cat', name: 'Putzkatze', image: 'blobcat_clean.svg', description: 'Alles blitzeblank!', rarity: 'common', category: 'cleaning' },
  { id: 'sparkle-proud', name: 'Glitzerkatze', image: 'blobcat_sparkling_proud.svg', description: 'Stolz auf die Sauberkeit', rarity: 'uncommon', category: 'cleaning' },
  { id: 'hammer-cat', name: 'Handwerkerkatze', image: 'blobcat_hammer.svg', description: 'Hier wird angepackt!', rarity: 'uncommon', category: 'cleaning' },
  { id: 'in-box', name: 'Kartonkatze', image: 'blobcat_in_box.svg', description: 'Alles eingeräumt', rarity: 'rare', category: 'cleaning' },

  // Plants / garden
  { id: 'rose-red', name: 'Rosenkatze', image: 'blobcat_rose_red.svg', description: 'Eine rote Rose für dich', rarity: 'common', category: 'plants' },
  { id: 'rose-pink', name: 'Blümchenkatze', image: 'blobcat_rose_pink.svg', description: 'Rosarote Blütenträume', rarity: 'common', category: 'plants' },
  { id: 'strawberry', name: 'Erdbeerkatze', image: 'blobcat_strawberry.svg', description: 'Erntezeit!', rarity: 'uncommon', category: 'plants' },
  { id: 'earth-cat', name: 'Erdkatze', image: 'blobcat_earth.svg', description: 'Die ganze Welt ist ein Garten', rarity: 'rare', category: 'plants' },

  // Kitchen / cooking
  { id: 'cutlery', name: 'Besteckkatze', image: 'blobcat_cutlery.svg', description: 'Messer und Gabel bereit', rarity: 'common', category: 'kitchen' },
  { id: 'cupcake', name: 'Muffinkatze', image: 'blobcat_cupcake.svg', description: 'Süße Belohnung!', rarity: 'common', category: 'kitchen' },
  { id: 'eating-cupcake', name: 'Naschkatze', image: 'blobcat_eating_cupcake.svg', description: 'Nom nom nom', rarity: 'uncommon', category: 'kitchen' },
  { id: 'pot-cat', name: 'Topfkatze', image: 'blobcat_pot.svg', description: 'Was köchelt da?', rarity: 'uncommon', category: 'kitchen' },
  { id: 'hungry', name: 'Hungrige Katze', image: 'blobcat_hungry_cutlery.svg', description: 'Wann gibt\'s Essen?', rarity: 'rare', category: 'kitchen' },

  // Errands
  { id: 'profit', name: 'Geschäftskatze', image: 'blobcat_profit.svg', description: 'Guter Deal!', rarity: 'common', category: 'errands' },
  { id: 'idea-cat', name: 'Ideenkatze', image: 'blobcat_idea.svg', description: 'Heureka!', rarity: 'uncommon', category: 'errands' },

  // General / universal — positive emotions
  { id: 'happy', name: 'Zufriedene Katze', image: 'blobcat_content.svg', description: 'Alles gut!', rarity: 'common', category: 'general' },
  { id: 'heart', name: 'Herzkatze', image: 'blobcat_heart.svg', description: 'Mit Liebe gemacht', rarity: 'common', category: 'general' },
  { id: 'heart-eyes', name: 'Verliebte Katze', image: 'blobcat_heart_eyes.svg', description: 'So schön!', rarity: 'common', category: 'general' },
  { id: 'hooray', name: 'Jubelkatze', image: 'blobcat_hooray.svg', description: 'Hurra!', rarity: 'common', category: 'general' },
  { id: 'waving', name: 'Winkende Katze', image: 'blobcat_waving.svg', description: 'Hallo!', rarity: 'common', category: 'general' },
  { id: 'laughing', name: 'Lachkatze', image: 'blobcat_laughing.svg', description: 'Hahaha!', rarity: 'common', category: 'general' },
  { id: 'thumbs-up', name: 'Daumen-hoch-Katze', image: 'blobcat_thumbs_up.svg', description: 'Super gemacht!', rarity: 'uncommon', category: 'general' },
  { id: 'sparkle-eyes', name: 'Funkelkatze', image: 'blobcat_sparkle_eyes.svg', description: 'Augen wie Sterne', rarity: 'uncommon', category: 'general' },
  { id: 'finger-guns', name: 'Fingerpistolenkatze', image: 'blobcat_finger_guns.svg', description: 'Pew pew!', rarity: 'uncommon', category: 'general' },
  { id: 'proud', name: 'Stolze Katze', image: 'blobcat_proud.svg', description: 'Richtig gut!', rarity: 'uncommon', category: 'general' },

  // Achievement / reward
  { id: 'crown', name: 'Königskatze', image: 'blobcat_crown.svg', description: 'Majestätisch!', rarity: 'rare', category: 'achievement' },
  { id: 'cool', name: 'Coole Katze', image: 'blobcat_cool.svg', description: 'Eiskalt erledigt', rarity: 'rare', category: 'achievement' },
  { id: 'hero', name: 'Heldenkatze', image: 'blobcat_hero.svg', description: 'Held des Tages!', rarity: 'rare', category: 'achievement' },
  { id: '10-of-10', name: 'Perfekte Katze', image: 'blobcat_sign_10_of_10.svg', description: '10 von 10!', rarity: 'rare', category: 'achievement' },
  { id: 'birthday', name: 'Geburtstagskatze', image: 'blobcat_birthday.svg', description: 'Party!', rarity: 'rare', category: 'achievement' },

  // Cozy / relaxed
  { id: 'sleeping', name: 'Schlafkatze', image: 'blobcat_sleeping.svg', description: 'Zzzzz...', rarity: 'uncommon', category: 'cozy' },
  { id: 'tea', name: 'Teekatze', image: 'blobcat_drinking_tea.svg', description: 'Erstmal Tee', rarity: 'uncommon', category: 'cozy' },
  { id: 'cocoa', name: 'Kakaokatze', image: 'blobcat_drinking_cocoa.svg', description: 'Mmh, Kakao!', rarity: 'uncommon', category: 'cozy' },
  { id: 'book', name: 'Lesekatze', image: 'blobcat_book.svg', description: 'Ein gutes Buch', rarity: 'rare', category: 'cozy' },
  { id: 'blanket', name: 'Deckenkatze', image: 'blobcat_blanket.svg', description: 'Eingekuschelt', rarity: 'rare', category: 'cozy' },
  { id: 'teapot', name: 'Teekannenkatze', image: 'blobcat_teapot.svg', description: 'Tee ist fertig!', rarity: 'rare', category: 'cozy' },

  // Rare / special
  { id: 'rainbow', name: 'Regenbogenkatze', image: 'blobcat_rainbow.svg', description: 'Alle Farben!', rarity: 'rare', category: 'special' },
  { id: 'angel', name: 'Engelskatze', image: 'blobcat_angel.svg', description: 'Himmlisch!', rarity: 'rare', category: 'special' },
  { id: 'scientist', name: 'Wissenschaftskatze', image: 'blobcat_scientist.svg', description: 'Für die Wissenschaft!', rarity: 'rare', category: 'special' },

  // Quirky / cute (general pool — drops for any task)
  { id: 'adorable', name: 'Süße Katze', image: 'blobcat_adorable.svg', description: 'Unwiderstehlich süß!', rarity: 'uncommon', category: 'general' },
  { id: 'adoring', name: 'Bewundernde Katze', image: 'blobcat_adoring.svg', description: 'So toll!', rarity: 'common', category: 'general' },
  { id: 'joyful-surprise', name: 'Überraschte Katze', image: 'blobcat_joyful_surprise.svg', description: 'Oh! Was ist das?', rarity: 'uncommon', category: 'general' },
  { id: 'purring', name: 'Schnurrkatze', image: 'blobcat_purring.svg', description: 'Prrrrr...', rarity: 'common', category: 'general' },
  { id: 'x3', name: 'x3-Katze', image: 'blobcat_x3.svg', description: 'x3 UwU', rarity: 'rare', category: 'general' },
  { id: 'heart-tastytea', name: 'Liebevolle Katze', image: 'blobcat_heart_tastytea.svg', description: 'Ganz viel Liebe!', rarity: 'uncommon', category: 'general' },
  { id: 'blobcat-classic', name: 'Klassikatze', image: 'blobcat.svg', description: 'Die Originalkatze', rarity: 'rare', category: 'general' },

  // Legendary
  { id: 'astronaut', name: 'Astronautenkatze', image: 'blobcat_astronaut.svg', description: 'Ab ins All!', rarity: 'legendary', category: 'special' },
  { id: 'space', name: 'Weltraumkatze', image: 'blobcat_space.svg', description: 'Zwischen den Sternen', rarity: 'legendary', category: 'special' },
  { id: 'robot', name: 'Roboterkatze', image: 'blobcat_robot.svg', description: 'Beep boop!', rarity: 'legendary', category: 'special' },
  { id: 'ghost', name: 'Geisterkatze', image: 'blobcat_ghost.svg', description: 'Buuuuh!', rarity: 'legendary', category: 'special' },
];

// Tag to sticker category mapping
const TAG_CATEGORY_MAP: Record<string, string[]> = {
  'putzen': ['cleaning', 'general'],
  'saugen': ['cleaning', 'general'],
  'wischen': ['cleaning', 'general'],
  'bad': ['cleaning', 'general'],
  'küche': ['kitchen', 'cleaning', 'general'],
  'kochen': ['kitchen', 'general'],
  'abwasch': ['kitchen', 'cleaning', 'general'],
  'wäsche': ['cleaning', 'general'],
  'bügeln': ['cleaning', 'general'],
  'pflanzen': ['plants', 'general'],
  'gießen': ['plants', 'general'],
  'düngen': ['plants', 'general'],
  'garten': ['plants', 'general'],
  'einkaufen': ['errands', 'general'],
  'müll': ['cleaning', 'general'],
};

// Rarity weights per difficulty (higher = more likely)
// low: mostly common, rare/legendary very unlikely
// medium (default): balanced distribution
// high: rare and legendary much more likely
const DIFFICULTY_RARITY_WEIGHTS: Record<string, Record<string, number>> = {
  low:    { common: 65, uncommon: 25, rare: 8,  legendary: 2 },
  medium: { common: 50, uncommon: 30, rare: 15, legendary: 5 },
  high:   { common: 25, uncommon: 30, rare: 30, legendary: 15 },
};

export function getStickerForTags(tags: string[], difficulty?: string): Sticker {
  const weights = DIFFICULTY_RARITY_WEIGHTS[difficulty || 'medium'] || DIFFICULTY_RARITY_WEIGHTS.medium;

  // Determine relevant categories from tags
  const categories = new Set<string>();
  for (const tag of tags) {
    const mapped = TAG_CATEGORY_MAP[tag.toLowerCase()];
    if (mapped) {
      mapped.forEach(c => categories.add(c));
    }
  }
  // Always include general + achievement/cozy/special so all stickers can drop
  categories.add('general');
  categories.add('achievement');
  categories.add('cozy');
  categories.add('special');

  // Filter stickers by matching categories
  const pool = STICKERS.filter(s => categories.has(s.category));

  // Weighted random selection by rarity
  const totalWeight = pool.reduce((sum, s) => sum + weights[s.rarity], 0);
  let random = Math.random() * totalWeight;

  for (const sticker of pool) {
    random -= weights[sticker.rarity];
    if (random <= 0) return sticker;
  }

  // Fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getStickerById(id: string): Sticker | undefined {
  return STICKERS.find(s => s.id === id);
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common': return 'var(--nord14)';
    case 'uncommon': return 'var(--nord9)';
    case 'rare': return 'var(--nord15)';
    case 'legendary': return 'var(--nord13)';
    default: return 'var(--nord4)';
  }
}

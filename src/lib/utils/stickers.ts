export interface Sticker {
  id: string;
  name: string;
  image: string; // path under /stickers/
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: string;
}

// Blobcat sticker catalog — images from Tirifto's Blobcats (Free Art Licence)
export const STICKERS: Sticker[] = [
  // Cleaning / household
  { id: 'clean-cat', name: 'Putzkatze', image: 'blobcat_clean.svg', description: 'Alles blitzeblank!', rarity: 'common', category: 'cleaning' },
  { id: 'sparkle-proud', name: 'Glitzerkatze', image: 'blobcat_sparkling_proud.svg', description: 'Stolz auf die Sauberkeit', rarity: 'uncommon', category: 'cleaning' },
  { id: 'in-box', name: 'Kartonkatze', image: 'blobcat_in_box.svg', description: 'Alles eingeräumt', rarity: 'rare', category: 'cleaning' },

  // Plants / garden
  { id: 'rose-red', name: 'Rosenkatze', image: 'blobcat_rose_red.svg', description: 'Eine rote Rose für dich', rarity: 'common', category: 'plants' },
  { id: 'rose-pink', name: 'Blümchenkatze', image: 'blobcat_rose_pink.svg', description: 'Rosarote Blütenträume', rarity: 'common', category: 'plants' },
  { id: 'rose-blue', name: 'Blaue-Rose-Katze', image: 'gutkato_rozo_blua.svg', description: 'Eine blaue Rose', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-yellow', name: 'Gelbe-Rose-Katze', image: 'gutkato_rozo_flava.svg', description: 'Sonnengelbe Blüte', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-green', name: 'Grüne-Rose-Katze', image: 'gutkato_rozo_verda.svg', description: 'Frisches Grün', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-white', name: 'Weiße-Rose-Katze', image: 'gutkato_rozo_blanka.svg', description: 'Reine Eleganz', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-black', name: 'Schwarze-Rose-Katze', image: 'gutkato_rozo_nigra.svg', description: 'Geheimnisvoll', rarity: 'rare', category: 'plants' },
  { id: 'rose-orange', name: 'Orange-Rose-Katze', image: 'gutkato_rozo_oranĝkolora.svg', description: 'Warmer Orangeton', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-violet', name: 'Violette-Rose-Katze', image: 'gutkato_rozo_violkolora.svg', description: 'Königliche Blüte', rarity: 'uncommon', category: 'plants' },
  { id: 'strawberry', name: 'Erdbeerkatze', image: 'blobcat_strawberry.svg', description: 'Erntezeit!', rarity: 'uncommon', category: 'plants' },
  { id: 'earth-cat', name: 'Erdkatze', image: 'blobcat_earth.svg', description: 'Die ganze Welt ist ein Garten', rarity: 'rare', category: 'plants' },

  // Kitchen / cooking
  { id: 'cutlery', name: 'Besteckkatze', image: 'blobcat_cutlery.svg', description: 'Messer und Gabel bereit', rarity: 'common', category: 'kitchen' },
  { id: 'cupcake', name: 'Muffinkatze', image: 'blobcat_cupcake.svg', description: 'Süße Belohnung!', rarity: 'common', category: 'kitchen' },
  { id: 'eating-cupcake', name: 'Naschkatze', image: 'blobcat_eating_cupcake.svg', description: 'Nom nom nom', rarity: 'uncommon', category: 'kitchen' },
  { id: 'pot-cat', name: 'Topfkatze', image: 'blobcat_pot.svg', description: 'Was köchelt da?', rarity: 'uncommon', category: 'kitchen' },
  { id: 'hungry', name: 'Hungrige Katze', image: 'blobcat_hungry_cutlery.svg', description: 'Wann gibt\'s Essen?', rarity: 'rare', category: 'kitchen' },
  { id: 'coffee', name: 'Kaffeekatze', image: 'gutkato_trinkas_kafon.svg', description: 'Erstmal Kaffee', rarity: 'common', category: 'kitchen' },
  { id: 'pizza', name: 'Pizzakatze', image: 'gutkato_manĝas_picon.svg', description: 'Pizza-Zeit!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'cake', name: 'Kuchenkatze', image: 'gutkato_manĝas_kukon.svg', description: 'Ein Stück Kuchen!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'donut', name: 'Donutkatze', image: 'gutkato_manĝas_ringokukon.svg', description: 'Ringkuchenglück', rarity: 'uncommon', category: 'kitchen' },
  { id: 'pretzel', name: 'Brezelkatze', image: 'gutkato_manĝas_brecon.svg', description: 'Frisch vom Bäcker', rarity: 'uncommon', category: 'kitchen' },
  { id: 'croissant', name: 'Kornbulkakatze', image: 'gutkato_manĝas_kornbulkon.svg', description: 'Buttrig und frisch', rarity: 'uncommon', category: 'kitchen' },
  { id: 'waffle', name: 'Waffelkatze', image: 'gutkato_manĝas_vaflon.svg', description: 'Goldig gebacken', rarity: 'uncommon', category: 'kitchen' },
  { id: 'sandwich', name: 'Sandwichkatze', image: 'gutkato_manĝas_sandviĉon.svg', description: 'Herzhaft belegt', rarity: 'uncommon', category: 'kitchen' },
  { id: 'ice-cream', name: 'Eiskatze', image: 'gutkato_manĝas_glaciaĵon.svg', description: 'Kalt und lecker!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'water', name: 'Wasserkatze', image: 'gutkato_trinkas_akvon.svg', description: 'Schluck für Schluck', rarity: 'common', category: 'kitchen' },
  { id: 'juice', name: 'Saftkatze', image: 'gutkato_trinkas_sukon.svg', description: 'Fruchtig frisch', rarity: 'common', category: 'kitchen' },
  { id: 'oven-mitts', name: 'Ofenhandschuhkatze', image: 'gutkato_fornogantoj.svg', description: 'Heiß, aber sicher!', rarity: 'uncommon', category: 'kitchen' },

  // Errands
  { id: 'profit', name: 'Geschäftskatze', image: 'blobcat_profit.svg', description: 'Guter Deal!', rarity: 'common', category: 'errands' },
  { id: 'idea-cat', name: 'Ideenkatze', image: 'blobcat_idea.svg', description: 'Heureka!', rarity: 'uncommon', category: 'errands' },
  { id: 'laptop', name: 'Laptopkatze', image: 'gutkato_klapkomputilo.svg', description: 'Alles erledigt!', rarity: 'uncommon', category: 'errands' },
  { id: 'phone', name: 'Handykatze', image: 'gutkato_poŝtelefono.svg', description: 'Immer erreichbar', rarity: 'common', category: 'errands' },

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
  { id: 'giggling', name: 'Kicherkatze', image: 'gutkato_hihias.svg', description: 'Hihihi!', rarity: 'common', category: 'general' },
  { id: 'having-fun', name: 'Spaßkatze', image: 'gutkato_amuziĝas.svg', description: 'Macht Spaß!', rarity: 'common', category: 'general' },
  { id: 'wink', name: 'Zwinkerkatze', image: 'gutkato_palpebrosigno.svg', description: '*zwinker*', rarity: 'common', category: 'general' },
  { id: 'wink-tongue', name: 'Frechkatze', image: 'gutkato_palpebrosigno_lango.svg', description: 'Bleh! ;)', rarity: 'uncommon', category: 'general' },
  { id: 'xd', name: 'xD-Katze', image: 'gutkato_xD.svg', description: 'xDDD', rarity: 'uncommon', category: 'general' },
  { id: 'heart-face', name: 'Schmusekatze', image: 'gutkato_3c.svg', description: 'Ganz viel Liebe!', rarity: 'uncommon', category: 'general' },
  { id: 'blushing', name: 'Errötende Katze', image: 'gutkato_ruĝiĝas.svg', description: '*errötet*', rarity: 'common', category: 'general' },
  { id: 'curious', name: 'Neugierige Katze', image: 'gutkato_scivola.svg', description: 'Oh? Was gibt\'s?', rarity: 'common', category: 'general' },
  { id: 'hug', name: 'Kuschelkatze', image: 'gutkato_ĉirkaŭpreno.svg', description: 'Eine Umarmung für dich', rarity: 'uncommon', category: 'general' },
  { id: 'kyaa', name: 'Kyaa-Katze', image: 'gutkato_kjooo.svg', description: 'Kyaaaa!', rarity: 'uncommon', category: 'general' },
  { id: 'sign-yes', name: 'Ja-Katze', image: 'gutkato_afiŝo_jes.svg', description: 'Auf jeden Fall!', rarity: 'common', category: 'general' },
  { id: 'sign-hello', name: 'Hallo-Katze', image: 'gutkato_afiŝo_sal.svg', description: 'Servus!', rarity: 'common', category: 'general' },
  { id: 'sign-thanks', name: 'Danke-Katze', image: 'gutkato_afiŝo_dank.svg', description: 'Vielen Dank!', rarity: 'common', category: 'general' },
  { id: 'sign-meow', name: 'Miau-Katze', image: 'gutkato_afiŝo_miaŭ.svg', description: 'Miau!', rarity: 'common', category: 'general' },
  { id: 'sign-bye', name: 'Tschüss-Katze', image: 'gutkato_afiŝo_ĝis.svg', description: 'Bis bald!', rarity: 'common', category: 'general' },
  { id: 'tiny', name: 'Mini-Katze', image: 'gutkato_eta.svg', description: 'Ganz klein, ganz lieb', rarity: 'uncommon', category: 'general' },
  { id: 'whiskers', name: 'Schnurrbartkatze', image: 'gutkato_lipharoj.svg', description: 'Prächtige Whiskers', rarity: 'common', category: 'general' },
  { id: 'pacifier', name: 'Schnullerkatze', image: 'gutkato_suĉumo.svg', description: 'Babykätzchen', rarity: 'uncommon', category: 'general' },
  { id: 'sneeze', name: 'Niesikatze', image: 'gutkato_ternas.svg', description: 'Hatschi!', rarity: 'common', category: 'general' },
  { id: 'peek-wall', name: 'Gucklochkatze', image: 'gutkato_post_muro.svg', description: '*späht hervor*', rarity: 'uncommon', category: 'general' },
  { id: 'peek-bread', name: 'Brotkatze', image: 'gutkato_post_pano.svg', description: 'Hinter dem Brot', rarity: 'uncommon', category: 'general' },
  { id: 'whistling', name: 'Pfeifkatze', image: 'gutkato_fajfas_senkulpece.svg', description: '*unschuldig pfeift*', rarity: 'uncommon', category: 'general' },
  { id: 'mischievous', name: 'Schelmenkatze', image: 'gutkato_malica.svg', description: 'Was hat sie vor?', rarity: 'uncommon', category: 'general' },
  { id: 'begging', name: 'Bittkatze', image: 'gutkato_petrigardas.svg', description: 'Bitte bitte?', rarity: 'common', category: 'general' },
  { id: 'nekoneko', name: 'Nekokoneko', image: 'gutkato_nekokoneko.svg', description: 'Katze auf Katze auf Katze', rarity: 'rare', category: 'general' },
  { id: 'cat-blue', name: 'Blaue Katze', image: 'gutkato_blua.svg', description: 'Kühles Blau', rarity: 'uncommon', category: 'general' },
  { id: 'cat-yellow', name: 'Gelbe Katze', image: 'gutkato_flava.svg', description: 'Sonnenschein', rarity: 'uncommon', category: 'general' },
  { id: 'cat-green', name: 'Grüne Katze', image: 'gutkato_verda.svg', description: 'Frisches Grün', rarity: 'uncommon', category: 'general' },
  { id: 'cat-red', name: 'Rote Katze', image: 'gutkato_ruĝa.svg', description: 'Leuchtend rot', rarity: 'uncommon', category: 'general' },
  { id: 'cat-orange', name: 'Orange Katze', image: 'gutkato_oranĝkolora.svg', description: 'Warmes Orange', rarity: 'uncommon', category: 'general' },
  { id: 'cat-purple', name: 'Violette Katze', image: 'gutkato_violkolora.svg', description: 'Königliches Violett', rarity: 'uncommon', category: 'general' },

  // Achievement / reward
  { id: 'crown', name: 'Königskatze', image: 'blobcat_crown.svg', description: 'Majestätisch!', rarity: 'rare', category: 'achievement' },
  { id: 'cool', name: 'Coole Katze', image: 'blobcat_cool.svg', description: 'Eiskalt erledigt', rarity: 'rare', category: 'achievement' },
  { id: 'hero', name: 'Heldenkatze', image: 'blobcat_hero.svg', description: 'Held des Tages!', rarity: 'rare', category: 'achievement' },
  { id: '10-of-10', name: 'Perfekte Katze', image: 'blobcat_sign_10_of_10.svg', description: '10 von 10!', rarity: 'rare', category: 'achievement' },
  { id: 'birthday', name: 'Geburtstagskatze', image: 'blobcat_birthday.svg', description: 'Party!', rarity: 'rare', category: 'achievement' },
  { id: 'cool-guns', name: 'Cool-Pew-Katze', image: 'gutkato_mojosa_fingropafas.svg', description: 'Cool wie kein anderer', rarity: 'rare', category: 'achievement' },
  { id: 'genius', name: 'Geistesblitzkatze', image: 'gutkato_flucerba.svg', description: 'Einfach genial!', rarity: 'rare', category: 'achievement' },
  { id: 'hero-baguette', name: 'Baguettheldkatze', image: 'gutkato_heroo_bastonpano.svg', description: 'Zur Rettung – mit Baguette!', rarity: 'rare', category: 'achievement' },
  { id: 'drummer', name: 'Trommelkatze', image: 'gutkato_tamburo.svg', description: 'Rhythmus im Blut', rarity: 'rare', category: 'achievement' },

  // Cozy / relaxed
  { id: 'sleeping', name: 'Schlafkatze', image: 'blobcat_sleeping.svg', description: 'Zzzzz...', rarity: 'uncommon', category: 'cozy' },
  { id: 'tea', name: 'Teekatze', image: 'blobcat_drinking_tea.svg', description: 'Erstmal Tee', rarity: 'uncommon', category: 'cozy' },
  { id: 'cocoa', name: 'Kakaokatze', image: 'blobcat_drinking_cocoa.svg', description: 'Mmh, Kakao!', rarity: 'uncommon', category: 'cozy' },
  { id: 'book', name: 'Lesekatze', image: 'blobcat_book.svg', description: 'Ein gutes Buch', rarity: 'rare', category: 'cozy' },
  { id: 'stretching', name: 'Reckkatze', image: 'gutkato_etendas_piedojn.svg', description: 'Ausgestreckt und entspannt', rarity: 'uncommon', category: 'cozy' },
  { id: 'headphones', name: 'Kopfhörerkatze', image: 'gutkato_kapaŭskultiloj.svg', description: 'Chill-Beats', rarity: 'uncommon', category: 'cozy' },
  { id: 'glasses', name: 'Brillenkatze', image: 'gutkato_okulvitroj.svg', description: 'Gemütlich am Studieren', rarity: 'uncommon', category: 'cozy' },
  { id: 'yawn', name: 'Gähnkatze', image: 'gutkato_oscedas.svg', description: '*gääähn*', rarity: 'uncommon', category: 'cozy' },

  // Rare / special
  { id: 'rainbow', name: 'Regenbogenkatze', image: 'blobcat_rainbow.svg', description: 'Alle Farben!', rarity: 'rare', category: 'special' },
  { id: 'angel', name: 'Engelskatze', image: 'blobcat_angel.svg', description: 'Himmlisch!', rarity: 'rare', category: 'special' },
  { id: 'scientist', name: 'Wissenschaftskatze', image: 'blobcat_scientist.svg', description: 'Für die Wissenschaft!', rarity: 'rare', category: 'special' },
  { id: 'painter', name: 'Künstlerkatze', image: 'gutkato_pentristo.svg', description: 'Ein Meisterwerk!', rarity: 'rare', category: 'special' },
  { id: 'gentleman', name: 'Gentlemankatze', image: 'gutkato_ĝentilviro.svg', description: 'Eleganz pur', rarity: 'rare', category: 'special' },
  { id: 'duo', name: 'Doppelkatze', image: 'gutkatoj_duopo.svg', description: 'Zu zweit geht\'s besser', rarity: 'rare', category: 'special' },
  { id: 'trio', name: 'Triokatze', image: 'gutkatoj_triopo.svg', description: 'Dreifaches Glück', rarity: 'legendary', category: 'special' },
  { id: 'detective', name: 'Detektivkatze', image: 'gutkato_grandiga_vitro.svg', description: 'Auf Spurensuche', rarity: 'rare', category: 'special' },
  { id: 'doctor', name: 'Doktorkatze', image: 'gutkato_kuracisto.svg', description: 'Gute Besserung!', rarity: 'rare', category: 'special' },
  { id: 'mail-carrier', name: 'Postkatze', image: 'gutkato_leterportisto.svg', description: 'Post ist da!', rarity: 'rare', category: 'special' },

  // Quirky / cute (general pool — drops for any task)
  { id: 'adorable', name: 'Süße Katze', image: 'blobcat_adorable.svg', description: 'Unwiderstehlich süß!', rarity: 'uncommon', category: 'general' },
  { id: 'adoring', name: 'Bewundernde Katze', image: 'blobcat_adoring.svg', description: 'So toll!', rarity: 'common', category: 'general' },
  { id: 'joyful-surprise', name: 'Überraschte Katze', image: 'blobcat_joyful_surprise.svg', description: 'Oh! Was ist das?', rarity: 'uncommon', category: 'general' },
  { id: 'purring', name: 'Schnurrkatze', image: 'blobcat_purring.svg', description: 'Prrrrr...', rarity: 'common', category: 'general' },
  { id: 'x3', name: 'x3-Katze', image: 'blobcat_x3.svg', description: 'x3 UwU', rarity: 'rare', category: 'general' },
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

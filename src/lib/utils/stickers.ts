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
  { id: 'sparkle-proud', name: 'Selbstzufriedene Katze', image: 'blobcat_sparkling_proud.svg', description: 'Stolz auf die Sauberkeit', rarity: 'uncommon', category: 'cleaning' },
  { id: 'in-box', name: 'Kartonkatze', image: 'blobcat_in_box.svg', description: 'Alles eingeräumt', rarity: 'rare', category: 'cleaning' },

  // Plants / garden
  { id: 'rose-red', name: 'Rosenkatze', image: 'blobcat_rose_red.svg', description: 'Eine rote Rose für dich', rarity: 'common', category: 'plants' },
  { id: 'rose-pink', name: 'Blümchenkatze', image: 'blobcat_rose_pink.svg', description: 'Rosarote Blütenträume', rarity: 'common', category: 'plants' },
  { id: 'rose-blue', name: 'Blaue-Rose-Katze', image: 'gutkato_rozo_blua.svg', description: 'Eine blaue Rose', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-yellow', name: 'Gelbe-Rose-Katze', image: 'gutkato_rozo_flava.svg', description: 'Sonnengelbe Blüte', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-green', name: 'Grüne-Rose-Katze', image: 'gutkato_rozo_verda.svg', description: 'Frisches Grün', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-white', name: 'Weisse-Rose-Katze', image: 'gutkato_rozo_blanka.svg', description: 'Reine Eleganz', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-black', name: 'Schwarze-Rose-Katze', image: 'gutkato_rozo_nigra.svg', description: 'Geheimnisvoll', rarity: 'rare', category: 'plants' },
  { id: 'rose-orange', name: 'Orange-Rose-Katze', image: 'gutkato_rozo_oranĝkolora.svg', description: 'Warmer Orangeton', rarity: 'uncommon', category: 'plants' },
  { id: 'rose-violet', name: 'Violette-Rose-Katze', image: 'gutkato_rozo_violkolora.svg', description: 'Königliche Blüte', rarity: 'uncommon', category: 'plants' },
  { id: 'strawberry', name: 'Erdbeerkatze', image: 'blobcat_strawberry.svg', description: 'Erntezeit!', rarity: 'uncommon', category: 'plants' },
  { id: 'earth-cat', name: 'Erdkatze', image: 'blobcat_earth.svg', description: 'Die ganze Welt ist ein Garten', rarity: 'rare', category: 'plants' },

  // Kitchen / cooking
  { id: 'cutlery', name: 'Besteckkatze', image: 'blobcat_cutlery.svg', description: 'Messer und Gabel bereit', rarity: 'common', category: 'kitchen' },
  { id: 'cupcake', name: 'Muffinkatze', image: 'blobcat_cupcake.svg', description: 'Süsse Belohnung!', rarity: 'common', category: 'kitchen' },
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
  { id: 'oven-mitts', name: 'Ofenhandschuhkatze', image: 'gutkato_fornogantoj.svg', description: 'Heiss, aber sicher!', rarity: 'uncommon', category: 'kitchen' },

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
  { id: 'proud', name: 'Zufriedene Katze', image: 'blobcat_proud.svg', description: 'Einfach zufrieden', rarity: 'uncommon', category: 'general' },
  { id: 'giggling', name: 'Kicherkatze', image: 'gutkato_hihias.svg', description: 'Hihihi!', rarity: 'common', category: 'general' },
  { id: 'having-fun', name: 'Spasskatze', image: 'gutkato_amuziĝas.svg', description: 'Macht Spass!', rarity: 'common', category: 'general' },
  { id: 'wink', name: 'Zwinkerkatze', image: 'gutkato_palpebrosigno.svg', description: '*zwinker*', rarity: 'common', category: 'general' },
  { id: 'wink-tongue', name: 'Frechkatze', image: 'gutkato_palpebrosigno_lango.svg', description: 'Bleh! ;)', rarity: 'uncommon', category: 'general' },
  { id: 'xd', name: 'xD-Katze', image: 'gutkato_xD.svg', description: 'xDDD', rarity: 'uncommon', category: 'general' },
  { id: 'heart-face', name: 'Schmusekatze', image: 'gutkato_3c.svg', description: 'Ganz viel Liebe!', rarity: 'uncommon', category: 'general' },
  { id: 'blushing', name: 'Unsichtbare Katze', image: 'gutkato_ruĝiĝas.svg', description: 'Nur noch Umrisse', rarity: 'common', category: 'general' },
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
  { id: 'genius', name: 'Lehnkatze', image: 'gutkato_flucerba.svg', description: 'Lässig angelehnt', rarity: 'rare', category: 'achievement' },
  { id: 'hero-baguette', name: 'Baguettheldkatze', image: 'gutkato_heroo_bastonpano.svg', description: 'Zur Rettung – mit Baguette!', rarity: 'rare', category: 'achievement' },
  { id: 'drummer', name: 'Trommelkatze', image: 'gutkato_tamburo.svg', description: 'Rhythmus im Blut', rarity: 'rare', category: 'achievement' },

  // Cozy / relaxed
  { id: 'sleeping', name: 'Schlafkatze', image: 'blobcat_sleeping.svg', description: 'Zzzzz...', rarity: 'uncommon', category: 'cozy' },
  { id: 'tea', name: 'Teekatze', image: 'blobcat_drinking_tea.svg', description: 'Erstmal Tee', rarity: 'uncommon', category: 'cozy' },
  { id: 'cocoa', name: 'Kakaokatze', image: 'blobcat_drinking_cocoa.svg', description: 'Mmh, Kakao!', rarity: 'uncommon', category: 'cozy' },
  { id: 'book', name: 'Lesekatze', image: 'blobcat_book.svg', description: 'Ein gutes Buch', rarity: 'rare', category: 'cozy' },
  { id: 'stretching', name: 'Greifkatze', image: 'gutkato_etendas_piedojn.svg', description: 'Streckt sich nach dir', rarity: 'uncommon', category: 'cozy' },
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
  { id: 'adorable', name: 'Süsse Katze', image: 'blobcat_adorable.svg', description: 'Unwiderstehlich süss!', rarity: 'uncommon', category: 'general' },
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

  // === Gutkato set (Tirifto's Blobcats, Free Art Licence) — remaining catalogue ===
  // General / Allerlei
  { id: 'g-sign-maybe', name: 'Vielleicht-Katze', image: 'gutkato_afiŝo_eble.svg', description: 'Vielleicht?', rarity: 'uncommon', category: 'general' },
  { id: 'g-sign-no', name: 'Nein-Katze', image: 'gutkato_afiŝo_ne.svg', description: 'Auf keinen Fall!', rarity: 'common', category: 'general' },
  { id: 'g-amused', name: 'Belustigte Katze', image: 'gutkato_amuzetiĝas.svg', description: 'Ganz amüsant', rarity: 'common', category: 'general' },
  { id: 'g-warning', name: 'Warnkatze', image: 'gutkato_averto.svg', description: 'Achtung!', rarity: 'uncommon', category: 'general' },
  { id: 'g-thumbs-down', name: 'Daumen-runter-Katze', image: 'gutkato_dikfingro_malsupren.svg', description: 'Eher nicht...', rarity: 'uncommon', category: 'general' },
  { id: 'g-wide-eyed', name: 'Grossaugenkatze', image: 'gutkato_disokula.svg', description: 'Ganz grosse Augen', rarity: 'uncommon', category: 'general' },
  { id: 'g-fallen', name: 'Umgekippte Katze', image: 'gutkato_falinta.svg', description: 'Einfach umgefallen', rarity: 'uncommon', category: 'general' },
  { id: 'g-dizzy', name: 'Schwindelkatze', image: 'gutkato_kapturniĝas.svg', description: 'Mir wird ganz wirr', rarity: 'uncommon', category: 'general' },
  { id: 'g-gesture', name: 'Gestenkatze', image: 'gutkato_kimegesto.svg', description: 'Komm mal her!', rarity: 'uncommon', category: 'general' },
  { id: 'g-angry', name: 'Wütende Katze', image: 'gutkato_kolera.svg', description: 'Grrr!', rarity: 'uncommon', category: 'general' },
  { id: 'g-annoyed', name: 'Verärgerte Katze', image: 'gutkato_kolereta.svg', description: 'Pfff...', rarity: 'common', category: 'general' },
  { id: 'g-confused', name: 'Verwirrte Katze', image: 'gutkato_konfuzita.svg', description: 'Häää?', rarity: 'uncommon', category: 'general' },
  { id: 'g-realizing', name: 'Erkenntniskatze', image: 'gutkato_konsciiĝas_ion_konsternan.svg', description: 'Oh nein, mir dämmert was...', rarity: 'rare', category: 'general' },
  { id: 'g-slightly-dismayed', name: 'Leicht-bestürzt-Katze', image: 'gutkato_konsternetita.svg', description: 'Ähm, was jetzt?', rarity: 'uncommon', category: 'general' },
  { id: 'g-dismayed', name: 'Bestürzte Katze', image: 'gutkato_konsternita.svg', description: 'Oh weh!', rarity: 'uncommon', category: 'general' },
  { id: 'g-heartbreak', name: 'Herzschmerzkatze', image: 'gutkato_korŝiro.svg', description: 'Schnüff, mein Herz...', rarity: 'rare', category: 'general' },
  { id: 'g-encouraging', name: 'Mutmachkatze', image: 'gutkato_kuraĝigas.svg', description: 'Du schaffst das!', rarity: 'common', category: 'general' },
  { id: 'g-teary', name: 'Tränenkatze', image: 'gutkato_larmas.svg', description: '*schluchz*', rarity: 'uncommon', category: 'general' },
  { id: 'g-despair', name: 'Verzweifelte Katze', image: 'gutkato_malesperas.svg', description: 'Alles ist verloren!', rarity: 'rare', category: 'general' },
  { id: 'g-slightly-despair', name: 'Leicht-verzweifelt-Katze', image: 'gutkato_malesperetas.svg', description: 'Och nö...', rarity: 'uncommon', category: 'general' },
  { id: 'g-sad', name: 'Traurige Katze', image: 'gutkato_malgaja.svg', description: 'Ganz betrübt', rarity: 'uncommon', category: 'general' },
  { id: 'g-rubbing-hands', name: 'Schurkenkatze', image: 'gutkato_malica_kunmetas_manojn.svg', description: 'Mwahaha, mein Plan!', rarity: 'rare', category: 'general' },
  { id: 'g-slightly-sad', name: 'Bedröppelte Katze', image: 'gutkato_malĝojeta.svg', description: 'Ein bisschen traurig', rarity: 'common', category: 'general' },
  { id: 'g-facepalm', name: 'Facepalm-Katze', image: 'gutkato_manfruntas.svg', description: '*Pfote vor Gesicht*', rarity: 'uncommon', category: 'general' },
  { id: 'g-nauseous', name: 'Übelkeitskatze', image: 'gutkato_naŭza.svg', description: 'Mir ist schlecht...', rarity: 'uncommon', category: 'general' },
  { id: 'g-nervous', name: 'Nervöse Katze', image: 'gutkato_nervuma.svg', description: 'Oh je, oh je', rarity: 'common', category: 'general' },
  { id: 'g-neutral', name: 'Neutrale Katze', image: 'gutkato_neŭtrala.svg', description: 'Joa.', rarity: 'common', category: 'general' },
  { id: 'g-thinking', name: 'Denkkatze', image: 'gutkato_pensas.svg', description: 'Hmm...', rarity: 'common', category: 'general' },
  { id: 'g-pondering', name: 'Grübelkatze', image: 'gutkato_pensegas.svg', description: 'Tief in Gedanken', rarity: 'uncommon', category: 'general' },
  { id: 'g-crying', name: 'Weinende Katze', image: 'gutkato_ploras.svg', description: '*heul*', rarity: 'uncommon', category: 'general' },
  { id: 'g-crying-river', name: 'Tränenstrom-Katze', image: 'gutkato_ploras_riveron.svg', description: 'Ströme von Tränen', rarity: 'uncommon', category: 'general' },
  { id: 'g-crying-river2', name: 'Tränenflut-Katze', image: 'gutkato_ploras_riveron_cede.svg', description: 'Eine wahre Sintflut!', rarity: 'rare', category: 'general' },
  { id: 'g-upside-down', name: 'Kopfüberkatze', image: 'gutkato_renversa.svg', description: 'Alles steht Kopf', rarity: 'uncommon', category: 'general' },
  { id: 'g-laughing-dismayed', name: 'Verlegen-lachende Katze', image: 'gutkato_ridas_konsternite.svg', description: 'Haha... oh je', rarity: 'uncommon', category: 'general' },
  { id: 'g-laughing-nervous', name: 'Nervös-lachende Katze', image: 'gutkato_ridas_nervume.svg', description: 'Hehe... ähm', rarity: 'uncommon', category: 'general' },
  { id: 'g-no-mouth', name: 'Mundlose Katze', image: 'gutkato_sen_buŝo.svg', description: '...', rarity: 'uncommon', category: 'general' },
  { id: 'g-squinting', name: 'Schielkatze', image: 'gutkato_strabas.svg', description: 'Was steht da?', rarity: 'uncommon', category: 'general' },
  { id: 'g-surprised', name: 'Überraschte Katze', image: 'gutkato_surprizita.svg', description: 'Oh!', rarity: 'common', category: 'general' },
  { id: 'g-fear-surprise', name: 'Erschrocken-überrascht-Katze', image: 'gutkato_timsurprizita.svg', description: 'Iiieh!', rarity: 'uncommon', category: 'general' },
  { id: 'g-eyeroll', name: 'Augenroll-Katze', image: 'gutkato_turnas_okulojn_supren.svg', description: 'Na toll...', rarity: 'uncommon', category: 'general' },
  { id: 'g-xwx', name: 'xwx-Katze', image: 'gutkato_xwx.svg', description: 'xwx', rarity: 'uncommon', category: 'general' },
  { id: 'g-zipped', name: 'Zugenähte Katze', image: 'gutkato_zipita.svg', description: 'Lippen versiegelt', rarity: 'uncommon', category: 'general' },
  { id: 'g-cringe', name: 'Fremdschämkatze', image: 'gutkato_ĝengrimacas.svg', description: 'Oje, wie peinlich', rarity: 'uncommon', category: 'general' },
  { id: 'g-shrug', name: 'Achselzuckkatze', image: 'gutkato_ŝultrumas.svg', description: 'Schulterzuck', rarity: 'common', category: 'general' },
  { id: 'g-shrug-wide', name: 'Ratlos-Achselzuck-Katze', image: 'gutkato_ŝultrumas_disokule.svg', description: 'Keine Ahnung!', rarity: 'uncommon', category: 'general' },
  // Kitchen / cooking
  { id: 'g-flan', name: 'Puddingkatze', image: 'gutkato_flaŭno.svg', description: 'Wackelpudding!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-hungry-chopsticks', name: 'Hungrige-Stäbchen-Katze', image: 'gutkato_malsata_manĝbastonetoj.svg', description: 'Wann gibt\'s Essen?', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-watermelon', name: 'Melonenkatze', image: 'gutkato_manĝas_akvomelonon.svg', description: 'Saftige Wassermelone', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-eclair', name: 'Eclairkatze', image: 'gutkato_manĝas_bastontorteton.svg', description: 'Cremiges Eclair', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-fish', name: 'Fischkatze', image: 'gutkato_manĝas_fiŝon.svg', description: 'Fang des Tages!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-flan', name: 'Puddingnaschkatze', image: 'gutkato_manĝas_flaŭnon.svg', description: 'Wackelig lecker', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-strawberry', name: 'Erdbeernaschkatze', image: 'gutkato_manĝas_fragon.svg', description: 'Mjam, Erdbeere!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-popsicle', name: 'Eisstielkatze', image: 'gutkato_manĝas_glaciaĵstangon.svg', description: 'Eis am Stiel!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-langos', name: 'Langoschkatze', image: 'gutkato_manĝas_langoŝon.svg', description: 'Frisch frittiert', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-croissant', name: 'Hörnchenkatze', image: 'gutkato_manĝas_lunbulkon.svg', description: 'Buttriges Hörnchen', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-wafer', name: 'Oblatenkatze', image: 'gutkato_manĝas_oblaton.svg', description: 'Knusprige Oblate', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-dumplings', name: 'Teigtaschenkatze', image: 'gutkato_manĝas_pastobuletojn.svg', description: 'Gefüllt und gut', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-riceball', name: 'Onigirikatze', image: 'gutkato_manĝas_rizbulon.svg', description: 'Reisbällchen!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-layercake', name: 'Schichttortenkatze', image: 'gutkato_manĝas_tavolkukon.svg', description: 'Schicht für Schicht', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-tart', name: 'Tortenkatze', image: 'gutkato_manĝas_torton.svg', description: 'Ein Stück Torte', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-eat-cannoli', name: 'Röhrenkuchenkatze', image: 'gutkato_manĝas_tubkukon.svg', description: 'Knusprig gefüllt', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-chopsticks', name: 'Stäbchenkatze', image: 'gutkato_manĝbastonetoj.svg', description: 'Bereit zum Schlemmen', rarity: 'common', category: 'kitchen' },
  { id: 'g-beer', name: 'Bierkatze', image: 'gutkato_trinkas_bieron.svg', description: 'Prost!', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-vienna-coffee', name: 'Wiener-Melange-Katze', image: 'gutkato_trinkas_kafon_vienan.svg', description: 'Ein Wiener Kaffee', rarity: 'uncommon', category: 'kitchen' },
  { id: 'g-milk', name: 'Milchkatze', image: 'gutkato_trinkas_lakton.svg', description: 'Schluck Milch', rarity: 'common', category: 'kitchen' },
  // Cozy / relaxed
  { id: 'g-sleepless', name: 'Schlaflose Katze', image: 'gutkato_sendorma.svg', description: 'Kein Auge zugetan', rarity: 'uncommon', category: 'cozy' },
  { id: 'g-mate', name: 'Matekatze', image: 'gutkato_trinkas_mateon.svg', description: 'Ein Mate gefällig?', rarity: 'uncommon', category: 'cozy' },
  // Plants / garden
  // Cleaning / household
  // Errands
  { id: 'g-loss', name: 'Verlustkatze', image: 'gutkato_malprofito.svg', description: 'Schlechtes Geschäft...', rarity: 'uncommon', category: 'errands' },
  // Achievement / reward
  { id: 'g-sign-0-10', name: 'Null-von-Zehn-Katze', image: 'gutkato_afiŝo_0_el_10.svg', description: '0 von 10... autsch', rarity: 'rare', category: 'achievement' },
  { id: 'g-drumming', name: 'Tischtrommelkatze', image: 'gutkato_tablotamburas.svg', description: 'Trommelwirbel!', rarity: 'rare', category: 'achievement' },
  // Rare / special
  { id: 'g-burning', name: 'Brennende Katze', image: 'gutkato_brulas.svg', description: 'Es brennt lichterloh!', rarity: 'legendary', category: 'special' },
  { id: 'g-this-is-fine', name: 'Alles-gut-Katze', image: 'gutkato_brulas_senzorge.svg', description: 'Alles in bester Ordnung.', rarity: 'legendary', category: 'special' },
  { id: 'g-melting', name: 'Schmelzkatze', image: 'gutkato_degelas.svg', description: 'Ich zerfliesse...', rarity: 'legendary', category: 'special' },
  { id: 'g-devil', name: 'Teufelskatze', image: 'gutkato_diablo.svg', description: 'Kleiner Schlingel!', rarity: 'legendary', category: 'special' },
  { id: 'g-fading', name: 'Verschwindende Katze', image: 'gutkato_dismalaperas.svg', description: 'Schon halb weg...', rarity: 'legendary', category: 'special' },
  { id: 'g-drowning', name: 'Untergehende Katze', image: 'gutkato_dronfeiĉo.svg', description: 'Hilfe, ich versinke!', rarity: 'legendary', category: 'special' },
  { id: 'g-tipsy', name: 'Beschwipste Katze', image: 'gutkato_ebrieta.svg', description: 'Ein Gläschen zu viel', rarity: 'rare', category: 'special' },
  { id: 'g-fire-eyes', name: 'Feueraugenkatze', image: 'gutkato_fajrokuloj.svg', description: 'Voller Entschlossenheit!', rarity: 'rare', category: 'special' },
  { id: 'g-imprisoned', name: 'Gefängniskatze', image: 'gutkato_mallibera.svg', description: 'Lasst mich raus!', rarity: 'rare', category: 'special' },
  { id: 'g-eat-cat', name: 'Katzenfresserkatze', image: 'gutkato_manĝas_gutkaton.svg', description: 'Moment... was isst sie da?!', rarity: 'legendary', category: 'special' },
  { id: 'g-eat-mouse', name: 'Mäusejägerkatze', image: 'gutkato_manĝas_muson.svg', description: 'Beute erlegt!', rarity: 'rare', category: 'special' },
  { id: 'g-dead', name: 'Tote Katze', image: 'gutkato_morta.svg', description: 'X_X', rarity: 'legendary', category: 'special' },
  { id: 'g-dead-ghost', name: 'Geisterwerdende Katze', image: 'gutkato_morta_fantomiĝas.svg', description: 'Tschüss, Welt...', rarity: 'legendary', category: 'special' },
  { id: 'g-crash', name: 'Absturzkatze', image: 'gutkato_paneas.svg', description: 'System abgestürzt', rarity: 'rare', category: 'special' },
  { id: 'g-police', name: 'Polizeikatze', image: 'gutkato_policano.svg', description: 'Halt, Polizei!', rarity: 'rare', category: 'special' },
  { id: 'g-cat-cat', name: 'Versteckkatze', image: 'gutkato_post_gutkato.svg', description: 'Katze hinter Katze', rarity: 'rare', category: 'special' },
  { id: 'g-cat-cat-cat', name: 'Dreifachkatze', image: 'gutkato_post_gutkato_post_gutkato.svg', description: 'Katze auf Katze auf Katze!', rarity: 'legendary', category: 'special' },
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
  'giessen': ['plants', 'general'],
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

// Categories that can drop from ANY task (see getStickerForTags below).
export const ALWAYS_CATEGORIES = ['general', 'achievement', 'cozy', 'special'];

// Reverse of TAG_CATEGORY_MAP: which task tags can drop a given category.
export function getTagsForCategory(category: string): string[] {
  const tags: string[] = [];
  for (const [tag, cats] of Object.entries(TAG_CATEGORY_MAP)) {
    if (cats.includes(category)) tags.push(tag);
  }
  return tags;
}

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

// Probability that a single drop is exactly this sticker, on a task that can
// actually drop it: the always-pool plus the sticker's own category (the same
// pool getStickerForTags builds for a task tagged for this category). Returns a
// value in 0..1. Always-category stickers (general/achievement/cozy/special)
// resolve against the base always-pool, since they can drop from any task.
export function getDropChance(sticker: Sticker, difficulty: string = 'medium'): number {
  const weights = DIFFICULTY_RARITY_WEIGHTS[difficulty] || DIFFICULTY_RARITY_WEIGHTS.medium;

  const categories = new Set<string>(ALWAYS_CATEGORIES);
  categories.add(sticker.category);

  const pool = STICKERS.filter(s => categories.has(s.category));
  const totalWeight = pool.reduce((sum, s) => sum + weights[s.rarity], 0);
  if (totalWeight === 0) return 0;
  return weights[sticker.rarity] / totalWeight;
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

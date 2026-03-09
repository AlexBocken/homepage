// Valid prayer slugs (both languages) — single source of truth
// Used by the [prayer] route for validation and by sync.ts for offline precaching
export const validPrayerSlugs = new Set([
	'das-heilige-kreuzzeichen', 'the-sign-of-the-cross',
	'gloria-patri',
	'paternoster', 'our-father',
	'credo', 'nicene-creed',
	'ave-maria', 'hail-mary',
	'salve-regina',
	'das-fatimagebet', 'fatima-prayer',
	'gloria',
	'gebet-zum-hl-erzengel-michael', 'prayer-to-st-michael-the-archangel',
	'bruder-klaus-gebet', 'prayer-of-st-nicholas-of-flue',
	'josephgebet-des-hl-papst-pius-x', 'prayer-to-st-joseph-by-pope-st-pius-x',
	'das-confiteor', 'the-confiteor',
	'postcommunio',
	'anima-christi',
	'prayer-before-a-crucifix', 'gebet-vor-einem-kruzifix',
	'schutzengel-gebet', 'guardian-angel-prayer',
	'apostolisches-glaubensbekenntnis', 'apostles-creed',
	'tantum-ergo',
	'angelus',
	'regina-caeli',
]);

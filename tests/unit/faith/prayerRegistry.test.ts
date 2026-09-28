import { describe, expect, it } from 'vitest';
import { validPrayerSlugs } from '$lib/data/prayerSlugs';
import { PRAYERS, PRAYER_SLUGS, prayerBySlug, prayerSlug } from '$lib/faith/prayers';

// The slug list as it was written out by hand before it was derived from the
// registry. Any prayer URL that worked then must still work.
const LEGACY_SLUGS = [
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
	'jungfrau-mutter-gottes-mein', 'virgin-mother-of-god',
	'o-meine-gebieterin', 'o-my-queen',
	'gedenke-o-guetigste-jungfrau-maria', 'memorare',
	'hilf-maria-es-ist-zeit', 'help-mary',
	'tischgebet-vor-dem-essen', 'grace-before-meals',
	'tischgebet-nach-dem-essen', 'grace-after-meals'
];

describe('the prayer registry', () => {
	it('opens exactly the slugs the hand-written list did', () => {
		expect(new Set(PRAYER_SLUGS)).toEqual(new Set(LEGACY_SLUGS));
		expect(PRAYER_SLUGS).toHaveLength(LEGACY_SLUGS.length);
		expect(validPrayerSlugs).toEqual(new Set(LEGACY_SLUGS));
	});

	it('has one entry per id, and every slug names one prayer', () => {
		expect(new Set(PRAYERS.map((p) => p.id)).size).toBe(PRAYERS.length);
		for (const slug of LEGACY_SLUGS) expect(prayerBySlug(slug)).toBeDefined();
		expect(prayerBySlug('nope')).toBeUndefined();
	});

	it('links English pages by the English slug, German and Latin by the German one', () => {
		const ave = prayerBySlug('hail-mary')!;
		expect(ave.id).toBe('aveMaria');
		expect(prayerSlug(ave, 'en')).toBe('hail-mary');
		expect(prayerSlug(ave, 'de')).toBe('ave-maria');
		expect(prayerSlug(ave, 'la')).toBe('ave-maria');
	});
});

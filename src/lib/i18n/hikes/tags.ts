/**
 * Hike tag labels. The German tag is the key everywhere — in the frontmatter,
 * the manifest and the `?tag=` filter parameter — so a translated label is
 * display-only and never round-trips into a URL.
 *
 * Place names (Walensee, Safiental, …) are deliberately absent: they fall
 * through unchanged. The unit test in `tests/unit/hikes/hikesI18n.test.ts`
 * insists every tag in use is either mapped here or listed in
 * `PLACE_NAME_TAGS`, so a new descriptive tag cannot ship untranslated.
 */
export const TAG_LABELS_EN: Record<string, string> = {
	Panorama: 'Panorama',
	Gipfel: 'Summit',
	Höhenweg: 'High trail',
	Familie: 'Family',
	Hügellandschaft: 'Rolling hills',
	Wallfahrt: 'Pilgrimage',
	Waldwanderung: 'Forest walk',
	Spaziergang: 'Stroll',
	Schlitteln: 'Sledging',
	Höhle: 'Cave',
	Gletschermühlen: 'Glacial mills',
	Ausgesetzt: 'Exposed',
	Alpweiden: 'Alpine pastures',
	Gratwanderung: 'Ridge walk',
	Alpin: 'Alpine'
};

/** Tags that are proper nouns and read the same in both languages. */
export const PLACE_NAME_TAGS = new Set([
	'Walensee',
	'Seealpsee',
	'Flims',
	'Safiental',
	'Pfäffikersee',
	'Millstättersee'
]);

export function tagLabel(tag: string, lang: 'de' | 'en'): string {
	return lang === 'en' ? (TAG_LABELS_EN[tag] ?? tag) : tag;
}

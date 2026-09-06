/**
 * The reader's display preferences. They travel in a small cookie so the
 * server renders the chapter the way the reader last had it (translation,
 * Latin line, parallel columns, where the notes go, text size) and nothing
 * shifts after hydration. localStorage only mirrors it.
 */
export type Translation = 'allioli' | 'vulgata' | 'drb';
export type NotesMode = 'margin' | 'inline' | 'hidden';
export type BiblePrefs = { tr: Translation; latin: boolean; parallel: boolean; notes: NotesMode; size: number };

export const PREFS_COOKIE = 'bible_prefs';
export const PREFS_STORAGE = 'bible:prefs';
export const SIZES = ['0.95rem', '1.0625rem', '1.18rem', '1.3rem'];

const TRANSLATIONS: Translation[] = ['allioli', 'vulgata', 'drb'];
const NOTES: NotesMode[] = ['margin', 'inline', 'hidden'];

/** Defaults for a reader with nothing saved: the page's own language, when the chapter has it. */
export function defaultPrefs(lang: string, has: { latin: boolean; english: boolean }): BiblePrefs {
	const tr: Translation = lang === 'en' && has.english ? 'drb' : lang === 'la' && has.latin ? 'vulgata' : 'allioli';
	return { tr, latin: false, parallel: false, notes: 'margin', size: 1 };
}

/** Validates a stored JSON string field by field; anything odd keeps the fallback. */
export function parsePrefs(raw: string | null | undefined, fallback: BiblePrefs): BiblePrefs {
	if (!raw) return fallback;
	try {
		const p = JSON.parse(raw) as Partial<Record<keyof BiblePrefs, unknown>>;
		return {
			tr: TRANSLATIONS.includes(p.tr as Translation) ? (p.tr as Translation) : fallback.tr,
			latin: typeof p.latin === 'boolean' ? p.latin : fallback.latin,
			parallel: typeof p.parallel === 'boolean' ? p.parallel : fallback.parallel,
			notes: NOTES.includes(p.notes as NotesMode) ? (p.notes as NotesMode) : fallback.notes,
			size: Number.isInteger(p.size) && (p.size as number) >= 0 && (p.size as number) < SIZES.length ? (p.size as number) : fallback.size
		};
	} catch {
		return fallback;
	}
}

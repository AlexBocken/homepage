/**
 * The reader's display preferences. They travel in a small cookie so the
 * server renders the chapter the way the reader last had it (translation,
 * Latin line, parallel columns, where the notes go, text size) and nothing
 * shifts after hydration. localStorage only mirrors it.
 */
export type Translation = 'allioli' | 'vulgata' | 'drb';
export type NotesMode = 'margin' | 'inline' | 'hidden';
/** The languages the commentaries come in. */
export type CommentaryLang = 'de' | 'en' | 'la';
export const COMMENTARY_LANGS: readonly CommentaryLang[] = ['de', 'en', 'la'];
export type BiblePrefs = {
	tr: Translation;
	/** The page language this `tr` is for. Each language route opens on its
	 * own Bible — Allioli on /bibel, the Douay-Rheims on /bible, the Vulgate
	 * on /biblia — and remembers its own choice in `trs`, so a reader's Vulgate
	 * on /bibel survives a visit to /bible. */
	trFor: string;
	/** The translation chosen on each language route, by its language. */
	trs: Partial<Record<string, Translation>>;
	latin: boolean;
	parallel: boolean;
	notes: NotesMode;
	size: number;
	/** The Church Fathers' commentary discs under the verses. */
	fathers: boolean;
	/**
	 * Which commentators to show: ids, or the presets '*' (every Father and
	 * medieval) and '**' (everyone, the moderns too). Minimal by default.
	 */
	authors: string[];
	/**
	 * Whether the presets also show the minor voices (`Father.major` false):
	 * the lesser Fathers, the fragments from the catenae, the pseudo-authors.
	 * Off by default, so "all Fathers" means the renowned ones. A commentator
	 * picked by name shows regardless.
	 */
	minor: boolean;
	/** Phones: today's reading goal as a thin bar along the bottom edge, the
	 * counterpart of the ring in the desktop rail. */
	bar: boolean;
	/** The commentary languages to show at all; the page's own comes first
	 * where a commentator has it, the others fill in. All three by default. */
	langs: CommentaryLang[];
};

export const DEFAULT_AUTHORS = ['aquinas', 'augustine'];
export const AUTHORS_FATHERS = '*';
export const AUTHORS_ALL = '**';

export const PREFS_COOKIE = 'bible_prefs';
export const PREFS_STORAGE = 'bible:prefs';
export const SIZES = ['0.95rem', '1.0625rem', '1.18rem', '1.3rem'];

const TRANSLATIONS: Translation[] = ['allioli', 'vulgata', 'drb'];
const NOTES: NotesMode[] = ['margin', 'inline', 'hidden'];

/** Defaults for a reader with nothing saved: the page's own language, when the chapter has it. */
export function defaultPrefs(lang: string, has: { latin: boolean; english: boolean }): BiblePrefs {
	const tr: Translation = lang === 'en' && has.english ? 'drb' : lang === 'la' && has.latin ? 'vulgata' : 'allioli';
	return { tr, trFor: lang, trs: {}, latin: false, parallel: false, notes: 'margin', size: 1, fathers: true, authors: [...DEFAULT_AUTHORS], minor: false, bar: true, langs: [...COMMENTARY_LANGS] };
}

/** Validates a stored JSON string field by field; anything odd keeps the fallback. */
export function parsePrefs(raw: string | null | undefined, fallback: BiblePrefs): BiblePrefs {
	if (!raw) return fallback;
	try {
		const p = JSON.parse(raw) as Partial<Record<keyof BiblePrefs, unknown>>;
		// The choice made on this language route, if any; a cookie from before
		// `trs` counts its one `tr` for the route it was written on. Others fall
		// back to the route's own Bible.
		const valid = (v: unknown): v is Translation => TRANSLATIONS.includes(v as Translation);
		const trs: Partial<Record<string, Translation>> = {};
		if (p.trs && typeof p.trs === 'object') for (const [k, v] of Object.entries(p.trs as Record<string, unknown>)) if (valid(v)) trs[k] = v;
		if (valid(p.tr) && typeof p.trFor === 'string' && !(p.trFor in trs)) trs[p.trFor] = p.tr;
		const chosen = trs[fallback.trFor] ?? (valid(p.tr) && typeof p.trFor !== 'string' ? p.tr : undefined);
		return {
			tr: chosen ?? fallback.tr,
			trFor: fallback.trFor,
			trs,
			latin: typeof p.latin === 'boolean' ? p.latin : fallback.latin,
			parallel: typeof p.parallel === 'boolean' ? p.parallel : fallback.parallel,
			notes: NOTES.includes(p.notes as NotesMode) ? (p.notes as NotesMode) : fallback.notes,
			size: Number.isInteger(p.size) && (p.size as number) >= 0 && (p.size as number) < SIZES.length ? (p.size as number) : fallback.size,
			fathers: typeof p.fathers === 'boolean' ? p.fathers : fallback.fathers,
			authors: Array.isArray(p.authors) && p.authors.every((a) => typeof a === 'string' && /^[a-z0-9*-]{1,48}$/.test(a)) ? (p.authors as string[]).slice(0, 300) : fallback.authors,
			minor: typeof p.minor === 'boolean' ? p.minor : fallback.minor,
			bar: typeof p.bar === 'boolean' ? p.bar : fallback.bar,
			langs: Array.isArray(p.langs) && p.langs.length && p.langs.every((l) => COMMENTARY_LANGS.includes(l as CommentaryLang)) ? [...new Set(p.langs as CommentaryLang[])] : fallback.langs
		};
	} catch {
		return fallback;
	}
}

/**
 * Whether the reader's author choice shows this commentator: picked by name,
 * or covered by a preset (everyone, or the Fathers and medievals) — where a
 * preset covers a minor voice only when `minor` is on.
 */
export function authorShown(authors: readonly string[], group: string, id: string, major: boolean, minor: boolean): boolean {
	if (authors.includes(id)) return true;
	if (!major && !minor) return false;
	return authors.includes(AUTHORS_ALL) || (authors.includes(AUTHORS_FATHERS) && group !== 'modern');
}

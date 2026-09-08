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

/** The cookie's JSON: `trs` carries this route's choice too, so the next
 * route's parse finds it under `trFor`. */
export function prefsCookieValue(prefs: BiblePrefs): string {
	return JSON.stringify({ ...prefs, trs: { ...prefs.trs, [prefs.trFor]: prefs.tr } });
}

/**
 * The query parameters a reader without script changes the preferences with:
 * the rail's links carry one each (`?latin=1`), the display form under the
 * chapter submits them all at once. The Bible layout's load reads them into
 * the cookie and redirects to the address without them, so a preference
 * never sticks in a shared link. Booleans are `1`/`0`; a form sends a hidden
 * `0` before each checkbox, and the last value wins. `authors` is one of the
 * presets — the picker by name needs the script. `langs` repeats; none at all
 * leaves the choice as it was, because at least one language stays on.
 */
export const PREF_PARAMS = ['tr', 'latin', 'parallel', 'notes', 'size', 'fathers', 'authors', 'minor', 'bar', 'langs'] as const;
export const PRESETS = { min: [...DEFAULT_AUTHORS], fathers: [AUTHORS_FATHERS], all: [AUTHORS_ALL] } as const;

export function hasPrefParams(params: URLSearchParams): boolean {
	return PREF_PARAMS.some((k) => params.has(k));
}

/** `prefs` with the parameters applied; the rail's rule that two columns need the Latin holds here too. */
export function prefsFromParams(prefs: BiblePrefs, params: URLSearchParams): BiblePrefs {
	const last = (k: string) => params.getAll(k).at(-1);
	const flag = (k: string, current: boolean) => {
		const v = last(k);
		return v === '1' ? true : v === '0' ? false : current;
	};
	const next: BiblePrefs = { ...prefs, trs: { ...prefs.trs } };
	const tr = last('tr');
	if (TRANSLATIONS.includes(tr as Translation)) next.tr = tr as Translation;
	next.latin = flag('latin', prefs.latin);
	next.parallel = flag('parallel', prefs.parallel);
	if (params.has('parallel') && next.parallel) next.latin = true;
	if (params.has('latin') && !next.latin) next.parallel = false;
	const notes = last('notes');
	if (NOTES.includes(notes as NotesMode)) next.notes = notes as NotesMode;
	const size = Number(last('size'));
	if (last('size') !== undefined && Number.isInteger(size) && size >= 0 && size < SIZES.length) next.size = size;
	next.fathers = flag('fathers', prefs.fathers);
	const preset = last('authors');
	if (preset && preset in PRESETS) next.authors = [...PRESETS[preset as keyof typeof PRESETS]];
	next.minor = flag('minor', prefs.minor);
	next.bar = flag('bar', prefs.bar);
	const langs = [...new Set(params.getAll('langs').filter((l): l is CommentaryLang => COMMENTARY_LANGS.includes(l as CommentaryLang)))];
	if (langs.length) next.langs = COMMENTARY_LANGS.filter((l) => langs.includes(l));
	return next;
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

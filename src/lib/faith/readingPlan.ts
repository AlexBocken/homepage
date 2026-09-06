/**
 * The reading plans, pure and deterministic.
 *
 * A plan is one or two lanes of chapters in reading order: the main lane
 * (the books themselves) and, for the plans that read a psalm alongside, a
 * side lane spread evenly over the main lane's days. Nothing is scheduled
 * ahead: today's portion is always computed from what is still unread, so a
 * missed day never doubles up and a change of pace re-portions only the rest.
 */
import { CANON_BY_TESTAMENT } from './bibleCanon';
import { HISTORIA_PERIODS, HISTORIA_WISDOM, type BookRange } from './readingPlanPeriods';
import table from '$lib/data/bibleChapterWords.json';

export type PlanId = 'historia' | 'canon' | 'nt-psalms' | 'nt' | 'ot';
export const PLAN_IDS: PlanId[] = ['historia', 'canon', 'nt-psalms', 'nt', 'ot'];
export type ReaderLang = 'de' | 'en';
export type ChapterRef = { slug: string; ch: number };
export type Lane = ChapterRef[];

/** Careful reading, footnotes glanced at. German words run longer. */
export const WPM: Record<ReaderLang, number> = { de: 150, en: 180 };
export const PACES = [10, 15, 20, 30];
/** A day counts as done at nine tenths of the target, so a long last chapter never blocks it. */
export const DONE_SHARE = 0.9;

const words = table as Record<ReaderLang, Record<string, number[]>>;

export const chapterKey = (r: ChapterRef): string => `${r.slug}/${r.ch}`;
export function parseChapterKey(key: string): ChapterRef | null {
	const m = key.match(/^([^/]+)\/(\d+)$/);
	return m ? { slug: m[1], ch: Number(m[2]) } : null;
}

/** Chapters of a book: the larger of both texts (the Douay-Rheims has the Greek Esther). */
export function chapterCount(slug: string): number {
	return Math.max(words.de[slug]?.length ?? 0, words.en[slug]?.length ?? 0);
}

export function chapterWords(slug: string, ch: number, lang: ReaderLang): number {
	const other: ReaderLang = lang === 'de' ? 'en' : 'de';
	return words[lang][slug]?.[ch - 1] || words[other][slug]?.[ch - 1] || 0;
}

function expand(range: BookRange): ChapterRef[] {
	const slug = typeof range === 'string' ? range : range.slug;
	const from = typeof range === 'string' ? 1 : range.from;
	const to = typeof range === 'string' ? chapterCount(slug) : range.to;
	const out: ChapterRef[] = [];
	for (let ch = from; ch <= to; ch++) out.push({ slug, ch });
	return out;
}
const expandAll = (ranges: BookRange[]): ChapterRef[] => ranges.flatMap(expand);

/**
 * Two sequences read side by side, each advancing in proportion to its
 * length, so both end together: "Genesis 12, Job 1, Genesis 13, Job 2 …".
 */
export function interleave(a: ChapterRef[], b: ChapterRef[]): ChapterRef[] {
	const out: ChapterRef[] = [];
	let i = 0;
	let j = 0;
	while (i < a.length || j < b.length) {
		const pa = a.length ? i / a.length : 1;
		const pb = b.length ? j / b.length : 1;
		if (j >= b.length || (i < a.length && pa <= pb)) out.push(a[i++]);
		else out.push(b[j++]);
	}
	return out;
}

const laneCache = new Map<PlanId, Lane[]>();

/** The plan's lanes: [main] or [main, side]. */
export function planLanes(id: PlanId): Lane[] {
	const cached = laneCache.get(id);
	if (cached) return cached;
	let lanes: Lane[];
	switch (id) {
		case 'canon':
			lanes = [expandAll([...CANON_BY_TESTAMENT.ot, ...CANON_BY_TESTAMENT.nt])];
			break;
		case 'ot':
			lanes = [expandAll(CANON_BY_TESTAMENT.ot)];
			break;
		case 'nt':
			lanes = [expandAll(CANON_BY_TESTAMENT.nt)];
			break;
		case 'nt-psalms':
			lanes = [expandAll(CANON_BY_TESTAMENT.nt), expandAll(['ps'])];
			break;
		case 'historia':
			lanes = [
				HISTORIA_PERIODS.flatMap((p) => interleave(expandAll(p.narrative), expandAll(p.supplemental))),
				expandAll(HISTORIA_WISDOM)
			];
			break;
	}
	laneCache.set(id, lanes);
	return lanes;
}

/** The period a chapter of the historia plan belongs to, for the spine's labels. */
export function historiaPeriodOf(ref: ChapterRef): string | null {
	for (const p of HISTORIA_PERIODS) {
		for (const r of [...p.narrative, ...p.supplemental]) {
			const slug = typeof r === 'string' ? r : r.slug;
			if (slug !== ref.slug) continue;
			if (typeof r === 'string' || (ref.ch >= r.from && ref.ch <= r.to)) return p.id;
		}
	}
	return null;
}

export const wordsPerDay = (minutes: number, lang: ReaderLang): number => Math.round(minutes * WPM[lang]);
export const minutesFor = (w: number, lang: ReaderLang): number => Math.max(1, Math.round(w / WPM[lang]));

export function laneWords(lane: Lane, lang: ReaderLang): number {
	return lane.reduce((n, r) => n + chapterWords(r.slug, r.ch, lang), 0);
}

/** The lanes without the chapters already read. */
export function remainingLanes(lanes: Lane[], read: Set<string>): Lane[] {
	return lanes.map((lane) => lane.filter((r) => !read.has(chapterKey(r))));
}

/** Days left at this pace, from the words still unread. */
export function daysLeft(remaining: Lane[], target: number, lang: ReaderLang): number {
	const total = remaining.reduce((n, lane) => n + laneWords(lane, lang), 0);
	return Math.ceil(total / Math.max(1, target));
}

/**
 * The next portion: a share of the side lane sized so it lasts exactly as long
 * as the main lane (state only, no history: the share self-corrects day by
 * day), then main-lane chapters greedily up to the target. Never empty while
 * anything is unread.
 */
export function nextPortion(remaining: Lane[], target: number, lang: ReaderLang): ChapterRef[] {
	const main = remaining[0] ?? [];
	const side = remaining[1] ?? [];
	const out: ChapterRef[] = [];
	let budget = Math.max(1, target);
	if (side.length) {
		let sideToday: number;
		if (main.length === 0) {
			// Only the side lane is left: read it at the full pace.
			sideToday = 0;
			let sum = 0;
			for (const r of side) {
				const w = chapterWords(r.slug, r.ch, lang);
				if (sideToday > 0 && sum >= DONE_SHARE * budget) break;
				sum += w;
				sideToday++;
			}
		} else {
			const avgSide = laneWords(side, lang) / side.length;
			// Main-lane days at roughly the target minus a side chapter.
			const mainDays = Math.max(1, Math.ceil(laneWords(main, lang) / Math.max(1, target - avgSide)));
			const k = side.length;
			sideToday = Math.floor(k / mainDays) + (k % mainDays >= mainDays / 2 ? 1 : 0);
		}
		for (let i = 0; i < sideToday && i < side.length; i++) {
			out.push(side[i]);
			budget -= chapterWords(side[i].slug, side[i].ch, lang);
		}
	}
	// Fill until the done share is reached: the day lands between 90 % and,
	// when a long chapter closes it, about 130 % of the target; never short
	// unless the lane runs out.
	let sum = 0;
	let took = 0;
	for (const r of main) {
		const w = chapterWords(r.slug, r.ch, lang);
		if (took > 0 && sum >= DONE_SHARE * budget) break;
		out.push(r);
		sum += w;
		took++;
	}
	return out;
}

export type PortionItem = ChapterRef & { key: string; words: number; minutes: number; read: boolean };

/**
 * Today's reading: what was read today plus the next portion of the rest,
 * sized to what is left of the target.
 */
export function todayPortion(lanes: Lane[], read: Set<string>, readToday: Set<string>, target: number, lang: ReaderLang): { items: PortionItem[]; wordsToday: number; done: boolean } {
	const all = lanes.flat();
	const todayRefs = all.filter((r) => readToday.has(chapterKey(r)));
	const wordsToday = laneWords(todayRefs, lang);
	const rest = remainingLanes(lanes, read);
	const left = target - wordsToday;
	const next = left > target * (1 - DONE_SHARE) ? nextPortion(rest, left, lang) : [];
	const items = [...todayRefs, ...next].map((r) => {
		const w = chapterWords(r.slug, r.ch, lang);
		return { ...r, key: chapterKey(r), words: w, minutes: minutesFor(w, lang), read: read.has(chapterKey(r)) };
	});
	return { items, wordsToday, done: wordsToday >= DONE_SHARE * target };
}

/** The chapter to read after `current`, in plan order, or null when it is the last unread one. */
export function nextInPlan(lanes: Lane[], read: Set<string>, current: ChapterRef): ChapterRef | null {
	const main = lanes[0];
	const i = main.findIndex((r) => r.slug === current.slug && r.ch === current.ch);
	const from = i >= 0 ? i + 1 : 0;
	for (let k = from; k < main.length; k++) if (!read.has(chapterKey(main[k]))) return main[k];
	for (let k = 0; k < from; k++) if (!read.has(chapterKey(main[k]))) return main[k];
	const side = lanes[1] ?? [];
	return side.find((r) => !read.has(chapterKey(r))) ?? null;
}

/** Is this chapter part of the plan at all? */
export function inPlan(lanes: Lane[], ref: ChapterRef): boolean {
	return lanes.some((lane) => lane.some((r) => r.slug === ref.slug && r.ch === ref.ch));
}

/* ---------- days ---------- */

const DAY_MS = 86_400_000;
export const toDate = (day: string): Date => new Date(`${day}T00:00:00Z`);
export const toDay = (d: Date): string => d.toISOString().slice(0, 10);
export const addDays = (day: string, n: number): string => toDay(new Date(toDate(day).getTime() + n * DAY_MS));
export const dayDiff = (a: string, b: string): number => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);

/**
 * Reading log and reading plan, server side. Page loads and the API share
 * these so a chapter page does not have to fetch its own API.
 *
 * Days are the reader's local calendar days (YYYY-MM-DD). The client sends
 * the day it marks a chapter on; for page loads the server works "today" out
 * from the reader's UTC offset (cookie `bible_tz`), never from a date cookie
 * that may be a day stale. The server only checks a sent day is not far off
 * its own clock.
 */
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { BibleChapterRead } from '$models/BibleChapterRead';
import { BibleReadingPlan, type IBibleReadingPlan, type PlanShape } from '$models/BibleReadingPlan';
import { CANON, CANON_BY_TESTAMENT, canonSlug } from '$lib/faith/bibleCanon';
import {
	PLAN_IDS, addDays, chapterCount, chapterKey, daysLeft, laneWords, nextInPlan, parseChapterKey, planLanes,
	remainingLanes, todayPortion, wordsPerDay, inPlan, type ChapterRef, type PlanId, type PortionItem, type ReaderLang
} from '$lib/faith/readingPlan';
import { qualifyingDays, streaks, type StreakInfo } from '$lib/faith/readingStreak';
import { localDateStr, localDateStrAtOffset } from '$lib/js/localDate';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A client-sent day must be well formed and within a day of the server's own. */
export function validDay(day: unknown): day is string {
	if (typeof day !== 'string' || !DAY_RE.test(day)) return false;
	const t = new Date(`${day}T00:00:00Z`).getTime();
	if (Number.isNaN(t)) return false;
	return Math.abs(t - Date.now()) < 2 * 86_400_000;
}

/**
 * The reader's calendar day for a page load: from the `bible_tz` cookie the
 * reader keeps (its UTC offset in minutes, as `getTimezoneOffset` gives it),
 * else the server's own day. A stale date would count today's reading as
 * tomorrow's and show a streak one short of the truth, so no date is trusted.
 */
export function readerToday(cookies: { get(name: string): string | undefined }): string {
	const tz = Number(cookies.get('bible_tz'));
	if (Number.isInteger(tz) && Math.abs(tz) <= 14 * 60) return localDateStrAtOffset(tz);
	return localDateStr();
}

export function validKey(key: unknown): key is string {
	if (typeof key !== 'string') return false;
	const ref = parseChapterKey(key);
	return !!ref && canonSlug(ref.slug) === ref.slug && ref.ch >= 1 && ref.ch <= chapterCount(ref.slug);
}

/* ---------- the log ---------- */

export type ReadingLog = {
	/** Every chapter ever read, with its first and last day. */
	chapters: Map<string, { first: string; last: string }>;
	/** Distinct days with reading, sorted. */
	days: string[];
	/** The chapters read on each day. */
	byDay: Map<string, Set<string>>;
};

export async function readingLog(username: string): Promise<ReadingLog> {
	await dbConnect();
	const rows = await BibleChapterRead.find({ username }, { key: 1, day: 1, _id: 0 }).lean();
	const chapters = new Map<string, { first: string; last: string }>();
	const days = new Set<string>();
	const byDay = new Map<string, Set<string>>();
	for (const r of rows) {
		days.add(r.day);
		(byDay.get(r.day) ?? byDay.set(r.day, new Set()).get(r.day)!).add(r.key);
		const c = chapters.get(r.key);
		if (!c) chapters.set(r.key, { first: r.day, last: r.day });
		else {
			if (r.day < c.first) c.first = r.day;
			if (r.day > c.last) c.last = r.day;
		}
	}
	return { chapters, days: [...days].sort(), byDay };
}

export async function markRead(username: string, key: string, day: string, planId: mongoose.Types.ObjectId | null): Promise<void> {
	await dbConnect();
	await BibleChapterRead.updateOne({ username, key, day }, { $setOnInsert: { username, key, day, ts: Date.now(), planId } }, { upsert: true });
}

/** Removes the chapter's row for that day; with no day, every row of the chapter. */
export async function unmarkRead(username: string, key: string, day?: string): Promise<number> {
	await dbConnect();
	const res = await BibleChapterRead.deleteMany(day ? { username, key, day } : { username, key });
	return res.deletedCount ?? 0;
}

export type ResetScope = { scope: 'all' } | { scope: 'testament'; testament: 'ot' | 'nt' } | { scope: 'book'; slug: string };

/** Bulk reset of the log. Returns how many rows went. */
export async function resetLog(username: string, scope: ResetScope): Promise<number> {
	await dbConnect();
	let filter: Record<string, unknown> = { username };
	if (scope.scope === 'book') filter = { username, key: new RegExp(`^${escapeRe(scope.slug)}/`) };
	else if (scope.scope === 'testament') {
		const slugs = CANON_BY_TESTAMENT[scope.testament];
		filter = { username, key: new RegExp(`^(${slugs.map(escapeRe).join('|')})/`) };
	}
	const res = await BibleChapterRead.deleteMany(filter);
	return res.deletedCount ?? 0;
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Read chapters per book, for the index page. */
export function perBook(log: ReadingLog): Record<string, number> {
	const out: Record<string, number> = {};
	for (const key of log.chapters.keys()) {
		const ref = parseChapterKey(key);
		if (ref) out[ref.slug] = (out[ref.slug] ?? 0) + 1;
	}
	return out;
}

/* ---------- the streak ---------- */

/** The days that count: every reading day, or with a plan the days its target was met inside its books. */
export function streakDays(log: ReadingLog, plan: PlanDoc | null): string[] {
	return qualifyingDays(log.byDay, plan ? { plan: plan.plan as PlanId, lang: plan.lang as ReaderLang, minutesPerDay: plan.minutesPerDay, startDate: plan.startDate } : null);
}

export function streakFor(log: ReadingLog, plan: PlanDoc | null, today: string): StreakInfo {
	return streaks(streakDays(log, plan), today);
}

/* ---------- the plan ---------- */

export type PlanDoc = IBibleReadingPlan & { _id: mongoose.Types.ObjectId };

export async function activePlan(username: string): Promise<PlanDoc | null> {
	await dbConnect();
	return (await BibleReadingPlan.findOne({ username, active: true }).lean()) as PlanDoc | null;
}

/** The chapters that count for this plan: read since it started, or ever. */
export function creditedReads(plan: PlanDoc, log: ReadingLog): Set<string> {
	const lanes = planLanes(plan.plan as PlanId);
	const set = new Set<string>();
	for (const r of lanes.flat()) {
		const c = log.chapters.get(chapterKey(r));
		if (c && (plan.creditEarlier || c.last >= plan.startDate)) set.add(chapterKey(r));
	}
	return set;
}

export type PlanState = {
	id: PlanId;
	lang: ReaderLang;
	minutesPerDay: number;
	target: number;
	startDate: string;
	creditEarlier: boolean;
	today: { items: PortionItem[]; wordsToday: number; done: boolean };
	progress: { chapters: number; total: number; words: number; totalWords: number };
	projection: { daysLeft: number; endDate: string; daysElapsed: number; readingDays: number };
	/** Per book in plan order: words and read words, for the spine. */
	spine: { slug: string; words: number; read: number; period: string | null }[];
	finished: boolean;
};

export function planState(plan: PlanDoc, log: ReadingLog, today: string, readTodayKeys: Set<string>): PlanState {
	const id = plan.plan as PlanId;
	const lang = plan.lang as ReaderLang;
	const lanes = planLanes(id);
	const read = creditedReads(plan, log);
	const target = wordsPerDay(plan.minutesPerDay, lang);
	const all = lanes.flat();
	const totalWords = laneWords(all, lang);
	const readWords = laneWords(all.filter((r) => read.has(chapterKey(r))), lang);
	const rest = remainingLanes(lanes, read);
	const left = daysLeft(rest, target, lang);
	const readingDays = log.days.filter((d) => d >= plan.startDate).length;
	// Books in the order the main lane meets them; the side lane's books at the end.
	const spine: PlanState['spine'] = [];
	const seen = new Map<string, number>();
	for (const r of all) {
		let i = seen.get(r.slug);
		if (i === undefined) {
			i = spine.length;
			seen.set(r.slug, i);
			spine.push({ slug: r.slug, words: 0, read: 0, period: id === 'historia' ? periodOf(r) : null });
		}
		const w = laneWords([r], lang);
		spine[i].words += w;
		if (read.has(chapterKey(r))) spine[i].read += w;
	}
	return {
		id,
		lang,
		minutesPerDay: plan.minutesPerDay,
		target,
		startDate: plan.startDate,
		creditEarlier: plan.creditEarlier,
		today: todayPortion(lanes, read, new Set([...readTodayKeys].filter((k) => inPlanKey(lanes, k))), target, lang),
		progress: { chapters: read.size, total: all.length, words: readWords, totalWords },
		projection: { daysLeft: left, endDate: addDays(today, left), daysElapsed: Math.max(0, dayDiffSafe(plan.startDate, today)), readingDays },
		spine,
		finished: rest.flat().length === 0
	};
}

function inPlanKey(lanes: ChapterRef[][], key: string): boolean {
	const ref = parseChapterKey(key);
	return !!ref && inPlan(lanes, ref);
}
function dayDiffSafe(a: string, b: string): number {
	return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}
import { historiaPeriodOf } from '$lib/faith/readingPlan';
const periodOf = (r: ChapterRef) => historiaPeriodOf(r);

export function isPlanId(x: unknown): x is PlanId {
	return typeof x === 'string' && (PLAN_IDS as string[]).includes(x);
}

export async function startPlan(username: string, plan: PlanShape, lang: ReaderLang, minutesPerDay: number, startDate: string, creditEarlier: boolean): Promise<PlanDoc> {
	await dbConnect();
	await BibleReadingPlan.updateMany({ username, active: true }, { $set: { active: false, finishedAt: new Date() } });
	const doc = await BibleReadingPlan.create({ username, plan, lang, minutesPerDay, startDate, creditEarlier, active: true });
	return doc.toObject() as PlanDoc;
}

export async function setPace(username: string, minutesPerDay: number): Promise<PlanDoc | null> {
	await dbConnect();
	return (await BibleReadingPlan.findOneAndUpdate({ username, active: true }, { $set: { minutesPerDay } }, { returnDocument: 'after' }).lean()) as PlanDoc | null;
}

export async function finishPlan(username: string): Promise<boolean> {
	await dbConnect();
	const res = await BibleReadingPlan.updateMany({ username, active: true }, { $set: { active: false, finishedAt: new Date() } });
	return (res.modifiedCount ?? 0) > 0;
}

/* ---------- what the reader needs on a chapter page ---------- */

/** The lowest chapter of a book not on record — where its reading continues — or null once every chapter is read. */
export function firstUnreadChapter(log: ReadingLog, slug: string): number | null {
	const n = chapterCount(slug);
	for (let ch = 1; ch <= n; ch++) if (!log.chapters.has(chapterKey({ slug, ch }))) return ch;
	return null;
}

export type ReadingState = {
	read: boolean;
	/** See firstUnreadChapter, for this chapter's book. */
	firstUnread: number | null;
	streak: StreakInfo;
	plan: { id: PlanId; inPlan: boolean; done: boolean; wordsToday: number; target: number; next: ChapterRef | null } | null;
};

export async function readingStateFor(username: string, ref: ChapterRef, today: string): Promise<ReadingState> {
	const [log, plan] = await Promise.all([readingLog(username), activePlan(username)]);
	const key = chapterKey(ref);
	const c = log.chapters.get(key);
	const readTodayKeys = await keysReadOn(username, today);
	let planPart: ReadingState['plan'] = null;
	if (plan) {
		const state = planState(plan, log, today, readTodayKeys);
		const lanes = planLanes(state.id);
		const credited = creditedReads(plan, log);
		planPart = {
			id: state.id,
			inPlan: inPlan(lanes, ref),
			done: state.today.done,
			wordsToday: state.today.wordsToday,
			target: state.target,
			next: state.finished ? null : nextInPlan(lanes, credited, ref)
		};
	}
	return { read: !!c, firstUnread: firstUnreadChapter(log, ref.slug), streak: streakFor(log, plan, today), plan: planPart };
}

export async function keysReadOn(username: string, day: string): Promise<Set<string>> {
	await dbConnect();
	const rows = await BibleChapterRead.find({ username, day }, { key: 1, _id: 0 }).lean();
	return new Set(rows.map((r) => r.key));
}

/** How many of a plan's chapters the log already holds, for the "credit earlier" offer. */
export function alreadyReadOf(id: PlanId, log: ReadingLog): number {
	return planLanes(id).flat().filter((r) => log.chapters.has(chapterKey(r))).length;
}

export const bookSlugs = Object.keys(CANON);

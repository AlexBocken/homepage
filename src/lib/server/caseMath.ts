/**
 * Case-math persistence: grading submitted sessions, moving skill levels, and
 * the aggregates behind the dashboard and progress pages.
 *
 * The client never reports whether an answer was right. It sends the
 * (skill, level, seed) of each question plus what was typed; the server
 * regenerates the question and grades it, with the same code the drill uses.
 */

import { error } from '@sveltejs/kit';
import mongoose from 'mongoose';
import { dbConnect } from '$utils/db';
import { CaseMathAttempt } from '$models/CaseMathAttempt';
import { CaseMathSession } from '$models/CaseMathSession';
import { CaseMathProgress } from '$models/CaseMathProgress';
import { MAX_LEVEL, SKILLS, SKILL_BY_ID, isLevel, questionFor } from '$lib/js/caseMath/skills';
import { grade, parseAnswer } from '$lib/js/caseMath/parse';
import { type AttemptLite, type SkillState, median, nextLevel, weekOf } from '$lib/js/caseMath/adaptive';

export type Mode = 'daily' | 'free';

export type SubmittedAttempt = { skill: string; level: number; seed: number; given: string; ms: number };
export type Submission = { mode: Mode; date: string; durationMs: number; attempts: SubmittedAttempt[] };

const MAX_ATTEMPTS = 300;
const MAX_MS = 10 * 60_000;
const RECENT = 20;

/** Validate and normalize a session body, or throw 400. */
export function parseSubmission(body: unknown): Submission {
	const b = body as Partial<Submission> | null;
	if (!b || (b.mode !== 'daily' && b.mode !== 'free')) throw error(400, 'mode must be daily or free');
	if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw error(400, 'date must be YYYY-MM-DD');
	if (!Array.isArray(b.attempts) || b.attempts.length === 0) throw error(400, 'attempts required');
	if (b.attempts.length > MAX_ATTEMPTS) throw error(400, 'too many attempts');
	const attempts = b.attempts.map((a, i) => {
		if (!a || typeof a.skill !== 'string' || !SKILL_BY_ID[a.skill]) throw error(400, `attempt ${i}: unknown skill`);
		if (!isLevel(a.level)) throw error(400, `attempt ${i}: bad level`);
		if (!Number.isInteger(a.seed) || a.seed < 0 || a.seed > 0xffffffff) throw error(400, `attempt ${i}: bad seed`);
		const ms = Number(a.ms);
		if (!Number.isFinite(ms) || ms < 0) throw error(400, `attempt ${i}: bad ms`);
		return {
			skill: a.skill,
			level: a.level,
			seed: a.seed,
			given: String(a.given ?? '').slice(0, 40),
			ms: Math.min(Math.round(ms), MAX_MS)
		};
	});
	const durationMs = Math.min(Math.max(0, Number(b.durationMs) || 0), 4 * 3_600_000);
	return { mode: b.mode, date: b.date, durationMs, attempts };
}

export type GradedAttempt = SubmittedAttempt & { correct: boolean; relErr: number | null; answer: number };

export type SessionResult = {
	sessionId: string;
	count: number;
	correct: number;
	attempts: GradedAttempt[];
	levelChanges: Record<string, [number, number]>;
	levels: Record<string, number>;
};

/** Grade, store and apply a finished session. */
export async function recordSession(username: string, sub: Submission): Promise<SessionResult> {
	await dbConnect();
	const graded: GradedAttempt[] = sub.attempts.map((a) => {
		const q = questionFor(a.skill, a.level, a.seed);
		const g = grade(q.answer, parseAnswer(a.given), q.tolerance);
		return { ...a, correct: g.correct, relErr: g.relErr, answer: q.answer };
	});
	const correct = graded.filter((a) => a.correct).length;

	const sessionId = new mongoose.Types.ObjectId();
	// Space the timestamps a millisecond apart so attempt order survives the sort.
	const t0 = Date.now() - graded.length;
	await CaseMathAttempt.insertMany(
		graded.map((a, i) => ({
			username,
			sessionId,
			mode: sub.mode,
			date: sub.date,
			skill: a.skill,
			level: a.level,
			seed: a.seed,
			given: a.given,
			correct: a.correct,
			relErr: a.relErr,
			ms: a.ms,
			createdAt: new Date(t0 + i)
		}))
	);

	const { levelChanges, levels } = await updateLevels(username, [...new Set(graded.map((a) => a.skill))]);

	await CaseMathSession.create({
		_id: sessionId,
		username,
		mode: sub.mode,
		date: sub.date,
		count: graded.length,
		correct,
		durationMs: sub.durationMs,
		levelChanges
	});

	return { sessionId: String(sessionId), count: graded.length, correct, attempts: graded, levelChanges, levels };
}

async function updateLevels(username: string, skills: string[]) {
	const progress =
		(await CaseMathProgress.findOne({ username })) ?? new CaseMathProgress({ username, skills: {} });
	const levelChanges: Record<string, [number, number]> = {};

	for (const skill of skills) {
		const cur = progress.skills.get(skill) ?? { level: 1, since: new Date(0) };
		const recent = await CaseMathAttempt.find({ username, skill, level: cur.level, createdAt: { $gte: cur.since } })
			.sort({ createdAt: -1 })
			.limit(RECENT)
			.lean();
		const lite: AttemptLite[] = recent.map((a) => ({
			skill,
			level: a.level,
			correct: a.correct,
			ms: a.ms,
			at: a.createdAt.getTime()
		}));
		const next = nextLevel(skill, cur.level, cur.since.getTime(), lite);
		if (next !== cur.level) {
			levelChanges[skill] = [cur.level, next];
			progress.skills.set(skill, { level: next, since: new Date() });
		} else if (!progress.skills.has(skill)) {
			progress.skills.set(skill, { level: 1, since: new Date(0) });
		}
	}
	await progress.save();

	const levels: Record<string, number> = {};
	for (const [id, s] of progress.skills) levels[id] = s.level;
	return { levelChanges, levels };
}

export type SkillSummary = SkillState & {
	id: string;
	attempts: number;
	/** Median ms over recent attempts at the current level. */
	medianMs: number | null;
	targetMs: number;
};

export type DaySummary = { date: string; count: number; correct: number; daily: boolean };
export type WeekSummary = { week: string; count: number; accuracy: number; speed: number | null };
export type RecentSession = {
	id: string;
	mode: Mode;
	date: string;
	count: number;
	correct: number;
	durationMs: number;
	levelChanges: Record<string, [number, number]>;
};

export type Overview = {
	skills: Record<string, SkillSummary>;
	days: DaySummary[];
	dailyDates: string[];
	recent: RecentSession[];
};

/** Per-skill state, the activity calendar and recent sessions. */
export async function getOverview(username: string): Promise<Overview> {
	await dbConnect();
	const [progress, perSkill, sessions] = await Promise.all([
		CaseMathProgress.findOne({ username }).lean(),
		CaseMathAttempt.aggregate<{
			_id: string;
			total: number;
			recent: { level: number; correct: boolean; ms: number; createdAt: Date }[];
		}>([
			{ $match: { username } },
			{ $sort: { createdAt: -1 } },
			{
				$group: {
					_id: '$skill',
					total: { $sum: 1 },
					// Newest first, thanks to the $sort above.
					recent: {
						$firstN: { input: { level: '$level', correct: '$correct', ms: '$ms', createdAt: '$createdAt' }, n: RECENT }
					}
				}
			}
		]),
		CaseMathSession.find({ username }).sort({ createdAt: -1 }).limit(2000).lean()
	]);

	const levels = (progress?.skills ?? {}) as unknown as Record<string, { level: number }>;
	const bySkill = new Map(perSkill.map((s) => [s._id, s]));
	const skills: Record<string, SkillSummary> = {};
	for (const skill of SKILLS) {
		const level = Math.min(MAX_LEVEL, levels[skill.id]?.level ?? 1);
		const row = bySkill.get(skill.id);
		const recent = row?.recent ?? [];
		const atLevel = recent.filter((a) => a.level === level);
		const medianMs = atLevel.length ? median(atLevel.map((a) => a.ms)) : null;
		skills[skill.id] = {
			id: skill.id,
			level,
			attempts: row?.total ?? 0,
			accuracy: recent.length ? recent.filter((a) => a.correct).length / recent.length : null,
			speed: medianMs === null ? null : medianMs / skill.targetMs(level),
			medianMs,
			targetMs: skill.targetMs(level),
			lastSeen: recent[0] ? new Date(recent[0].createdAt).getTime() : null
		};
	}

	const dayMap = new Map<string, DaySummary>();
	for (const s of sessions) {
		const d = dayMap.get(s.date) ?? { date: s.date, count: 0, correct: 0, daily: false };
		d.count += s.count;
		d.correct += s.correct;
		d.daily ||= s.mode === 'daily';
		dayMap.set(s.date, d);
	}
	const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

	return {
		skills,
		days,
		dailyDates: days.filter((d) => d.daily).map((d) => d.date),
		recent: sessions.slice(0, 15).map((s) => ({
			id: String(s._id),
			mode: s.mode,
			date: s.date,
			count: s.count,
			correct: s.correct,
			durationMs: s.durationMs,
			levelChanges: Object.fromEntries(Object.entries(s.levelChanges ?? {})) as Record<string, [number, number]>
		}))
	};
}

/**
 * Weekly accuracy and speed (median time ÷ target, so levels compare), overall
 * and per skill, for the last `weeks` weeks.
 */
export async function getTrends(username: string, weeks = 26) {
	await dbConnect();
	const since = new Date(Date.now() - weeks * 7 * 86_400_000);
	const rows = await CaseMathAttempt.find({ username, createdAt: { $gte: since } })
		.select({ date: 1, skill: 1, level: 1, correct: 1, ms: 1, _id: 0 })
		.lean();

	type Bucket = { count: number; correct: number; ratios: number[] };
	const overall = new Map<string, Bucket>();
	const perSkill = new Map<string, Map<string, Bucket>>();
	const add = (m: Map<string, Bucket>, week: string, correct: boolean, ratio: number) => {
		const b = m.get(week) ?? { count: 0, correct: 0, ratios: [] };
		b.count++;
		if (correct) b.correct++;
		b.ratios.push(ratio);
		m.set(week, b);
	};
	for (const r of rows) {
		const skill = SKILL_BY_ID[r.skill];
		if (!skill) continue;
		const week = weekOf(r.date);
		const ratio = r.ms / skill.targetMs(r.level);
		add(overall, week, r.correct, ratio);
		if (!perSkill.has(r.skill)) perSkill.set(r.skill, new Map());
		add(perSkill.get(r.skill)!, week, r.correct, ratio);
	}
	const toWeeks = (m: Map<string, Bucket>): WeekSummary[] =>
		[...m.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([week, b]) => ({ week, count: b.count, accuracy: b.correct / b.count, speed: median(b.ratios) }));

	return {
		overall: toWeeks(overall),
		perSkill: Object.fromEntries([...perSkill.entries()].map(([id, m]) => [id, toWeeks(m)]))
	};
}

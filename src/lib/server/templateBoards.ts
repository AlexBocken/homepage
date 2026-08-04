/**
 * Progress per workout template, for running and cycling.
 *
 * Segments answer "how fast over this exact stretch of road" and best efforts answer
 * "how fast over this exact distance". Neither answers the question a repeated
 * *workout* raises — "am I getting better at my Tuesday tempo session" — because that
 * session is a recipe (warm-up, intervals, cool-down) rather than a fixed course, and
 * two runs of it need not cover the same ground or even the same distance.
 *
 * So the comparable metric here is pace, not elapsed time: a template's attempts are
 * ranked and trended by min/km (km/h for cycling), and every row still carries its own
 * distance so a shorter or longer outing is visible rather than silently ranked against
 * the others. Elapsed time is shown, never used for the ranking.
 *
 * Scoped to one athlete throughout. Templates are personal — unlike a segment there is
 * no shared course to build a leaderboard on — so nothing here reads another user's
 * sessions and there is no opt-out to honour.
 */

import { WorkoutSession } from '$models/WorkoutSession';
import { WorkoutTemplate } from '$models/WorkoutTemplate';
import { activitiesForKind, type ActivityKind } from '$lib/server/bestEffortsBackfill';
import { cardioDistanceKm, cardioMinutes, cardioPace } from '$lib/fitness/cardioSession';
import mongoose from 'mongoose';

/** One recorded run/ride of a template. */
export type TemplateAttempt = {
	sessionId: string;
	name: string;
	date: Date;
	km: number;
	seconds: number;
	/** min/km. The ranked quantity — see the module note. */
	pace: number;
};

const SESSION_FIELDS = 'templateId templateName name startTime endTime duration totalDistance exercises.totalDistance activityType';

/**
 * Every attempt at `templateId`, oldest first. Sessions that recorded no distance or
 * no duration are dropped: there is no pace to place them on the trend, and a zero
 * would read as an infinitely fast run.
 */
export async function templateAttempts(createdBy: string, templateId: string): Promise<TemplateAttempt[]> {
	const sessions = await WorkoutSession.find({ createdBy, templateId })
		.select(SESSION_FIELDS)
		.sort({ startTime: 1 })
		.lean() as unknown as any[];

	const out: TemplateAttempt[] = [];
	for (const s of sessions) {
		const pace = cardioPace(s);
		if (pace == null) continue;
		out.push({
			sessionId: String(s._id),
			name: s.name,
			date: s.startTime,
			km: Math.round(cardioDistanceKm(s) * 100) / 100,
			seconds: Math.round(cardioMinutes(s) * 60),
			pace,
		});
	}
	return out;
}

export type TemplateBoardRow = {
	templateId: string;
	name: string;
	/** False once the template itself has been deleted; its history still stands. */
	exists: boolean;
	attempts: number;
	/** The fastest attempt, by pace. */
	bestPace: number;
	bestKm: number;
	bestSeconds: number;
	bestSessionId: string;
	/** Mean distance over the attempts — what this workout typically covers. */
	avgKm: number;
	lastDate: Date;
};

/**
 * The board: one row per template this athlete has actually run, ordered by how
 * recently it was done. Templates with a single attempt are kept — the point of the
 * board is to notice a workout is repeatable, and the second attempt is exactly when
 * the trend becomes interesting.
 */
export async function templateBoard(createdBy: string, kind: ActivityKind): Promise<TemplateBoardRow[]> {
	const sessions = await WorkoutSession.find({
		createdBy,
		activityType: { $in: activitiesForKind(kind) },
		// `templateId` is an ObjectId path (the TS interface's `string` is a lie), so it
		// must be tested for existence rather than compared against '' — Mongoose casts
		// every operand of the query and an empty string is not a castable ObjectId,
		// which throws before the query is ever sent.
		templateId: { $exists: true, $ne: null },
	})
		.select(SESSION_FIELDS)
		.lean() as unknown as any[];

	/** templateId → its attempts, accumulated. */
	const byTemplate = new Map<string, { snapshotName: string; rows: TemplateAttempt[] }>();
	for (const s of sessions) {
		const pace = cardioPace(s);
		if (pace == null) continue;
		const key = String(s.templateId);
		let group = byTemplate.get(key);
		if (!group) {
			group = { snapshotName: s.templateName || s.name || '', rows: [] };
			byTemplate.set(key, group);
		}
		// A rename leaves older sessions holding the old snapshot; prefer the newest one
		// we see, and the live template name below overrides it anyway when it exists.
		if (s.templateName) group.snapshotName = s.templateName;
		group.rows.push({
			sessionId: String(s._id),
			name: s.name,
			date: s.startTime,
			km: Math.round(cardioDistanceKm(s) * 100) / 100,
			seconds: Math.round(cardioMinutes(s) * 60),
			pace,
		});
	}

	// Live names, so a renamed template reads correctly on the board. Ids that no longer
	// resolve are deleted templates — kept, flagged, and shown under their snapshot name.
	const ids = [...byTemplate.keys()].filter((id) => mongoose.Types.ObjectId.isValid(id));
	const live = ids.length
		? (await WorkoutTemplate.find({ _id: { $in: ids } }).select('name').lean() as unknown as any[])
		: [];
	const liveNames = new Map(live.map((t) => [String(t._id), t.name as string]));

	const board: TemplateBoardRow[] = [];
	for (const [templateId, group] of byTemplate) {
		if (group.rows.length === 0) continue;
		const best = group.rows.reduce((a, b) => (b.pace < a.pace ? b : a));
		const totalKm = group.rows.reduce((sum, r) => sum + r.km, 0);
		const lastDate = group.rows.reduce(
			(latest, r) => (new Date(r.date).getTime() > new Date(latest).getTime() ? r.date : latest),
			group.rows[0].date,
		);
		board.push({
			templateId,
			name: liveNames.get(templateId) || group.snapshotName || templateId,
			exists: liveNames.has(templateId),
			attempts: group.rows.length,
			bestPace: best.pace,
			bestKm: best.km,
			bestSeconds: best.seconds,
			bestSessionId: best.sessionId,
			avgKm: Math.round((totalKm / group.rows.length) * 100) / 100,
			lastDate,
		});
	}

	board.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
	return board;
}

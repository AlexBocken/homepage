import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PLAN_IDS } from '$lib/faith/readingPlan';
import {
	activePlan, alreadyReadOf, finishPlan, isPlanId, keysReadOn, planState, readingLog, setPace, startPlan, validDay
} from '$lib/server/bibleReading';
import { localDateStr } from '$lib/js/localDate';

// The signed-in reader's plan.
//   GET  ?today=YYYY-MM-DD → the plan's state (null when there is none), with what is read of each plan
//   POST { action: 'start', plan, minutesPerDay, today, creditEarlier } — takes it up, ending what ran
//   POST { action: 'pace', minutesPerDay, today }
//   POST { action: 'finish', today? }
async function user(locals: App.Locals): Promise<string> {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user?.nickname) throw error(401, 'Authentication required');
	return session.user.nickname;
}

async function state(username: string, today: string) {
	const [plan, log] = await Promise.all([activePlan(username), readingLog(username)]);
	const alreadyRead = Object.fromEntries(PLAN_IDS.map((id) => [id, alreadyReadOf(id, log)]));
	if (!plan) return { plan: null, alreadyRead };
	return { plan: planState(plan, log, today, await keysReadOn(username, today)), alreadyRead };
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const username = await user(locals);
	const today = url.searchParams.get('today');
	if (!validDay(today)) throw error(400, 'today must be a local YYYY-MM-DD');
	return json(await state(username, today));
};

export const POST: RequestHandler = async ({ locals, request, params }) => {
	const username = await user(locals);
	const body = await request.json().catch(() => ({}));
	const lang = params.faithLang === 'faith' ? 'en' : 'de';
	if (body.action === 'start') {
		if (!isPlanId(body.plan)) throw error(400, 'plan must be one of historia, canon, nt-psalms, nt, ot');
		if (!validPace(body.minutesPerDay)) throw error(400, 'minutesPerDay must be 1–240');
		if (!validDay(body.today)) throw error(400, 'today must be a local YYYY-MM-DD');
		await startPlan(username, body.plan, lang, body.minutesPerDay, body.today, body.creditEarlier === true);
		return json(await state(username, body.today));
	}
	if (body.action === 'pace') {
		if (!validPace(body.minutesPerDay)) throw error(400, 'minutesPerDay must be 1–240');
		if (!validDay(body.today)) throw error(400, 'today must be a local YYYY-MM-DD');
		if (!(await setPace(username, body.minutesPerDay, body.today))) throw error(404, 'no active plan');
		return json(await state(username, body.today));
	}
	if (body.action === 'finish') {
		const done = await finishPlan(username, validDay(body.today) ? body.today : localDateStr());
		return json({ ok: done });
	}
	throw error(400, 'action must be start, pace or finish');
};

function validPace(x: unknown): x is number {
	return typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 240;
}

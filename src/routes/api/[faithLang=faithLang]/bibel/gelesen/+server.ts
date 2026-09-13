import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { canonSlug } from '$lib/faith/bibleCanon';
import { activePlan, firstUnreadChapter, markRead, perBook, planPeriods, readingLog, resetLog, streakDays, streakFor, unmarkRead, validDay, validKey, type ResetScope } from '$lib/server/bibleReading';

// The reading log of the signed-in reader, plan or no plan.
//   GET    ?today=YYYY-MM-DD           → chapters read, per-book counts, reading days, streak
//   POST   { key, day }                → mark a chapter read on that day
//   DELETE { key, day? }               → unmark (that day, or every day)
//   DELETE { scope: 'all' | 'testament' + testament | 'book' + slug } → bulk reset
async function user(locals: App.Locals): Promise<string> {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user?.nickname) throw error(401, 'Authentication required');
	return session.user.nickname;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const username = await user(locals);
	const today = url.searchParams.get('today');
	if (!validDay(today)) throw error(400, 'today must be a local YYYY-MM-DD');
	const [log, periods] = await Promise.all([readingLog(username), planPeriods(username)]);
	return json({
		chapters: Object.fromEntries(log.chapters),
		perBook: perBook(log),
		days: log.days,
		streakDays: streakDays(log, periods),
		streak: streakFor(log, periods, today)
	});
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const username = await user(locals);
	const body = await request.json().catch(() => ({}));
	if (!validKey(body.key)) throw error(400, 'key must be <book>/<chapter> of the canon');
	if (!validDay(body.day)) throw error(400, 'day must be a local YYYY-MM-DD near today');
	const plan = await activePlan(username);
	await markRead(username, body.key, body.day, plan?._id ?? null);
	const [log, periods] = await Promise.all([readingLog(username), planPeriods(username)]);
	return json({ ok: true, streak: streakFor(log, periods, body.day), firstUnread: firstUnreadChapter(log, body.key.split('/')[0]) });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	const username = await user(locals);
	const body = await request.json().catch(() => ({}));
	let removed: number;
	if (typeof body.scope === 'string') {
		let scope: ResetScope;
		if (body.scope === 'all') scope = { scope: 'all' };
		else if (body.scope === 'testament' && (body.testament === 'ot' || body.testament === 'nt')) scope = { scope: 'testament', testament: body.testament };
		else if (body.scope === 'book' && typeof body.slug === 'string' && canonSlug(body.slug)) scope = { scope: 'book', slug: canonSlug(body.slug)! };
		else throw error(400, 'scope must be all, testament (ot|nt) or book (slug)');
		removed = await resetLog(username, scope);
	} else {
		if (!validKey(body.key)) throw error(400, 'key must be <book>/<chapter> of the canon');
		if (body.day !== undefined && !validDay(body.day)) throw error(400, 'day must be a local YYYY-MM-DD near today');
		removed = await unmarkRead(username, body.key, body.day);
	}
	const [log, periods] = await Promise.all([readingLog(username), planPeriods(username)]);
	const today = typeof body.today === 'string' && validDay(body.today) ? body.today : (log.days[log.days.length - 1] ?? '2000-01-01');
	return json({ ok: true, removed, streak: streakFor(log, periods, today), firstUnread: typeof body.key === 'string' ? firstUnreadChapter(log, body.key.split('/')[0]) : null });
};

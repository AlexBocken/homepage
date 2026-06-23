// Shared handler for the public period-calendar ICS feed, served at the
// localized top-level routes /period (English) and /periode (German). Gated by
// HTTP Basic Auth: username = the generator's nickname (the one who created the
// link), password = the subscription token. Knowing the URL alone is not enough
// — you also need the username + an un-revoked token. The feed serves the token's
// dataOwner entries (the generator's own, or a tracker that was shared with them).

import type { RequestEvent } from '@sveltejs/kit';
import { dbConnect } from '$utils/db';
import { PeriodEntry } from '$models/PeriodEntry';
import { PeriodCalendarToken } from '$models/PeriodCalendarToken';
import { periodICSEvents, type IcsLang } from '$lib/server/periodEvents';
import { buildICS, icsHeaders } from '$lib/server/ics';

function unauthorized() {
	return new Response('Authentication required', {
		status: 401,
		headers: { 'WWW-Authenticate': 'Basic realm="Period calendar", charset="UTF-8"' }
	});
}

const CAL_NAME: Record<IcsLang, string> = { en: 'Period', de: 'Periode' };
const CAL_DESC: Record<IcsLang, string> = {
	en: 'Logged and projected cycle (period, fertile window, ovulation, luteal phase).',
	de: 'Erfasster und vorhergesagter Zyklus (Periode, fruchtbares Fenster, Eisprung, Lutealphase).'
};

export async function servePeriodICS(
	{ request }: Pick<RequestEvent, 'request'>,
	lang: IcsLang
): Promise<Response> {
	const header = request.headers.get('authorization') || '';
	const match = header.match(/^Basic\s+(.+)$/i);
	if (!match) return unauthorized();

	let username = '';
	let password = '';
	try {
		const decoded = Buffer.from(match[1], 'base64').toString('utf8');
		const sep = decoded.indexOf(':');
		if (sep < 0) return unauthorized();
		username = decoded.slice(0, sep).toLowerCase();
		password = decoded.slice(sep + 1);
	} catch {
		return unauthorized();
	}
	if (!username || !password) return unauthorized();

	await dbConnect();
	const tokenDoc = await PeriodCalendarToken.findOne({ token: password }).lean();
	if (!tokenDoc) return unauthorized();
	if (tokenDoc.createdBy.toLowerCase() !== username) return unauthorized();

	const entries = await PeriodEntry.find({ createdBy: tokenDoc.dataOwner })
		.select('startDate endDate')
		.lean();

	// Calendar name is derived server-side from the token's data owner. The
	// optional [[name]] path segment is cosmetic — it just lets calendar clients
	// (e.g. Thunderbird) pre-fill a sensible default name from the URL.
	const owner = tokenDoc.dataOwner;
	const ownerName = owner.charAt(0).toUpperCase() + owner.slice(1);
	const calName = `${CAL_NAME[lang]} ${ownerName}`;
	const events = periodICSEvents(
		entries.map((e) => ({ startDate: e.startDate, endDate: e.endDate })),
		lang
	);
	const ics = buildICS({
		name: calName,
		description: CAL_DESC[lang],
		color: '#BF616A',
		refreshInterval: 'PT12H',
		events
	});

	return new Response(ics, { headers: icsHeaders(`${calName}.ics`) });
}

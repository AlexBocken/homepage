import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { canonSection } from '$lib/server/council';
import { LAST_CANON, parseRange, type CouncilLang } from '$lib/faith/councilTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();

	const range = parseRange(params.ref, LAST_CANON);
	if (!range) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	// A canon is read in the division it stands in, as it is in the book: canon
	// 1055 comes with the rest of the title on marriage.
	const section = await canonSection(lang as CouncilLang, range!.from);
	if (!section) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	return { canon: params.canon, section: section!, highlight: range };
};

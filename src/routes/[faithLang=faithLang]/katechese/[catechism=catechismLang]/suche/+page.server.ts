import type { PageServerLoad } from './$types';
import { search, sectionTitle } from '$lib/server/ccc';
import type { CccLang } from '$lib/faith/cccTypes';

/** How many hits the page shows before asking for a narrower search. */
const LIMIT = 80;

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { lang } = await parent();
	const q = url.searchParams.get('q')?.trim() ?? '';

	// Searched on the server, so a shared link opens on its results and a
	// browser with no script running gets them too.
	const found = q ? await search(lang as CccLang, q, LIMIT + 1) : [];
	const hits = found.slice(0, LIMIT).map((hit) => ({ ...hit, title: sectionTitle(lang as CccLang, hit.section) }));

	return { catechism: params.catechism, q, hits, more: found.length > LIMIT };
};

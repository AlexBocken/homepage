import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { loadSection, neighbours, sectionOf, sectionTitle } from '$lib/server/ccc';
import { parseCccRange, type CccLang } from '$lib/faith/cccTypes';

export const load: PageServerLoad = async ({ params, url, fetch, parent }) => {
	const { lang } = await parent();

	// A citation — `2095`, `1322-1327` — is an address, not a page: it redirects
	// into whichever section holds the paragraph, anchored at it. That keeps one
	// renderer and lets every link on the site cite by number alone.
	const range = parseCccRange(params.ref);
	if (range) {
		const id = sectionOf(range.from);
		if (!id) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
		const span = range.to !== range.from ? `?r=${range.from}-${range.to}` : '';
		redirect(308, `/${params.faithLang}/${params.catechism}/${id}${span}#n${range.from}`);
	}

	const section = await loadSection(lang as CccLang, params.ref);
	if (!section) await errorWithVerse(fetch, url.pathname, 404, 'Not found');

	const { prev, next } = neighbours(params.ref);
	const highlight = parseCccRange(url.searchParams.get('r') ?? '');

	return {
		catechism: params.catechism,
		section: section!,
		prev: prev ? { id: prev, title: sectionTitle(lang as CccLang, prev) } : null,
		next: next ? { id: next, title: sectionTitle(lang as CccLang, next) } : null,
		highlight
	};
};

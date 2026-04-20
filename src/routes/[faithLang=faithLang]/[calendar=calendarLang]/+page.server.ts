import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { expectedSlug } from './calendarI18n';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const slug = expectedSlug(params.faithLang);
	if (slug === null) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	if (params.calendar !== slug) {
		throw redirect(307, `/${params.faithLang}/${slug}`);
	}
	const search = url.search ?? '';
	throw redirect(307, `/${params.faithLang}/${params.calendar}/1962${search}`);
};

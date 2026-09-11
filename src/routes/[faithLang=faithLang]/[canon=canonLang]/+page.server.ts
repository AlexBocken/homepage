import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { books } from '$lib/server/council';
import { LAST_CANON, parseRange, type CouncilLang } from '$lib/faith/councilTypes';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { lang } = await parent();

	// The jump box is a plain GET form, so it works with no script running.
	const asked = url.searchParams.get('n')?.trim();
	const range = asked ? parseRange(asked, LAST_CANON) : null;
	if (range) redirect(303, `/${params.faithLang}/${params.canon}/${asked}`);

	return {
		canon: params.canon,
		asked: asked ?? '',
		notFound: !!asked && !range,
		books: await books(lang as CouncilLang)
	};
};

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sectionOf, toc } from '$lib/server/ccc';
import { parseCccRange, type CccLang } from '$lib/faith/cccTypes';

export const load: PageServerLoad = async ({ params, url, parent }) => {
	const { lang } = await parent();

	// The jump box is a plain GET form, so it works with no script running: it
	// lands here with `?n=…`. A number is an address and is answered with a
	// redirect into the section that holds it; anything else is a search.
	const asked = url.searchParams.get('n')?.trim();
	if (asked) {
		const range = parseCccRange(asked);
		const id = range && sectionOf(range.from);
		if (id) {
			const span = range.to !== range.from ? `?r=${range.from}-${range.to}` : '';
			redirect(303, `/${params.faithLang}/${params.catechism}/${id}${span}#n${range.from}`);
		}
		redirect(303, `/${params.faithLang}/${params.catechism}/suche?q=${encodeURIComponent(asked)}`);
	}

	return {
		catechism: params.catechism,
		asked: asked ?? '',
		toc: toc(lang as CccLang)
	};
};

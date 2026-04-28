import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const expectedSlug = { de: 'apologetik', en: 'apologetics' } as const;

export const load: LayoutServerLoad = async ({ params, parent, url }) => {
	const { lang, faithLang } = await parent();

	const prefix = `/${faithLang}/${params.apologetikSlug}`;
	const tail = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';

	if (lang === 'la') {
		throw redirect(307, `/faith/apologetics${tail}${url.search}`);
	}

	const want = expectedSlug[lang as 'de' | 'en'];
	if (params.apologetikSlug !== want) {
		throw redirect(307, `/${faithLang}/${want}${tail}${url.search}`);
	}

	return { apologetikSlug: want };
};

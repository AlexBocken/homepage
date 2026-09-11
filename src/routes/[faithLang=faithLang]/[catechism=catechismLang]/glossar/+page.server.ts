import type { PageServerLoad } from './$types';
import { glossary } from '$lib/server/ccc';
import type { CccLang } from '$lib/faith/cccTypes';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { lang } = await parent();
	return { catechism: params.catechism, terms: glossary(lang as CccLang) };
};

import type { PageServerLoad } from './$types';
import { register } from '$lib/server/ccc';
import type { CccLang } from '$lib/faith/cccTypes';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { lang } = await parent();
	return { catechism: params.catechism, entries: (await register(lang as CccLang)) ?? [] };
};

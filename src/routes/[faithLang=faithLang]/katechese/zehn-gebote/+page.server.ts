import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// The general Decalogue content moved to /katechese; the first-commandment
// introduction moved to /katechese/erstes-gebot. Keep the old URL alive.
export const load: PageServerLoad = async ({ params }) => {
	redirect(301, `/${params.faithLang}/katechese/erstes-gebot`);
};

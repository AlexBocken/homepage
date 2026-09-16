import type { PageServerLoad } from './$types';
import { MAGISTERIUM } from '$lib/faith/magisterium';

export const load: PageServerLoad = async ({ params }) => {
	return { magisterium: params.magisterium, documents: MAGISTERIUM };
};

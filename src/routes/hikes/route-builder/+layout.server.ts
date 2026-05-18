import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const session = locals.session ?? (await locals.auth());
	if (!session?.user) {
		throw redirect(303, `/login?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return { session };
};

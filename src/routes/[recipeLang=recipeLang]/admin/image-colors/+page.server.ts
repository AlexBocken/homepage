import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const session = await locals.auth();

	if (!session?.user?.nickname) {
		const callbackUrl = encodeURIComponent(url.pathname);
		throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
	}

	if (!session.user.groups?.includes('rezepte_users')) {
		await errorWithVerse(fetch, url.pathname, 403, 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	return {
		user: session.user
	};
};

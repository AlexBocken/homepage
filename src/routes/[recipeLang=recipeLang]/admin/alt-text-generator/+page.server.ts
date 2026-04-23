import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { errorWithVerse } from '$lib/server/errorQuote';

export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const session = locals.session ?? await locals.auth();

	// Redirect to login if not authenticated
	if (!session?.user?.nickname) {
		const callbackUrl = encodeURIComponent(url.pathname);
		throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
	}

	// Check user group permission
	if (!session.user.groups?.includes('rezepte_users')) {
		await errorWithVerse(fetch, url.pathname, 403, 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	return {
		user: session.user
	};
};

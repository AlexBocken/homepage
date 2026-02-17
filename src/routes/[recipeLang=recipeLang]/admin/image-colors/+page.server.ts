import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();

	if (!session?.user?.nickname) {
		const callbackUrl = encodeURIComponent(url.pathname);
		throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
	}

	if (!session.user.groups?.includes('rezepte_users')) {
		throw error(403, 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	return {
		user: session.user
	};
};

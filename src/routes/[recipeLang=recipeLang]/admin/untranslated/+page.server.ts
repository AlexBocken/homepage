import type { PageServerLoad } from "./$types";
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals, url, params }) => {
	const session = await locals.auth();

	// Redirect to login if not authenticated
	if (!session?.user?.nickname) {
		const callbackUrl = encodeURIComponent(url.pathname);
		throw redirect(302, `/login?callbackUrl=${callbackUrl}`);
	}

	// Check user group permission
	if (!session.user.groups?.includes('rezepte_users')) {
		throw error(403, 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich.');
	}

	try {
		const res = await fetch('/api/rezepte/translate/untranslated');

		if (!res.ok) {
			return {
				untranslated: [],
				session,
				recipeLang: params.recipeLang,
				error: 'Fehler beim Laden der unübersetzten Rezepte'
			};
		}

		const untranslated = await res.json();

		return {
			untranslated,
			session,
			recipeLang: params.recipeLang
		};
	} catch (e) {
		return {
			untranslated: [],
			session,
			recipeLang: params.recipeLang,
			error: 'Fehler beim Laden der unübersetzten Rezepte'
		};
	}
};

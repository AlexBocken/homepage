import type { LayoutServerLoad } from "./$types"
import { error } from "@sveltejs/kit";

export const load : LayoutServerLoad = async ({locals, params}) => {
	// Validate faithLang parameter
	if (params.faithLang !== 'glaube' && params.faithLang !== 'faith') {
		throw error(404, 'Not found');
	}

	const lang = params.faithLang === 'faith' ? 'en' : 'de';

	return {
		session: await locals.auth(),
		lang,
		faithLang: params.faithLang
	}
};

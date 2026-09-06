import type { PageServerLoad } from './$types';
import { availableBooks, bookSummary } from '$lib/server/bibleBooks';

export const load: PageServerLoad = async ({ params }) => {
	return {
		bibleLang: params.bible,
		books: availableBooks()
			.map((slug) => bookSummary(slug))
			.filter((b): b is NonNullable<typeof b> => b !== null)
	};
};

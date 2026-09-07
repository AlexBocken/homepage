import type { PageServerLoad } from './$types';
import { errorWithVerse } from '$lib/server/errorQuote';
import { authorCoverage, fatherFor } from '$lib/server/commentary';
import { bioFor } from '$lib/data/fathersBio';

/** One commentator: his life in four short sections, and where he speaks in the reader. */
export const load: PageServerLoad = async ({ params, parent, fetch, url }) => {
	const author = params.author;
	if (!/^[a-z0-9-]{1,48}$/.test(author)) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	const { lang } = await parent();
	const [father, books] = await Promise.all([fatherFor(author), authorCoverage(author)]);
	if (!father) await errorWithVerse(fetch, url.pathname, 404, 'Not found');
	return {
		bibleLang: params.bible,
		father: { id: father!.id, name: father!.name, saint: !!father!.saint, died: father!.died, group: father!.group, portrait: father!.portrait ? { artist: father!.portrait.artist, title: father!.portrait.title, year: father!.portrait.year } : null },
		bio: bioFor(author, lang === 'en' ? 'en' : lang === 'la' ? 'la' : 'de'),
		books,
		total: books.reduce((n, b) => n + b.n, 0)
	};
};

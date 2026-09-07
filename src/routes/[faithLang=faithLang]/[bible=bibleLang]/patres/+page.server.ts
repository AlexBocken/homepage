import type { PageServerLoad } from './$types';
import { allAuthors } from '$lib/server/commentary';
import { hasBio } from '$lib/data/fathersBio';

/** Everyone who speaks in the reader, grouped into Fathers, medievals and moderns. */
export const load: PageServerLoad = async ({ params }) => {
	const authors = (await allAuthors()).map((a) => ({ ...a, hasBio: hasBio(a.id) }));
	// Within a group those with a written life first, then by year of death, the undated last.
	const byDeath = (a: (typeof authors)[number], b: (typeof authors)[number]) => Number(b.hasBio) - Number(a.hasBio) || (a.died ?? 9999) - (b.died ?? 9999) || b.n - a.n;
	return {
		bibleLang: params.bible,
		groups: {
			father: authors.filter((a) => a.group === 'father').sort(byDeath),
			medieval: authors.filter((a) => a.group === 'medieval').sort(byDeath),
			modern: authors.filter((a) => a.group === 'modern').sort(byDeath)
		}
	};
};

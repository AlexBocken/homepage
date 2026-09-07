import type { PageServerLoad } from './$types';
import { allAuthors } from '$lib/server/commentary';
import { hasBio } from '$lib/data/fathersBio';

/** Everyone who speaks in the reader, grouped into Fathers, medievals and moderns. */
export const load: PageServerLoad = async ({ params }) => {
	const authors = (await allAuthors()).map((a) => ({ ...a, hasBio: hasBio(a.id) }));
	// Within a group those with a written life first, then by year of death, the undated last.
	const byDeath = (a: (typeof authors)[number], b: (typeof authors)[number]) => Number(b.hasBio) - Number(a.hasBio) || (a.died ?? 9999) - (b.died ?? 9999) || b.n - a.n;
	// The renowned commentators by period; the minor voices apart, most prolific first.
	const major = authors.filter((a) => a.major);
	return {
		bibleLang: params.bible,
		groups: {
			father: major.filter((a) => a.group === 'father').sort(byDeath),
			medieval: major.filter((a) => a.group === 'medieval').sort(byDeath),
			modern: major.filter((a) => a.group === 'modern').sort(byDeath),
			minor: authors.filter((a) => !a.major).sort((a, b) => b.n - a.n || (a.died ?? 9999) - (b.died ?? 9999))
		}
	};
};

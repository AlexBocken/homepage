import type { PageServerLoad } from './$types';
import { catalogQueryFromParams } from '$lib/fitness/exerciseCatalog';
import { catalogFilters, searchCatalog } from '$lib/server/exerciseCatalog';
import { detectFitnessLang } from '$lib/js/fitnessI18n';

// The first result set is built here from the URL, so a reader with no script
// gets exactly the filtered list the address bar asks for. With script the page
// refetches from /api/fitness/exercises/catalog as the filters change.
export const load: PageServerLoad = async ({ url }) => {
	const lang = detectFitnessLang(url.pathname);
	return {
		results: searchCatalog(catalogQueryFromParams(url.searchParams), lang),
		filterOptions: catalogFilters()
	};
};

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { catechismSlug, langFromFaithSlug } from '$lib/js/faithI18n';

// The Catechism was at /glaube/katechismus before it moved under the catechesis
// section as /glaube/katechese/kkk. Citations of the old address are written
// down in other people's notes, so they keep working: everything below it —
// a paragraph, the register, the glossary, a search — moves across unchanged.
export const GET: RequestHandler = ({ params, url }) => {
	const slug = catechismSlug(langFromFaithSlug(params.faithLang));
	const rest = params.rest ? `/${params.rest}` : '';
	redirect(308, `/${params.faithLang}/katechese/${slug}${rest}${url.search}`);
};

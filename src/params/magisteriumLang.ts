import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/**
 * The papal and curial documents under /glaube, /faith and /fides. German has
 * no one word for an encyclical, a constitution and a CDF instruction at once
 * except "Lehrschreiben"; English and Latin share "magisterium".
 */
export const match: ParamMatcher = slugMatcher(SLUGS.magisterium);

import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/**
 * Where the Catechism used to live: /glaube/katechismus, /faith/catechism,
 * /fides/catechismus. It now stands under the catechesis section, cited by its
 * abbreviation, and these addresses redirect there.
 */
export const match: ParamMatcher = slugMatcher(SLUGS.catechismLegacy);

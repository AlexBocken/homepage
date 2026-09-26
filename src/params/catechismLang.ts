import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/**
 * The Catechism under /glaube/katechese, /faith/katechese and /fides/katechese,
 * by the abbreviation each language cites it with: KKK (Katechismus der
 * Katholischen Kirche), CCC (Catechism of the Catholic Church), CCE
 * (Catechismus Catholicae Ecclesiae).
 */
export const match: ParamMatcher = slugMatcher(SLUGS.catechism);

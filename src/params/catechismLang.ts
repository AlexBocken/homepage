import type { ParamMatcher } from '@sveltejs/kit';

/**
 * The Catechism under /glaube/katechese, /faith/katechese and /fides/katechese,
 * by the abbreviation each language cites it with: KKK (Katechismus der
 * Katholischen Kirche), CCC (Catechism of the Catholic Church), CCE
 * (Catechismus Catholicae Ecclesiae).
 */
export const match: ParamMatcher = (param) => {
	return param === 'kkk' || param === 'ccc' || param === 'cce';
};

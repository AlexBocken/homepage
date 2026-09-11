import type { ParamMatcher } from '@sveltejs/kit';

/**
 * Where the Catechism used to live: /glaube/katechismus, /faith/catechism,
 * /fides/catechismus. It now stands under the catechesis section, cited by its
 * abbreviation, and these addresses redirect there.
 */
export const match: ParamMatcher = (param) => {
	return param === 'katechismus' || param === 'catechism' || param === 'catechismus';
};

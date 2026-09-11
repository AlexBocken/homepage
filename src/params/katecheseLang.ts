import type { ParamMatcher } from '@sveltejs/kit';

/** The catechesis section: katechese · catechesis (Latin uses the same word). */
export const match: ParamMatcher = (param) => {
	return param === 'katechese' || param === 'catechesis';
};

import type { ParamMatcher } from '@sveltejs/kit';

/** The council under /glaube, /faith and /fides: konzil · council · concilium. */
export const match: ParamMatcher = (param) => {
	return param === 'konzil' || param === 'council' || param === 'concilium';
};

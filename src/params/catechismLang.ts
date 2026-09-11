import type { ParamMatcher } from '@sveltejs/kit';

/** The Catechism under /glaube, /faith and /fides: katechismus · catechism · catechismus. */
export const match: ParamMatcher = (param) => {
	return param === 'katechismus' || param === 'catechism' || param === 'catechismus';
};

import type { ParamMatcher } from '@sveltejs/kit';

/** The Bible under /glaube, /faith and /fides: bibel · bible · biblia. */
export const match: ParamMatcher = (param) => {
	return param === 'bibel' || param === 'bible' || param === 'biblia';
};

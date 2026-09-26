import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/** The council under /glaube, /faith and /fides: konzil · council · concilium. */
export const match: ParamMatcher = slugMatcher(SLUGS.council);

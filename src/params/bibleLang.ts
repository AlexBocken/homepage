import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/** The Bible under /glaube, /faith and /fides: bibel · bible · biblia. */
export const match: ParamMatcher = slugMatcher(SLUGS.bible);

import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/** The catechesis section: katechese · catechesis (Latin uses the same word). */
export const match: ParamMatcher = slugMatcher(SLUGS.katechese);

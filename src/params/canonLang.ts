import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/** The Code of Canon Law: kirchenrecht · canon-law · ius-canonicum. */
export const match: ParamMatcher = slugMatcher(SLUGS.canon);

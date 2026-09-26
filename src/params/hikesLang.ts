import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

/** `/hikes/…` is English, `/wanderungen/…` German — one route tree, the
 * language carried by the first segment (see `$lib/js/hikesI18n`). */
export const match: ParamMatcher = slugMatcher(SLUGS.hikes);

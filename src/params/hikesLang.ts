import type { ParamMatcher } from '@sveltejs/kit';

/** `/hikes/…` is English, `/wanderungen/…` German — one route tree, the
 * language carried by the first segment (see `$lib/js/hikesI18n`). */
export const match: ParamMatcher = (param) => {
	return param === 'hikes' || param === 'wanderungen';
};

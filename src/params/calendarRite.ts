import type { ParamMatcher } from '@sveltejs/kit';

// Accepts the new Latin slugs (`vetus` / `novus`) plus the legacy year slugs
// so old bookmarks land on a load handler that 307s them to the new shape.
export const match: ParamMatcher = (param) => {
	return param === 'vetus' || param === 'novus' || param === '1962' || param === '1969';
};

import type { ParamMatcher } from '@sveltejs/kit';

// Activity board slug in segment URLs (…/segments/<activity>/best/<N>k). Matching
// only the known activities keeps this dynamic segment from colliding with the
// sibling [id] segment-detail route.
export const match: ParamMatcher = (param) => {
	return param === 'running' || param === 'cycling';
};

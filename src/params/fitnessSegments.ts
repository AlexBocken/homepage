import type { ParamMatcher } from '@sveltejs/kit';
import { SLUGS, slugMatcher } from '$lib/js/slugs';

export const match: ParamMatcher = slugMatcher(SLUGS.fitnessSegments);

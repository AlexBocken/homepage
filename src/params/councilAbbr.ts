import type { ParamMatcher } from '@sveltejs/kit';
import { isCouncilAbbr } from '$lib/faith/councilTypes';

/** One of the council's sixteen documents, by the abbreviation it is cited by. */
export const match: ParamMatcher = (param) => isCouncilAbbr(param);

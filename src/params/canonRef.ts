import type { ParamMatcher } from '@sveltejs/kit';

/** A canon, or a short run of them: `1055`, `916-917`. */
export const match: ParamMatcher = (param) => /^\d{1,4}(?:-\d{1,4})?$/.test(param);

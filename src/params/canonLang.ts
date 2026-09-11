import type { ParamMatcher } from '@sveltejs/kit';

/** The Code of Canon Law: kirchenrecht · canon-law · ius-canonicum. */
export const match: ParamMatcher = (param) => {
	return param === 'kirchenrecht' || param === 'canon-law' || param === 'ius-canonicum';
};

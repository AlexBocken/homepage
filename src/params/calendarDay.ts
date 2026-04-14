import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => {
	if (!/^\d{2}$/.test(param)) return false;
	const n = Number(param);
	return n >= 1 && n <= 31;
};

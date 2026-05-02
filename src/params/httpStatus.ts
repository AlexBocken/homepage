import type { ParamMatcher } from '@sveltejs/kit';

export const HTTP_ERROR_STATUSES = ['401', '403', '404', '500', '502', '503', '504'] as const;
const SET = new Set<string>(HTTP_ERROR_STATUSES);

export const match: ParamMatcher = (param) => SET.has(param);

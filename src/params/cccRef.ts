import type { ParamMatcher } from '@sveltejs/kit';

/**
 * What may stand after /glaube/katechismus/: a citation — `2095`, `1322-1327` —
 * or a section id as the importer spells it, `p2s2c1a3`. A citation is answered
 * with a redirect into the section that holds it, so the short form is what a
 * link elsewhere on the site carries and the long form is what the reader shows.
 */
export const match: ParamMatcher = (param) => {
	return /^\d{1,4}(?:-\d{1,4})?$/.test(param) || /^(?:fidei-depositum|prologus|p\d+)(?:s\d+)?(?:c\d+)?(?:a\d+)?(?:p\d+)?$/.test(param);
};

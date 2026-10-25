import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { getOverview } from '$lib/server/caseMath';
import { SKILL_BY_ID } from '$lib/js/caseMath/skills';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (params.skill !== 'mixed' && !SKILL_BY_ID[params.skill]) throw error(404, 'No such skill');
	const user = await requireFinanceOwner(locals);
	const { skills } = await getOverview(user.nickname);
	const levels = Object.fromEntries(Object.entries(skills).map(([id, s]) => [id, s.level]));
	return { skill: params.skill, levels };
};

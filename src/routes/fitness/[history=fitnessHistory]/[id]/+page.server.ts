import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/fitness/sessions/${params.id}`);

	if (!res.ok) {
		error(404, 'Session not found');
	}

	return {
		session: (await res.json()).session
	};
};

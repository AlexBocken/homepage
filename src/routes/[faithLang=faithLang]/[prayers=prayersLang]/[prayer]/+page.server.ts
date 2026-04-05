import type { PageServerLoad, Actions } from "./$types";
import { error } from "@sveltejs/kit";
import { validPrayerSlugs } from '$lib/data/prayerSlugs';

const angelusSlugs = new Set(['angelus', 'regina-caeli']);

export const load: PageServerLoad = async ({ params, url, locals, fetch }) => {
	if (!validPrayerSlugs.has(params.prayer)) {
		throw error(404, 'Prayer not found');
	}

	const latinParam = url.searchParams.get('latin');
	const hasUrlLatin = latinParam !== null;
	const initialLatin = hasUrlLatin ? latinParam !== '0' : true;

	const result: Record<string, unknown> = {
		prayer: params.prayer,
		initialLatin,
		hasUrlLatin
	};

	// Fetch angelus streak data for angelus/regina-caeli pages
	if (angelusSlugs.has(params.prayer)) {
		const session = await locals.auth();
		if (session?.user?.nickname) {
			try {
				const res = await fetch('/api/glaube/angelus-streak');
				if (res.ok) {
					result.angelusStreak = await res.json();
				}
			} catch {
				// Fail silently — streak will use localStorage
			}
		}
	}

	return result;
};

export const actions: Actions = {
	'pray-angelus': async ({ request, locals, fetch }) => {
		const session = await locals.auth();
		if (!session?.user?.nickname) {
			throw error(401, 'Authentication required');
		}

		const formData = await request.formData();
		const time = formData.get('time') as string;

		if (!['morning', 'noon', 'evening'].includes(time)) {
			throw error(400, 'Invalid time slot');
		}

		const bits: Record<string, number> = { morning: 1, noon: 2, evening: 4 };
		const today = new Date().toISOString().split('T')[0];

		// Fetch current state
		let current = { streak: 0, lastComplete: null as string | null, todayPrayed: 0, todayDate: null as string | null };
		try {
			const res = await fetch('/api/glaube/angelus-streak');
			if (res.ok) {
				current = await res.json();
			}
		} catch {
			// Start fresh
		}

		// Reset if date rolled over
		if (current.todayDate !== today) {
			current.todayPrayed = 0;
			current.todayDate = today;
		}

		// Set the bit
		current.todayPrayed |= bits[time];
		current.todayDate = today;

		// Check completion
		if (current.todayPrayed === 7) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = yesterday.toISOString().split('T')[0];

			if (current.lastComplete === yesterdayStr) {
				current.streak += 1;
			} else if (current.lastComplete !== today) {
				current.streak = 1;
			}
			current.lastComplete = today;
		}

		// Save
		await fetch('/api/glaube/angelus-streak', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(current)
		});

		return { success: true };
	}
};

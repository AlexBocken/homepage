import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const month = params.month; // YYYY-MM or undefined

	if (month) {
		// Specific month view
		const res = await fetch(`/api/fitness/sessions?month=${month}&limit=200`);
		return {
			sessions: await res.json(),
			month,
		};
	}

	// Default: last 2 months
	const now = new Date();
	const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const fromMonth = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, '0')}`;
	const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	const [curRes, prevRes] = await Promise.all([
		fetch(`/api/fitness/sessions?month=${currentMonth}&limit=200`),
		fetch(`/api/fitness/sessions?month=${fromMonth}&limit=200`),
	]);

	const curData = await curRes.json();
	const prevData = await prevRes.json();

	return {
		sessions: {
			sessions: [...(curData.sessions ?? []), ...(prevData.sessions ?? [])],
			total: (curData.total ?? 0) + (prevData.total ?? 0),
		},
		month: null,
	};
};

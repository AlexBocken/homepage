// Build the MongoDB filter for payment search from URL params. Shared by the
// list endpoint and the facets endpoint so the two never drift. Pass
// `{ amount: false }` to omit the amount-range clause — the facets histogram
// needs every-other-filter applied but not the amount facet itself.

export function buildPaymentFilter(
	params: URLSearchParams,
	opts: { amount?: boolean } = {}
): Record<string, unknown> {
	const filter: Record<string, unknown> = {};

	const q = (params.get('q') || '').trim();
	if (q) {
		const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
		const or: Record<string, unknown>[] = [{ title: rx }, { description: rx }];
		const num = Number(q.replace(',', '.'));
		if (Number.isFinite(num)) or.push({ amount: num }, { originalAmount: num });
		filter.$or = or;
	}

	const category = params.get('category') || '';
	if (category) {
		const cats = category.split(',').filter(Boolean);
		if (cats.length) filter.category = cats.length > 1 ? { $in: cats } : cats[0];
	}

	const paidBy = params.get('paidBy') || '';
	if (paidBy) {
		const ps = paidBy.split(',').filter(Boolean);
		if (ps.length) filter.paidBy = ps.length > 1 ? { $in: ps } : ps[0];
	}

	const dateFrom = params.get('dateFrom');
	const dateTo = params.get('dateTo');
	if (dateFrom || dateTo) {
		const range: Record<string, Date> = {};
		if (dateFrom) range.$gte = new Date(dateFrom);
		if (dateTo) {
			const d = new Date(dateTo);
			d.setHours(23, 59, 59, 999);
			range.$lte = d;
		}
		filter.date = range;
	}

	if (opts.amount !== false) {
		const amountMin = params.get('amountMin');
		const amountMax = params.get('amountMax');
		if (amountMin || amountMax) {
			const range: Record<string, number> = {};
			if (amountMin) range.$gte = Number(amountMin);
			if (amountMax) range.$lte = Number(amountMax);
			filter.amount = range;
		}
	}

	return filter;
}

/**
 * How a payment is split between people, as signed balances: what each person
 * owes, with the payer's own share minus what they laid out (so the payer is
 * usually negative and the amounts sum to zero).
 *
 * Shared by the split-method picker and the payment edit page, which each had
 * their own copy of the same arithmetic.
 */

type ShareInput = {
	amount: number;
	users: string[];
	paidBy: string;
	/** personal_equal only: what each person spent on themselves alone. */
	personal?: (user: string) => number | undefined;
};

/**
 * Each user's balance under `method`, or `null` when there is nothing to
 * compute: no amount, no users (for the methods that divide by them), or a
 * method whose amounts are typed in by hand (`proportional`).
 */
export function computeShares(method: string, { amount, users, paidBy, personal }: ShareInput): Record<string, number> | null {
	const out: Record<string, number> = {};
	if (method === 'equal') {
		if (!amount || users.length === 0) return null;
		const share = amount / users.length;
		for (const user of users) out[user] = user === paidBy ? share - amount : share;
		return out;
	}
	if (method === 'full') {
		if (!amount) return null;
		const others = users.filter((user) => user !== paidBy);
		const perOther = others.length > 0 ? amount / others.length : 0;
		for (const user of users) out[user] = user === paidBy ? -amount : perOther;
		return out;
	}
	if (method === 'personal_equal') {
		if (!amount || users.length === 0) return null;
		const own = (user: string) => Number(personal?.(user)) || 0;
		const totalPersonal = users.reduce((sum, user) => sum + own(user), 0);
		const equalShare = Math.max(0, amount - totalPersonal) / users.length;
		for (const user of users) {
			const owed = own(user) + equalShare;
			out[user] = user === paidBy ? owed - amount : owed;
		}
		return out;
	}
	return null;
}

/**
 * Proportional splits rescaled to a new amount. The add and recurring forms
 * store net proportions (the payer's negative), summing to 0: those scale as
 * they are. Proportions summing to 1 are plain shares of the cost, and the
 * payer's outlay comes off theirs.
 */
export function rescaleProportional(amount: number, proportions: number[], payerIndex: number): number[] {
	const net = Math.abs(proportions.reduce((sum, p) => sum + p, 0)) < 0.5;
	return proportions.map((p, i) => (!net && i === payerIndex ? amount * p - amount : amount * p));
}

/** The `splits` a payment form sends: amounts, plus the proportion or personal amount its method keeps. */
export function buildSplitPayload(
	users: string[],
	method: string,
	amount: number,
	splitAmounts: Record<string, number>,
	personalAmounts: Record<string, number>
) {
	return users.map((user) => ({
		username: user,
		amount: splitAmounts[user] || 0,
		proportion: method === 'proportional' ? (splitAmounts[user] || 0) / amount : undefined,
		personalAmount: method === 'personal_equal' ? personalAmounts[user] || 0 : undefined
	}));
}

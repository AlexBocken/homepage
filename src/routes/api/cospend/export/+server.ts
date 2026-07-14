import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dbConnect } from '$utils/db';
import { Payment } from '$models/Payment';
import { PaymentSplit } from '$models/PaymentSplit';
import { verifyCospendApiToken } from '$lib/server/cospendApiAuth';

// Read-only export of the ENTIRE shared cospend ledger as JSON, for a beancount
// (or other) importer. Authenticated by a cospend API token only — no OIDC
// session. hooks.server.ts lets this exact path through the /api/cospend gate
// when a valid token is present; we re-verify here as defence in depth.
//
// Amounts are exposed in BOTH currencies so the importer never has to guess:
//   - amountChf      — the value in CHF (the operating currency)
//   - amountOriginal — the value in `currency` (the foreign currency the payment
//                      was entered in; equals amountChf when currency is CHF)
//   - currency       — the original currency code ('CHF' when not converted)
//   - exchangeRate   — original→CHF rate used at payment time (1 for CHF)
// The raw stored fields (amount = CHF, originalAmount, exchangeRate) are kept
// too. Splits store only CHF, so their foreign amount is derived as
// amountChf / exchangeRate.
//
// `balances` carries each user's current net balance in CHF (positive = owed to
// them, negative = they owe), for balance assertions on the importer side.

/** Round to 2 dp, leaving non-numbers untouched. */
function money(n: unknown): number | null | undefined {
	return typeof n === 'number' ? Math.round(n * 1e2) / 1e2 : (n as null | undefined);
}

export const GET: RequestHandler = async ({ request, url }) => {
	const tokenDoc = await verifyCospendApiToken(request, url);
	if (!tokenDoc) {
		throw error(401, 'Invalid or missing cospend API token.');
	}

	await dbConnect();
	// Reference PaymentSplit so its model is registered before populate('splits').
	void PaymentSplit;

	// `splits` is a populated virtual, so type the lean docs loosely for the
	// currency-enrichment transform below.
	const raw = (await Payment.find({})
		.populate('splits')
		.sort({ date: 1, createdAt: 1 })
		.lean()) as Array<Record<string, any>>;

	const payments = raw.map((p) => {
		const currency = (p.currency || 'CHF').toUpperCase();
		const isForeign = currency !== 'CHF' && !!p.exchangeRate;
		const rate = isForeign ? (p.exchangeRate as number) : 1;
		// Payment original amount is stored exactly (user-entered) when converted.
		const amountOriginal = isForeign ? (p.originalAmount ?? (p.amount as number) / rate) : p.amount;

		const splits = (p.splits ?? []).map((s: Record<string, any>) => {
			const chf = s.amount as number;
			const personalChf = s.personalAmount as number | undefined;
			return {
				...s,
				amountChf: money(chf),
				amountOriginal: money(isForeign ? chf / rate : chf),
				...(personalChf != null
					? {
							personalAmountChf: money(personalChf),
							personalAmountOriginal: money(isForeign ? personalChf / rate : personalChf)
						}
					: {})
			};
		});

		return {
			...p,
			currency,
			exchangeRate: rate,
			amountChf: money(p.amount),
			amountOriginal: money(amountOriginal),
			splits
		};
	});

	// Current net balance per user, in CHF: the sum of that user's splits over the
	// whole ledger (positive = owed, negative = owing). Derived from the same
	// splits we export, so a balance assertion can be checked against the imported
	// transactions without a second source of truth.
	const netByUser = new Map<string, number>();
	for (const p of payments) {
		for (const s of p.splits) {
			const amount = s.amount as number;
			if (typeof amount !== 'number') continue;
			netByUser.set(s.username, (netByUser.get(s.username) ?? 0) + amount);
		}
	}
	const balances = [...netByUser]
		.map(([username, netBalance]) => ({ username, netBalance: money(netBalance) }))
		.sort((a, b) => a.username.localeCompare(b.username));

	return json({
		generatedAt: new Date().toISOString(),
		operatingCurrency: 'CHF',
		count: payments.length,
		balances,
		payments
	});
};

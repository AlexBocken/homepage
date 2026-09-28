import { error } from '@sveltejs/kit';
import { SPLIT_METHODS } from '$lib/js/cospendI18n';

/** True for one of the known split methods. */
export function isSplitMethod(value: unknown): boolean {
	return (SPLIT_METHODS as readonly unknown[]).includes(value);
}

/**
 * For a personal + equal split, the personal amounts are carved out of the
 * total before the rest is shared, so together they may not exceed it.
 * Throws a 400 otherwise; other split methods pass.
 */
export function assertPersonalWithinTotal(
	splitMethod: unknown,
	splits: Array<{ personalAmount?: number }> | null | undefined,
	amount: number
) {
	if (splitMethod !== 'personal_equal' || !splits) return;
	const totalPersonal = splits.reduce((sum, split) => sum + (split.personalAmount ?? 0), 0);
	if (totalPersonal > amount) {
		throw error(400, 'Personal amounts cannot exceed total payment amount');
	}
}

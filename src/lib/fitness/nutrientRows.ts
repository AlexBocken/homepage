/**
 * One nutrient, ready to draw: a label, what was eaten, what a day asks for, and the
 * share of it that covers.
 *
 * The diary and a recipe's nutrition panel ask the same question of a nutrient — how
 * far does this go toward a day? — and used to answer it in two different ways: the
 * diary against the reference intakes, the recipe page as a bare milligram figure
 * that means nothing without knowing what a day needs. This is the one place that
 * turns a raw amount into a row, so both read identically.
 *
 * Pure: no Svelte, no database, no locale beyond picking one of the two stored labels.
 */

import { NUTRIENT_META, RELATIVE_TO, type DRI, type ExtraNutrientKey } from '$lib/data/dailyReferenceIntake';

export type NutrientRow = {
	key: string;
	label: string;
	unit: string;
	/** Amount eaten, in `unit`. Zero when nothing reported it — see `noData`. */
	value: number;
	/** What a day asks for. Zero when the nutrient has no requirement. */
	goal: number;
	/** Percentage of the goal, or of the parent figure for a relative row. Null when
	 *  neither applies — an unmeasured nutrient, or one with no reference at all. */
	pct: number | null;
	/** Bar length in percent. Same as `pct` where there is one, else nothing to draw. */
	bar: number;
	/** The reference is a ceiling rather than a target (sodium, trans fat …). */
	isMax: boolean;
	/** Nothing that was eaten publishes this nutrient, so the row reads as a dash.
	 *  A zero would draw an empty bar and look like a deficiency instead. */
	noData: boolean;
	/** For a row measured as a share of a larger figure: which figure that is. */
	relativeTo: string | null;
};

type NutrientKey = keyof DRI | ExtraNutrientKey;

/**
 * Build one row.
 *
 * `value` is the amount in the nutrient's own unit; pass `null` when no source
 * reported it, which is different from reporting zero. `values` supplies the parent
 * figure for the nutrients measured as a share of one (retinol of vitamin A, starch
 * of carbohydrate — see RELATIVE_TO); leave it out and those rows simply have no
 * percentage rather than a wrong one.
 */
export function nutrientRow(
	key: string,
	value: number | null | undefined,
	dri: Partial<DRI>,
	isEn: boolean,
	values?: (key: string) => number | null | undefined,
): NutrientRow {
	const meta = NUTRIENT_META[key as NutrientKey];
	const noData = typeof value !== 'number' || !Number.isFinite(value);
	const amount = noData ? 0 : (value as number);
	const goal = dri[key as keyof DRI] ?? 0;

	const parent = RELATIVE_TO[key as NutrientKey] ?? null;
	if (parent) {
		const whole = values?.(parent);
		const pct = typeof whole === 'number' && whole > 0 ? Math.round((amount / whole) * 100) : null;
		return {
			key, label: label(meta, isEn), unit: meta?.unit ?? '', value: amount, goal: 0,
			pct, bar: pct ?? 0, isMax: !!meta?.isMax, noData, relativeTo: parent,
		};
	}

	const pct = noData || goal <= 0 ? null : Math.round((amount / goal) * 100);
	return {
		key, label: label(meta, isEn), unit: meta?.unit ?? '', value: amount, goal,
		pct, bar: pct ?? 0, isMax: !!meta?.isMax, noData, relativeTo: null,
	};
}

/** Rows for a list of nutrients, in the order given. */
export function nutrientRows(
	keys: readonly string[],
	valueOf: (key: string) => number | null | undefined,
	dri: Partial<DRI>,
	isEn: boolean,
): NutrientRow[] {
	return keys.map(k => nutrientRow(k, valueOf(k), dri, isEn, valueOf));
}

function label(meta: { label: string; labelDe: string } | undefined, isEn: boolean): string {
	if (!meta) return '';
	return isEn ? meta.label : meta.labelDe;
}

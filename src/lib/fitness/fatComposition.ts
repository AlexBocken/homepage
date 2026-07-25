/**
 * The one shape every view uses to list fat composition.
 *
 * Three places show the same numbers — the diary's day panel, the nutrient
 * averages, and a single food — and they used to disagree about which rows exist:
 * only the averages carried the omega-3 / omega-6 totals at all. They read as one
 * thing now, and the acids sit under the total they add up to rather than in a flat
 * list where nothing says that EPA is part of the omega-3 figure two rows above.
 *
 * Omega totals are treated as headers, not as peers of the acids under them:
 * summing a column that holds both would count the same fat twice, so a parent's
 * share is measured against total fat and a child's against its own family.
 */

import { FATTY_ACID_META, OMEGA3_KEYS, OMEGA6_KEYS } from './fattyAcids';

/** Top-level rows, in display order, each with the acids it is the sum of. */
export const FAT_COMPOSITION_GROUPS: { key: string; children: readonly string[] }[] = [
	{ key: 'monounsaturatedFat', children: [] },
	{ key: 'polyunsaturatedFat', children: [] },
	{ key: 'omega6', children: OMEGA6_KEYS },
	{ key: 'omega3', children: OMEGA3_KEYS },
];

export type FatCompositionRow = {
	key: string;
	label: string;
	unit: 'g';
	value: number;
	/** Share of total fat for a top-level row, of its own family for a child. */
	pct: number | null;
	/** Bar width, 0-100. */
	bar: number;
	/** An acid listed under the omega total it belongs to. */
	child: boolean;
	/** An omega total that heads a group of acids. */
	header: boolean;
};

type Values = Record<string, number | null | undefined> | null | undefined;

/**
 * Build the rows.
 *
 * `totalFat` is what a top-level row's percentage is measured against; pass 0 when
 * it is unknown and those rows report no share rather than an invented one.
 *
 * `includeMissing` keeps rows a source never measured, shown as zero — right for a
 * day or an average, where the reading "you ate none" is the point. A single food
 * passes false, so its list stays what that source actually published.
 *
 * `withShort` appends the biochemical shorthand (`LA (18:2 n-6)`), which the
 * per-food view shows and the aggregate views do not.
 */
export function fatCompositionRows(
	values: Values,
	opts: { totalFat?: number; isEn?: boolean; includeMissing?: boolean; withShort?: boolean } = {},
): FatCompositionRow[] {
	const { totalFat = 0, isEn = true, includeMissing = true, withShort = false } = opts;

	const read = (key: string): number | null => {
		const v = values?.[key];
		return typeof v === 'number' && !Number.isNaN(v) ? v : null;
	};
	const label = (key: string) => {
		const meta = FATTY_ACID_META[key];
		if (!meta) return key;
		const base = isEn ? meta.label : meta.labelDe;
		return withShort && meta.short ? `${base} (${meta.short})` : base;
	};

	// Bars at the top level are scaled against each other; a child fills its bar
	// relative to the family it belongs to, so the shape of that family is legible
	// even when the whole group is a rounding error next to the monounsaturates.
	const topValues = FAT_COMPOSITION_GROUPS.map((g) => read(g.key) ?? 0);
	const topMax = Math.max(0, ...topValues);

	const rows: FatCompositionRow[] = [];
	FAT_COMPOSITION_GROUPS.forEach((group, i) => {
		const raw = read(group.key);
		if (raw === null && !includeMissing) {
			// The parent is absent, but a source that published only individual acids
			// still has a family to show — the caller's own totals decide.
			if (!group.children.some((c) => read(c) !== null)) return;
		}
		const value = topValues[i];
		rows.push({
			key: group.key,
			label: label(group.key),
			unit: 'g',
			value,
			pct: totalFat > 0 ? Math.round((value / totalFat) * 100) : null,
			bar: topMax > 0 ? (value / topMax) * 100 : 0,
			child: false,
			header: group.children.length > 0,
		});

		for (const childKey of group.children) {
			const childRaw = read(childKey);
			if (childRaw === null && !includeMissing) continue;
			const childValue = childRaw ?? 0;
			rows.push({
				key: childKey,
				label: label(childKey),
				unit: 'g',
				value: childValue,
				pct: value > 0 ? Math.round((childValue / value) * 100) : null,
				bar: value > 0 ? Math.min(100, (childValue / value) * 100) : 0,
				child: true,
				header: false,
			});
		}
	});

	return rows;
}

/** The note that explains the two different percentages, in both languages. */
export function fatCompositionNote(isEn: boolean): string {
	return isEn
		? 'No intake requirement. Omega-3 and omega-6 are the sum of the acids indented under them, taken from a source’s own total only where it reports no individual acids. A top-level row’s % is its share of the fat eaten; an indented acid’s % is its share of its own family.'
		: 'Kein Bedarfswert. Omega-3 und Omega-6 sind die Summe der darunter eingerückten Fettsäuren; der Sammelwert einer Quelle zählt nur, wenn sie keine Einzelfettsäuren ausweist. Bei den obersten Zeilen ist % der Anteil am gegessenen Fett, bei den eingerückten der Anteil an der eigenen Familie.';
}

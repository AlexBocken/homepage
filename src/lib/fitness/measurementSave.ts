/**
 * Saving a check-in measurement from the browser.
 *
 * The API merges a new measurement into an existing one for the same day, and
 * answers 409 with the fields that would change when both have a different
 * value. The user is then asked, and the same body is posted again with
 * `?overwrite=1` if they agree.
 */
import { confirm } from '$lib/js/confirmDialog.svelte';
import { BODY_PART_CARDS } from '$lib/js/fitnessBodyParts';
import type { FitnessKey } from '$lib/js/fitnessI18n';

type Messages = Record<FitnessKey, string>;
export type MeasurementConflict = { key: string; oldVal: unknown; newVal: unknown };

/** A paired body part's stored side (leftBicep, rightCalf …) → its label key. */
const SIDE_LABEL_KEYS: Record<string, FitnessKey> = Object.fromEntries(
	BODY_PART_CARDS.flatMap((c) =>
		c.paired ? [[c.dbLeft, c.labelLeft], [c.dbRight, c.labelRight]] : []
	)
);

/** The conflicts as the overwrite dialog lists them: `Weight (80 kg → 81 kg), …`. */
export function formatMeasurementConflicts(conflicts: MeasurementConflict[], t: Messages): string {
	return conflicts
		.map((c) => {
			let label = c.key;
			let unit = '';
			if (c.key === 'weight') { label = t.weight; unit = ' kg'; }
			else if (c.key === 'bodyFatPercent') { label = t.body_fat_label; unit = ' %'; }
			else if (c.key === 'caloricIntake') { label = t.calories; unit = ' kcal'; }
			else if (c.key === 'notes') { label = t.notes; }
			else if (c.key.startsWith('measurements.')) {
				const part = c.key.slice('measurements.'.length);
				label = t[SIDE_LABEL_KEYS[part] ?? (part as FitnessKey)];
				unit = ' cm';
			}
			return `${label} (${c.oldVal}${unit} → ${c.newVal}${unit})`;
		})
		.join(', ');
}

/**
 * POST a measurement; on a 409 ask whether to overwrite the conflicting values
 * and, if so, post it again with `?overwrite=1`.
 *
 * @returns the final response, or `null` when the user declined to overwrite.
 */
export async function postMeasurementWithOverwrite(body: unknown, t: Messages): Promise<Response | null> {
	const doPost = (overwrite: boolean) =>
		fetch(`/api/fitness/measurements${overwrite ? '?overwrite=1' : ''}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	let res = await doPost(false);
	if (res.status === 409) {
		const { conflicts } = await res.json();
		const ok = await confirm(t.overwrite_message.replace('{fields}', formatMeasurementConflicts(conflicts, t)), {
			title: t.overwrite_title,
			confirmText: t.overwrite_confirm,
			cancelText: t.action_cancel,
			destructive: true
		});
		if (!ok) return null;
		res = await doPost(true);
	}
	return res;
}

/**
 * Writing back the global ingredient overwrites a mapper posted.
 *
 * `NutritionMapper` posts three hidden fields — the mappings, the overwrites
 * whose switch is on, and the ones switched *off* since the page loaded — and any
 * page that hosts the mapper has to apply all three the same way. The recipe
 * editor and the review queue both do, which is why this lives here rather than
 * inline in one of them.
 *
 * Removals run before the upserts: a switch flipped off while an ingredient of
 * the same name is mapped afresh in one save must end up mapped, not deleted.
 */
import { NutritionOverwrite } from '$models/NutritionOverwrite';
import { invalidateOverwriteCache } from '$lib/server/nutritionMatcher';

/**
 * Apply both halves of the switch. Failures are logged rather than thrown: the
 * mappings themselves are the work being saved, and losing a global convenience
 * setting must not cost the user the recipe they just reviewed.
 */
export async function syncGlobalOverwrites(formData: FormData): Promise<void> {
	let touched = false;

	const removedJson = formData.get('globalOverwritesRemoved_json')?.toString();
	if (removedJson) {
		try {
			const removed: string[] = JSON.parse(removedJson);
			const names = removed
				.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
				.map((n) => n.toLowerCase().trim());
			if (names.length > 0) {
				await NutritionOverwrite.deleteMany({ ingredientNameDe: { $in: names } });
				touched = true;
			}
		} catch (e) {
			console.error('Failed to remove global overwrites:', e);
		}
	}

	const overwritesJson = formData.get('globalOverwrites_json')?.toString();
	if (overwritesJson) {
		try {
			const overwrites = JSON.parse(overwritesJson);
			for (const ow of overwrites) {
				if (!ow?.ingredientNameDe) continue;
				await NutritionOverwrite.findOneAndUpdate(
					{ ingredientNameDe: ow.ingredientNameDe },
					ow,
					{ upsert: true, runValidators: true },
				);
				touched = true;
			}
		} catch (e) {
			console.error('Failed to save global overwrites:', e);
		}
	}

	if (touched) invalidateOverwriteCache();
}

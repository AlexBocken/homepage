<script>
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import X from '@lucide/svelte/icons/x';
	import { toast } from '$lib/js/toast.svelte';
	import { m } from '$lib/js/recipesI18n';
	import { TRACE_MINERAL_KEYS } from '$lib/fitness/traceMinerals';
	import { SPARSELY_MEASURED_KEYS } from '$lib/fitness/nutritionMath';
	import { ingredientGrams } from '$lib/js/ingredientAmount';
	import { resolveFinalWeight } from '$lib/js/finalWeight';
	/** @typedef {import('$lib/js/recipesI18n').RecipesLang} RecipesLang */

	// Blended over the ingredients that report them rather than over the whole pot,
	// the same rule the trace minerals follow — an untested ingredient must not
	// dilute the ones that were. Biotin and caffeine are on the vitamin and 'other'
	// panels, so a recipe that dropped them logged an entry reading zero where the
	// same food logged directly reads a figure. Sugar alcohols and organic acids are
	// excluded here: they are summed with the macros above, and running them through
	// both passes would count them twice.
	const MEASURED_WHERE_PRESENT = [
		...TRACE_MINERAL_KEYS,
		...SPARSELY_MEASURED_KEYS.filter(k => k !== 'sugarAlcohols' && k !== 'organicAcids'),
	];

	let {
		recipeName,
		recipeId = '',
		nutritionMappings = [],
		referencedNutrition = [],
		ingredients = [],
		portions = '',
		finalWeight = undefined,
		isEnglish = true,
	} = $props();
	const lang = $derived(/** @type {RecipesLang} */ (isEnglish ? 'en' : 'de'));
	const t = $derived(m[lang]);

	// Flatten ingredient sections into a flat array with indices
	const flatIngredients = $derived.by(() => {
		const flat = [];
		for (let si = 0; si < ingredients.length; si++) {
			const section = ingredients[si];
			const items = section?.list ?? section?.ingredients ?? section?.items ?? [];
			for (let ii = 0; ii < items.length; ii++) {
				const ing = items[ii];
				flat.push({ name: ing.name, unit: ing.unit, amount: ing.amount, sectionIndex: si, ingredientIndex: ii });
			}
		}
		return flat;
	});

	let showDialog = $state(false);
	let portionAmount = $state('1');
	let mealType = $state('lunch');
	let saving = $state(false);
	let customGrams = $state('');
	let useGrams = $state(false);

	const labels = $derived({
		addToLog: t.add_to_food_log,
		portions: t.portions_label,
		grams: t.grams_label,
		meal: t.meal_label,
		breakfast: t.breakfast,
		lunch: t.lunch,
		dinner: t.dinner,
		snack: t.snack,
		log: t.log_action,
		cancel: t.cancel
	});

	// Parse portion count from recipe's portions string (e.g. "4 Portionen")
	const basePortionCount = $derived.by(() => {
		if (!portions) return 0;
		const match = portions.match(/^(\d+(?:[.,]\d+)?)/);
		return match ? parseFloat(match[1].replace(',', '.')) : 0;
	});

	// Compute total recipe nutrition (all ingredients at multiplier=1)
	const recipeTotals = $derived.by(() => {
		/** @type {Record<string, number>} */
		const result = {};
		const nutrientKeys = [
			'calories', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber', 'sugars',
			'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium', 'zinc',
			'vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK',
			'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'vitaminB12', 'folate', 'cholesterol',
			'pantothenicAcid', 'retinol',
			// An ingredient without the key contains none, so summing a zero is honest
			// here — cooking wine in a recipe still has to reach the day's total. The
			// same goes for the two non-macro energy sources.
			'alcohol', 'sugarAlcohols', 'organicAcids',
			'isoleucine', 'leucine', 'lysine', 'methionine', 'phenylalanine',
			'threonine', 'tryptophan', 'valine', 'histidine', 'alanine',
			'arginine', 'asparticAcid', 'cysteine', 'glutamicAcid', 'glycine',
			'proline', 'serine', 'tyrosine',
		];
		for (const k of nutrientKeys) result[k] = 0;

		/** Trace mineral intake, and the grams of ingredient it was measured across. */
		/** @type {Record<string, number>} */
		const traceTotalsG = {};
		/** @type {Record<string, number>} */
		const traceGrams = {};

		let totalWeightGrams = 0;

		// Build mapping index
		const mappingIndex = new Map();
		for (const m of nutritionMappings) {
			mappingIndex.set(`${m.sectionIndex}-${m.ingredientIndex}`, m);
		}

		for (const ing of flatIngredients) {
			const mapping = mappingIndex.get(`${ing.sectionIndex}-${ing.ingredientIndex}`);
			if (!mapping || mapping.matchMethod === 'none' || mapping.excluded || !mapping.per100g) continue;

			const grams = ingredientGrams(mapping, ing.amount);
			if (!grams) continue;
			totalWeightGrams += grams;
			const factor = grams / 100;

			for (const k of nutrientKeys) {
				result[k] += factor * (mapping.per100g[k] ?? 0);
			}
			// Trace minerals only from the ingredients that report them, tracking the
			// weight each was measured across so the per-100 g figure below is a
			// concentration of what was measured rather than of the whole pot. A
			// referenced sub-recipe contributes none: its stored aggregate carries no
			// record of which of its own ingredients were tested.
			for (const k of MEASURED_WHERE_PRESENT) {
				const v = mapping.per100g[k];
				if (typeof v === 'number') {
					traceTotalsG[k] = (traceTotalsG[k] ?? 0) + factor * v;
					traceGrams[k] = (traceGrams[k] ?? 0) + grams;
				}
			}
		}

		// Add referenced recipe nutrition — its weight as well as its nutrients.
		// Counting only the nutrients divided a base recipe's calories by the
		// parent's grams alone, so logging a pizza overstated every figure by
		// however much of it was dough.
		for (const ref of referencedNutrition) {
			const refMult = ref.baseMultiplier ?? 1;
			totalWeightGrams += (ref.totalGrams ?? 0) * refMult;
			for (const k of nutrientKeys) {
				result[k] += (ref.nutrition?.[k] ?? 0) * refMult;
			}
		}

		return { totals: result, totalWeightGrams, traceTotalsG, traceGrams };
	});

	// What the dish weighs once it is cooked, which is what a portion is a quarter
	// of and what "100 g of this" means. The server divides by the same figure when
	// it decomposes the log, so a recipe with a baking loss set by hand had to have
	// it here too or the two disagreed by exactly that loss.
	const finishedWeightGrams = $derived(resolveFinalWeight(recipeTotals.totalWeightGrams, finalWeight));

	// Per-100g for the entire recipe
	const per100g = $derived.by(() => {
		const w = finishedWeightGrams;
		if (w <= 0) return recipeTotals.totals;
		/** @type {Record<string, number>} */
		const result = {};
		for (const [k, v] of Object.entries(recipeTotals.totals)) {
			result[k] = v / w * 100;
		}
		// Scaled by the weight each was measured across, and written only when
		// something reported it.
		for (const k of MEASURED_WHERE_PRESENT) {
			const g = recipeTotals.traceGrams[k] ?? 0;
			if (g > 0) result[k] = (recipeTotals.traceTotalsG[k] ?? 0) * (100 / g);
		}
		return result;
	});

	// Grams for the selected portion
	const portionGrams = $derived.by(() => {
		if (useGrams) return Number(customGrams) || 0;
		const numPortions = Number(portionAmount) || 0;
		if (basePortionCount <= 0 || numPortions <= 0) return 0;
		return (finishedWeightGrams / basePortionCount) * numPortions;
	});

	// Preview calories
	const previewCal = $derived(portionGrams > 0 ? (per100g.calories ?? 0) * portionGrams / 100 : 0);

	function openDialog() {
		portionAmount = '1';
		mealType = 'lunch';
		customGrams = '';
		useGrams = false;
		showDialog = true;
	}

	async function submit() {
		const grams = portionGrams;
		if (grams <= 0) return;

		saving = true;
		try {
			const today = new Date().toISOString().slice(0, 10);
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: today,
					mealType,
					name: recipeName,
					source: 'recipe',
					sourceId: recipeId,
					amountGrams: Math.round(grams),
					per100g,
				})
			});
			if (res.ok) {
				toast.success(t.added_to_food_log);
				showDialog = false;
			} else {
				toast.error(t.add_failed);
			}
		} catch {
			toast.error(t.add_failed);
		} finally {
			saving = false;
		}
	}
</script>

<button class="add-to-log-btn" onclick={openDialog} title={labels.addToLog}>
	<UtensilsCrossed size={14} />
	<span>{labels.addToLog}</span>
</button>

{#if showDialog}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog-overlay" onclick={() => showDialog = false} onkeydown={(e) => e.key === 'Escape' && (showDialog = false)}>
		<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
		<div class="dialog" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="dialog-header">
				<h3>{labels.addToLog}</h3>
				<button class="close-btn" onclick={() => showDialog = false}><X size={18} /></button>
			</div>

			<div class="dialog-body">
				<div class="field">
					<label for="log-meal">{labels.meal}</label>
					<select id="log-meal" bind:value={mealType}>
						<option value="breakfast">{labels.breakfast}</option>
						<option value="lunch">{labels.lunch}</option>
						<option value="dinner">{labels.dinner}</option>
						<option value="snack">{labels.snack}</option>
					</select>
				</div>

				<div class="amount-toggle">
					<button class:active={!useGrams} onclick={() => useGrams = false}>{labels.portions}</button>
					<button class:active={useGrams} onclick={() => useGrams = true}>{labels.grams}</button>
				</div>

				{#if useGrams}
					<div class="field">
						<label for="log-grams">{labels.grams}</label>
						<input id="log-grams" type="number" bind:value={customGrams} min="1" />
					</div>
				{:else}
					<div class="field">
						<label for="log-portions">{labels.portions}</label>
						<input id="log-portions" type="number" bind:value={portionAmount} min="0.25" step="0.25" />
						{#if basePortionCount > 0}
							<span class="portion-hint">{Math.round(portionGrams)}g</span>
						{/if}
					</div>
				{/if}

				{#if previewCal > 0}
					<div class="preview">
						{Math.round(previewCal)} kcal
					</div>
				{/if}
			</div>

			<div class="dialog-actions">
				<button class="btn-cancel" onclick={() => showDialog = false}>{labels.cancel}</button>
				<button class="btn-primary" onclick={submit} disabled={saving || portionGrams <= 0}>
					{saving ? '…' : labels.log}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.add-to-log-btn {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-primary, var(--nord10));
		padding: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.85rem;
		text-decoration: underline;
		text-decoration-style: dotted;
	}
	.add-to-log-btn:hover {
		color: var(--nord15);
	}

	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	.dialog {
		background: var(--color-surface);
		border-radius: 0.75rem;
		width: 90%;
		max-width: 360px;
		overflow: hidden;
	}
	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.dialog-header h3 {
		margin: 0;
		font-size: 1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}

	.dialog-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.field label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.field input,
	.field select {
		padding: 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}

	.amount-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		overflow: hidden;
	}
	.amount-toggle button {
		flex: 1;
		padding: 0.4rem;
		background: var(--color-bg-tertiary);
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
	}
	.amount-toggle button.active {
		background: var(--nord8);
		color: white;
	}

	.portion-hint {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.preview {
		text-align: center;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.dialog-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--color-border);
	}
	.btn-primary {
		padding: 0.45rem 1rem;
		background: var(--nord8);
		color: white;
		border: none;
		border-radius: 0.4rem;
		cursor: pointer;
		font-weight: 600;
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-cancel {
		padding: 0.45rem 1rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: 0.4rem;
		cursor: pointer;
		color: var(--color-text-primary);
	}
</style>

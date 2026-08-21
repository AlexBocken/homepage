<script>
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import { toast } from '$lib/js/toast.svelte';
	import { m } from '$lib/js/recipesI18n';
	import MealTypePicker from '$lib/components/fitness/MealTypePicker.svelte';
	import PortionAmountInput from '$lib/components/fitness/PortionAmountInput.svelte';
	import { defaultMealType } from '$lib/fitness/meals';
	import { localDateStr } from '$lib/js/localDate';
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
	/** @type {'breakfast' | 'lunch' | 'dinner' | 'snack'} */
	let mealType = $state('lunch');
	let saving = $state(false);
	/** Canonical amount. The portion basis below is only how it is entered. */
	let logGrams = $state(0);
	/** @type {{ description: string, grams: number } | undefined} */
	let logPortion = $state(undefined);
	/** @type {HTMLDivElement | undefined} */
	let dialogEl = $state(undefined);

	const labels = $derived({
		addToLog: t.add_to_food_log,
		meal: t.meal_label,
		amount: t.amount_label,
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

	/**
	 * How the amount can be entered: one portion as the recipe states it, or the whole
	 * batch. Plain grams is always offered by the input itself, so a dish that names
	 * no yield still logs — it just has nothing better to count in.
	 */
	const portionOptions = $derived.by(() => {
		/** @type {{ description: string, grams: number }[]} */
		const out = [];
		if (finishedWeightGrams > 0 && basePortionCount > 0) {
			out.push({ description: t.portion_basis, grams: finishedWeightGrams / basePortionCount });
		}
		if (finishedWeightGrams > 0) {
			out.push({ description: t.whole_recipe, grams: finishedWeightGrams });
		}
		return out;
	});

	/** What the chosen amount adds to the day, in the diary's own terms. */
	const preview = $derived.by(() => {
		const f = logGrams / 100;
		return {
			calories: Math.round((per100g.calories ?? 0) * f),
			protein: Math.round((per100g.protein ?? 0) * f),
			fat: Math.round((per100g.fat ?? 0) * f),
			carbs: Math.round((per100g.carbs ?? 0) * f),
		};
	});

	function openDialog() {
		mealType = defaultMealType();
		// Open on one portion, which is what someone about to eat this is logging.
		const basis = portionOptions[0];
		logPortion = basis;
		logGrams = basis ? Math.round(basis.grams) : 100;
		showDialog = true;
	}

	function closeDialog() {
		showDialog = false;
	}

	/** @param {KeyboardEvent} e */
	function onWindowKeydown(e) {
		if (showDialog && e.key === 'Escape') closeDialog();
	}

	// Focus lands inside the dialog on open, so the keyboard and a screen reader both
	// follow the thing that just appeared instead of staying on the page behind it.
	$effect(() => {
		if (showDialog) dialogEl?.focus();
	});

	async function submit() {
		if (saving || !(logGrams > 0)) return;
		saving = true;
		try {
			const res = await fetch('/api/fitness/food-log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					date: localDateStr(),
					mealType,
					name: recipeName,
					source: 'recipe',
					sourceId: recipeId,
					amountGrams: Math.round(logGrams),
					portions: portionOptions,
					selectedPortion: logPortion,
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

<svelte:window onkeydown={onWindowKeydown} />

<button class="add-to-log-btn" onclick={openDialog} title={labels.addToLog}>
	<UtensilsCrossed size={14} />
	<span>{labels.addToLog}</span>
</button>

{#if showDialog}
	<div class="dialog-overlay">
		<!-- The backdrop is a real button rather than a div with a click handler, so
		     dismissing by tapping outside works from the keyboard too. -->
		<button type="button" class="dialog-scrim" aria-label={labels.cancel} onclick={closeDialog}></button>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-label={labels.addToLog}
			tabindex="-1"
			bind:this={dialogEl}
		>
			<div class="dialog-header">
				<div class="dialog-title">
					<h3>{labels.addToLog}</h3>
					<p class="dialog-sub">{recipeName}</p>
				</div>
				<button class="close-btn" onclick={closeDialog} aria-label={labels.cancel}><X size={18} /></button>
			</div>

			<div class="dialog-body">
				<div class="field">
					<span class="field-label">{labels.meal}</span>
					<MealTypePicker
						value={mealType}
						lang={isEnglish ? 'en' : 'de'}
						showLabels
						onchange={(meal) => (mealType = meal)}
					/>
				</div>

				<div class="field">
					<span class="field-label">{labels.amount}</span>
					<PortionAmountInput
						bind:grams={logGrams}
						bind:selectedPortion={logPortion}
						portions={portionOptions}
						onenter={submit}
					/>
				</div>

				{#if logGrams > 0}
					<div class="preview">
						<span class="preview-cal">{preview.calories}<span class="preview-unit">kcal</span></span>
						<span class="preview-macros">
							<span class="macro" style="--m: var(--green)">{preview.protein} g {t.protein}</span>
							<span class="macro" style="--m: var(--orange)">{preview.fat} g {t.fat}</span>
							<span class="macro" style="--m: var(--lightblue)">{preview.carbs} g {t.carbs}</span>
						</span>
					</div>
				{/if}
			</div>

			<div class="dialog-actions">
				<button class="btn-cancel" onclick={closeDialog}>{labels.cancel}</button>
				<button class="btn-primary" onclick={submit} disabled={saving || !(logGrams > 0)}>
					<Plus size={16} />
					{saving ? '…' : labels.log}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* An offer, not a call to action: an outlined pill in the primary colour, which
	   reads as a button without competing with the recipe it sits in. It fills in on
	   hover, arriving at the colour the dialog's own confirm button already uses. */
	.add-to-log-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
	}
	.add-to-log-btn:hover {
		color: var(--color-primary);
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 8%, transparent);
	}
	.add-to-log-btn:active {
		background: color-mix(in srgb, var(--color-primary) 14%, transparent);
	}

	.dialog-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
	}
	.dialog-scrim {
		position: absolute;
		inset: 0;
		border: none;
		padding: 0;
		background: transparent;
		cursor: default;
	}
	.dialog {
		position: relative;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		width: 100%;
		max-width: 360px;
		overflow: hidden;
	}
	.dialog:focus {
		outline: none;
	}

	.dialog-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.85rem 1rem 0.7rem;
		border-bottom: 1px solid var(--color-border);
	}
	.dialog-title {
		min-width: 0;
	}
	.dialog-header h3 {
		margin: 0;
		font-size: var(--text-base);
		color: var(--color-text-primary);
	}
	/* Which dish is being logged, so the dialog stands on its own once it covers the
	   recipe it was opened from. */
	.dialog-sub {
		margin: 0.1rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.close-btn {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		border-radius: var(--radius-sm);
	}
	.close-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.dialog-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.field-label {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	/* What this does to the day, before committing to it. The three macro colours are
	   the ones the diary uses for the same three figures. */
	.preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 0.6rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
	}
	.preview-cal {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	.preview-unit {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}
	.preview-macros {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.15rem 0.6rem;
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.macro {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.macro::before {
		content: '';
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 50%;
		background: var(--m);
	}

	.dialog-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--color-border);
	}
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 1rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		font-weight: 600;
		transition: background var(--transition-fast);
	}
	.btn-primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-cancel {
		padding: 0.45rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: background var(--transition-fast);
	}
	.btn-cancel:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
</style>

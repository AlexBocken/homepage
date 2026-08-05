<script>
	import { createNutritionCalculator } from '$lib/js/nutrition.svelte';
	import RingGraph from '$lib/components/fitness/RingGraph.svelte';
	import { NUTRIENT_META } from '$lib/data/dailyReferenceIntake';
	import { MINERAL_ORDER, VITAMIN_ORDER } from '$lib/fitness/nutrientOrder';
	import { m } from '$lib/js/recipesI18n';
	/** @typedef {import('$lib/js/recipesI18n').RecipesLang} RecipesLang */

	let { flatIngredients, nutritionMappings, sectionNames, referencedNutrition, multiplier, portions, isEnglish, actions } = $props();
	const lang = $derived(/** @type {RecipesLang} */ (isEnglish ? 'en' : 'de'));
	const t = $derived(m[lang]);

	const nutrition = createNutritionCalculator(
		() => flatIngredients,
		() => nutritionMappings || [],
		() => multiplier,
		() => sectionNames || new Set(),
		() => referencedNutrition || [],
	);

	let showDetails = $state(false);

	const portionCount = $derived.by(() => {
		if (!portions) return 0;
		const match = portions.match(/^(\d+(?:[.,]\d+)?)/);
		return match ? parseFloat(match[1].replace(',', '.')) : 0;
	});

	const adjustedPortionCount = $derived(portionCount > 0 ? portionCount * multiplier : 0);

	// Divisor for per-portion values (1 if no portions → show total)
	const div = $derived(adjustedPortionCount > 0 ? adjustedPortionCount : 1);

	const perPortionCalories = $derived(adjustedPortionCount > 0 ? nutrition.totalMacros.calories / adjustedPortionCount : 0);

	// Macro percentages by calories: protein=4kcal/g, fat=9kcal/g, carbs=4kcal/g
	const macroPercent = $derived.by(() => {
		const m = nutrition.totalMacros;
		const proteinCal = m.protein * 4;
		const fatCal = m.fat * 9;
		const carbsCal = m.carbs * 4;
		const total = proteinCal + fatCal + carbsCal;
		if (total === 0) return { protein: 0, fat: 0, carbs: 0 };
		return {
			protein: Math.round(proteinCal / total * 100),
			fat: Math.round(fatCal / total * 100),
			carbs: 100 - Math.round(proteinCal / total * 100) - Math.round(fatCal / total * 100),
		};
	});

	const labels = $derived({
		title: t.nutrition,
		perPortion: t.per_portion,
		protein: t.protein,
		fat: t.fat,
		carbs: t.carbs,
		fiber: t.fiber,
		sugars: t.sugars,
		saturatedFat: t.saturated_fat,
		cholesterol: isEnglish ? NUTRIENT_META.cholesterol.label : NUTRIENT_META.cholesterol.labelDe,
		details: t.details,
		vitamins: t.vitamins,
		minerals: t.minerals,
		coverage: t.coverage,
		unmapped: t.not_tracked,
		aminoAcids: t.amino_acids
	});

	const hasAminoAcids = $derived.by(() => {
		const aa = nutrition.totalAminoAcids;
		return aa.leucine > 0 || aa.lysine > 0 || aa.isoleucine > 0;
	});

	/** @param {number} value */
	function fmt(value) {
		if (value >= 100) return Math.round(value).toString();
		if (value >= 10) return value.toFixed(1);
		return value.toFixed(1);
	}

	// Labels, units and order come from the same place the fitness pages take them,
	// so a recipe's vitamin list reads identically to the one on the food it maps to.
	// The recipe calculator sums a narrower set of nutrients than a food record
	// carries — retinol, pantothenic acid and biotin have no total here — so the
	// shared order is filtered rather than reordered.
	/** @param {string[]} keys */
	function mkRows(keys) {
		const totals = /** @type {Record<string, number>} */ (
			/** @type {unknown} */ (nutrition.totalMicros)
		);
		return keys
			.filter((k) => typeof totals[k] === 'number')
			.map((k) => {
				const meta = NUTRIENT_META[/** @type {keyof typeof NUTRIENT_META} */ (k)];
				return {
					key: k,
					label: isEnglish ? meta.label : meta.labelDe,
					unit: meta.unit,
					value: totals[k] / div,
				};
			});
	}

	const mineralRows = $derived(mkRows(MINERAL_ORDER));
	const vitaminRows = $derived(mkRows(VITAMIN_ORDER));


</script>

<style>
	.nutrition-summary {
		margin-top: 1.5rem;
	}
	.portion-cal {
		text-align: center;
		font-size: 0.9rem;
		color: var(--color-text-secondary, #666);
		margin: 0.25rem 0;
	}

	.macro-rings {
		display: flex;
		justify-content: space-around;
		margin: 0.5rem 0;
	}
	.macro-rings :global(.ring-svg) {
		width: 90px;
		height: 90px;
	}
	.macro-rings :global(.ring-label) {
		font-size: 0.85rem;
	}

	.details-toggle-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.details-toggle {
		font-size: 0.85rem;
		cursor: pointer;
		color: var(--color-primary);
		background: none;
		border: none;
		padding: 0;
		text-decoration: underline;
		text-decoration-style: dotted;
	}

	.details-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem 1.5rem;
		margin-top: 0.75rem;
		font-size: 0.85rem;
	}
	.detail-section h4 {
		margin: 0 0 0.35rem;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}
	.detail-row {
		display: flex;
		justify-content: space-between;
		padding: 0.15rem 0;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
	}
	.detail-row:last-child {
		border-bottom: none;
	}

	.coverage-warning {
		margin-top: 0.5rem;
		font-size: 0.8rem;
		color: var(--nord13, #ebcb8b);
	}

	@media (max-width: 500px) {
		.details-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

{#if nutritionMappings && nutritionMappings.length > 0}
<div class="nutrition-summary">
	<div class="macro-rings">
		{#each [
			{ pct: macroPercent.protein, label: labels.protein, color: 'var(--nord14)' },
			{ pct: macroPercent.fat, label: labels.fat, color: 'var(--nord12)' },
			{ pct: macroPercent.carbs, label: labels.carbs, color: 'var(--nord9)' },
		] as macro (macro.color)}
			<RingGraph
				percent={macro.pct}
				color={macro.color}
				label={macro.label}
			/>
		{/each}
	</div>

	{#if adjustedPortionCount > 0}
		<p class="portion-cal">{fmt(perPortionCalories)} kcal {labels.perPortion}</p>
	{/if}

	{#if showDetails}
		<div class="details-grid">
			<div class="detail-section">
				<h4>{labels.title} {adjustedPortionCount > 0 ? `(${labels.perPortion})` : ''}</h4>
				<div class="detail-row"><span>{labels.protein}</span><span>{fmt(nutrition.totalMacros.protein / div)}g</span></div>
				<div class="detail-row"><span>{labels.fat}</span><span>{fmt(nutrition.totalMacros.fat / div)}g</span></div>
				<div class="detail-row"><span>&nbsp;&nbsp;{labels.saturatedFat}</span><span>{fmt(nutrition.totalMacros.saturatedFat / div)}g</span></div>
				<div class="detail-row"><span>{labels.carbs}</span><span>{fmt(nutrition.totalMacros.carbs / div)}g</span></div>
				<div class="detail-row"><span>&nbsp;&nbsp;{labels.sugars}</span><span>{fmt(nutrition.totalMacros.sugars / div)}g</span></div>
				<div class="detail-row"><span>{labels.fiber}</span><span>{fmt(nutrition.totalMacros.fiber / div)}g</span></div>
				<div class="detail-row"><span>{labels.cholesterol}</span><span>{fmt(nutrition.totalMicros.cholesterol / div)} mg</span></div>
			</div>
			<div class="detail-section">
				<h4>{labels.vitamins}</h4>
				{#each vitaminRows as row (row.key)}
					<div class="detail-row"><span>{row.label}</span><span>{fmt(row.value)} {row.unit}</span></div>
				{/each}
			</div>
			<div class="detail-section">
				<h4>{labels.minerals}</h4>
				{#each mineralRows as row (row.key)}
					<div class="detail-row"><span>{row.label}</span><span>{fmt(row.value)} {row.unit}</span></div>
				{/each}
			</div>
			{#if hasAminoAcids}
			<div class="detail-section">
				<h4>{labels.aminoAcids}</h4>
				<div class="detail-row"><span>{t.leucine}</span><span>{fmt(nutrition.totalAminoAcids.leucine / div)} g</span></div>
				<div class="detail-row"><span>{t.isoleucine}</span><span>{fmt(nutrition.totalAminoAcids.isoleucine / div)} g</span></div>
				<div class="detail-row"><span>{t.valine}</span><span>{fmt(nutrition.totalAminoAcids.valine / div)} g</span></div>
				<div class="detail-row"><span>{t.lysine}</span><span>{fmt(nutrition.totalAminoAcids.lysine / div)} g</span></div>
				<div class="detail-row"><span>{t.methionine}</span><span>{fmt(nutrition.totalAminoAcids.methionine / div)} g</span></div>
				<div class="detail-row"><span>{t.phenylalanine}</span><span>{fmt(nutrition.totalAminoAcids.phenylalanine / div)} g</span></div>
				<div class="detail-row"><span>{t.threonine}</span><span>{fmt(nutrition.totalAminoAcids.threonine / div)} g</span></div>
				<div class="detail-row"><span>Tryptophan</span><span>{fmt(nutrition.totalAminoAcids.tryptophan / div)} g</span></div>
				<div class="detail-row"><span>{t.histidine}</span><span>{fmt(nutrition.totalAminoAcids.histidine / div)} g</span></div>
				<div class="detail-row"><span>{t.arginine}</span><span>{fmt(nutrition.totalAminoAcids.arginine / div)} g</span></div>
				<div class="detail-row"><span>{t.alanine}</span><span>{fmt(nutrition.totalAminoAcids.alanine / div)} g</span></div>
				<div class="detail-row"><span>{t.aspartic_acid}</span><span>{fmt(nutrition.totalAminoAcids.asparticAcid / div)} g</span></div>
				<div class="detail-row"><span>{t.cysteine}</span><span>{fmt(nutrition.totalAminoAcids.cysteine / div)} g</span></div>
				<div class="detail-row"><span>{t.glutamic_acid}</span><span>{fmt(nutrition.totalAminoAcids.glutamicAcid / div)} g</span></div>
				<div class="detail-row"><span>{t.glycine}</span><span>{fmt(nutrition.totalAminoAcids.glycine / div)} g</span></div>
				<div class="detail-row"><span>{t.proline}</span><span>{fmt(nutrition.totalAminoAcids.proline / div)} g</span></div>
				<div class="detail-row"><span>{t.serine}</span><span>{fmt(nutrition.totalAminoAcids.serine / div)} g</span></div>
				<div class="detail-row"><span>{t.tyrosine}</span><span>{fmt(nutrition.totalAminoAcids.tyrosine / div)} g</span></div>
			</div>
			{/if}
		</div>
	{/if}

	{#if nutrition.coverage < 1}
		<div class="coverage-warning">
			{Math.round(nutrition.coverage * 100)}% {labels.coverage}
			{#if nutrition.unmapped.length > 0}
				— {labels.unmapped}: {nutrition.unmapped.join(', ')}
			{/if}
		</div>
	{/if}

	<div class="details-toggle-row">
		<button class="details-toggle" onclick={() => showDetails = !showDetails}>
			{showDetails ? '−' : '+'} {labels.details}
		</button>
		{#if actions}
			{@render actions()}
		{/if}
	</div>
</div>
{/if}

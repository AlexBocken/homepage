<script>
	import { createNutritionCalculator } from '$lib/js/nutrition.svelte';
	import RingGraph from '$lib/components/fitness/RingGraph.svelte';
	import NutrientRow from '$lib/components/fitness/NutrientRow.svelte';
	import DriSourceInfo from '$lib/components/fitness/DriSourceInfo.svelte';
	import { NUTRIENT_META, getDRI, REFERENCE_ENERGY } from '$lib/data/dailyReferenceIntake';
	import { nutrientRows } from '$lib/fitness/nutrientRows';
	import { MINERAL_ORDER, VITAMIN_ORDER } from '$lib/fitness/nutrientOrder';
	import { m } from '$lib/js/recipesI18n';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
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

	// The disclosure itself is a checkbox and works with no JavaScript at all (see the
	// styles below). This mirrors its state only so the goal fetch has something to
	// react to; nothing about opening or closing the panel depends on it.
	let showDetails = $state(false);
	const detailsId = $props.id();

	/**
	 * Whose day the percentages are measured against.
	 *
	 * A bare "0.9 mg of B6" says nothing without knowing what a day asks for, which is
	 * the question the diary already answers with a bar. Read against the same
	 * reference intakes here, so one portion of a recipe can be compared with what is
	 * already on today's plate without doing arithmetic in your head.
	 *
	 * The person's own calorie goal is used when there is one — the fat references are
	 * shares of energy and move with it — and fetched only once the details are opened,
	 * so a recipe page costs nothing extra to visit. Anyone not logged in is measured
	 * against the reference day, which is what the figure on a package means.
	 * @type {{ sex: 'male' | 'female', calories: number | null } | null}
	 */
	let goal = $state(/** @type {{ sex: 'male' | 'female', calories: number | null } | null} */ (null));
	let goalRequested = false;

	$effect(() => {
		if (!showDetails || goalRequested) return;
		goalRequested = true;
		fetch('/api/fitness/goal')
			.then((r) => (r.ok ? r.json() : null))
			.then((g) => {
				if (g) goal = { sex: g.sex === 'female' ? 'female' : 'male', calories: g.dailyCalories ?? null };
			})
			.catch(() => {});
	});

	const driSex = $derived(/** @type {'male' | 'female'} */ (goal?.sex ?? 'male'));
	const driEnergy = $derived(goal?.calories ?? null);
	const dri = $derived(getDRI(driSex, driEnergy));
	const referenceLabel = $derived(
		driEnergy
			? t.your_goal.replace('{kcal}', Math.round(driEnergy).toLocaleString(isEnglish ? 'en-US' : 'de-CH'))
			: t.reference_day.replace('{kcal}', REFERENCE_ENERGY[driSex].toLocaleString(isEnglish ? 'en-US' : 'de-CH'))
	);

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

	// Labels, units, order and the percentage arithmetic all come from the same place
	// the fitness pages take them, so a recipe's vitamin list reads identically to the
	// one on the food it maps to. The recipe calculator sums a narrower set of
	// nutrients than a food record carries — retinol, pantothenic acid and biotin have
	// no total here — so the shared order is filtered rather than reordered.
	/** @param {string[]} keys */
	function mkRows(keys) {
		const totals = /** @type {Record<string, number>} */ (
			/** @type {unknown} */ (nutrition.totalMicros)
		);
		const perPortion = (/** @type {string} */ k) =>
			typeof totals[k] === 'number' ? totals[k] / div : null;
		return nutrientRows(keys.filter((k) => typeof totals[k] === 'number'), perPortion, dri, isEnglish);
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

	/* Above the rings rather than beside the details toggle: logging what you just
	   cooked is a different intent from reading its numbers, and it should not have to
	   be found at the bottom of the panel. Centred on the same axis as the rings. */
	.summary-actions {
		display: flex;
		justify-content: center;
		margin-bottom: 0.75rem;
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

	/* A quiet toggle and a real action side by side: the toggle stays text, the log
	   button is a pill, and the gap between them is wide enough that the pill does not
	   read as part of the same control. */
	.details-toggle-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 0.75rem 1.25rem;
		margin-top: 0.85rem;
	}
	/* A disclosure, not a link: the chevron carries the state and turns to point at
	   what it will do next. */
	.details-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		user-select: none;
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		color: var(--color-text-secondary);
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		transition: color var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
	}
	.details-toggle:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
		background: var(--color-bg-elevated);
	}
	.details-toggle :global(svg) {
		transition: rotate var(--transition-normal);
	}
	@media (prefers-reduced-motion: reduce) {
		.details-toggle :global(svg) {
			transition: none;
		}
	}

	/* What the bars below are a share of — the reader's own calorie goal when they
	   have one, the reference day otherwise. Without this the percentages would be
	   a number with no stated denominator. */
	.dri-basis {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		margin: 0;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}

	/* Visually hidden but still focusable and operable — it is the real control, and
	   the label below is only its face. */
	.details-checkbox {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.details-checkbox:focus-visible ~ .details-toggle-row .details-toggle {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Open and close as a grid row growing from 0fr to 1fr: it animates in CSS, so the
	   panel unrolls downward and rolls back up with no script involved. A JS
	   transition would have made the whole panel unreachable with JavaScript off.
	   The padding is on the animated box rather than on its first child, whose margin
	   would collapse through it and land as a jump on the final frame. */
	.details-panel {
		display: grid;
		grid-template-rows: 0fr;
		padding-top: 0;
		overflow: hidden;
		transition: grid-template-rows var(--transition-normal) ease, padding-top var(--transition-normal) ease;
	}
	/* min-height lets the row actually collapse to nothing; visibility keeps anything
	   inside out of the tab order while it is rolled up, and is animatable in steps,
	   so it flips at the end of the closing transition rather than blanking the panel
	   on the first frame. */
	.details-inner {
		min-height: 0;
		visibility: hidden;
		transition: visibility var(--transition-normal);
	}
	.details-checkbox:checked ~ .details-panel {
		grid-template-rows: 1fr;
		padding-top: 0.85rem;
	}
	.details-checkbox:checked ~ .details-panel .details-inner {
		visibility: visible;
	}
	.details-checkbox:checked ~ .details-toggle-row .details-toggle :global(svg) {
		rotate: 180deg;
	}

	@media (prefers-reduced-motion: reduce) {
		.details-panel {
			transition: none;
		}
	}

	/* One column at every width, like the diary's nutrient panel: the rows carry a
	   bar, and a bar squeezed into half a column stops being readable long before the
	   viewport gets narrow. */
	.details-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		margin-top: 0.6rem;
		font-size: 0.85rem;
	}
	/* Same section heading as the diary's nutrient panel. */
	.detail-section h4 {
		margin: 0 0 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
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

</style>

{#if nutritionMappings && nutritionMappings.length > 0}
<div class="nutrition-summary">
	<!-- The disclosure is a checkbox, so the panel opens and closes without JS —
	     the same pattern the header popovers use. -->
	<input
		type="checkbox"
		class="details-checkbox"
		id={detailsId}
		bind:checked={showDetails}
		aria-label={labels.details}
	/>

	{#if actions}
		<div class="summary-actions">{@render actions()}</div>
	{/if}

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

	{#if nutrition.coverage < 1}
		<div class="coverage-warning">
			{Math.round(nutrition.coverage * 100)}% {labels.coverage}
			{#if nutrition.unmapped.length > 0}
				— {labels.unmapped}: {nutrition.unmapped.join(', ')}
			{/if}
		</div>
	{/if}

	<div class="details-toggle-row">
		<label class="details-toggle" for={detailsId}>
			<span>{labels.details}</span>
			<ChevronDown size={15} />
		</label>
	</div>

	<div class="details-panel">
		<div class="details-inner">
			<p class="dri-basis">
				{t.per_portion_of_day}{adjustedPortionCount > 0 ? ` · ${labels.perPortion}` : ''} · {referenceLabel}
				<DriSourceInfo isEn={isEnglish} aminos={false} />
			</p>
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
						<NutrientRow {row} />
					{/each}
				</div>
				<div class="detail-section">
					<h4>{labels.minerals}</h4>
					{#each mineralRows as row (row.key)}
						<NutrientRow {row} />
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
		</div>
	</div>
</div>
{/if}

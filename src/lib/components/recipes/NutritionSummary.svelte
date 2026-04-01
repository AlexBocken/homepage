<script>
	import { createNutritionCalculator } from '$lib/js/nutrition.svelte';

	let { flatIngredients, nutritionMappings, sectionNames, referencedNutrition, multiplier, portions, isEnglish } = $props();

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
		title: isEnglish ? 'Nutrition' : 'Nährwerte',
		perPortion: isEnglish ? 'per portion' : 'pro Portion',
		protein: isEnglish ? 'Protein' : 'Eiweiß',
		fat: isEnglish ? 'Fat' : 'Fett',
		carbs: isEnglish ? 'Carbs' : 'Kohlenh.',
		fiber: isEnglish ? 'Fiber' : 'Ballaststoffe',
		sugars: isEnglish ? 'Sugars' : 'Zucker',
		saturatedFat: isEnglish ? 'Sat. Fat' : 'Ges. Fett',
		details: isEnglish ? 'Details' : 'Details',
		vitamins: isEnglish ? 'Vitamins' : 'Vitamine',
		minerals: isEnglish ? 'Minerals' : 'Mineralstoffe',
		coverage: isEnglish ? 'coverage' : 'Abdeckung',
		unmapped: isEnglish ? 'Not tracked' : 'Nicht erfasst',
		aminoAcids: isEnglish ? 'Amino Acids' : 'Aminosäuren',
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

	// SVG arc parameters — 300° arc with 60° gap at bottom
	const RADIUS = 28;
	const ARC_DEGREES = 300;
	const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	// Arc starts at the left side: rotate so the gap is centered at the bottom
	// 0° in SVG circle = 3 o'clock. We want the arc to start at ~210° (7 o'clock)
	// and end at ~150° (5 o'clock), leaving a 60° gap at bottom center.
	const ARC_ROTATE = 120; // rotate the starting point: -90 (top) + 210 offset → start at left

	/** @param {number} percent */
	function strokeOffset(percent) {
		return ARC_LENGTH - (percent / 100) * ARC_LENGTH;
	}
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
	.macro-ring {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		flex: 1;
	}
	.ring-bg {
		fill: none;
		stroke: var(--color-border, #e5e5e5);
		stroke-width: 5;
		stroke-linecap: round;
	}
	.ring-fill {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.4s ease;
	}
	.ring-text {
		font-size: 14px;
		font-weight: 700;
		fill: currentColor;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.ring-protein { stroke: var(--nord14, #a3be8c); }
	.ring-fat { stroke: var(--nord12, #d08770); }
	.ring-carbs { stroke: var(--nord9, #81a1c1); }

	.macro-label {
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
	}

	.details-toggle-row {
		text-align: center;
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
			{ pct: macroPercent.protein, label: labels.protein, cls: 'ring-protein' },
			{ pct: macroPercent.fat, label: labels.fat, cls: 'ring-fat' },
			{ pct: macroPercent.carbs, label: labels.carbs, cls: 'ring-carbs' },
		] as macro}
			<div class="macro-ring">
				<svg width="90" height="90" viewBox="0 0 70 70">
					<circle
						class="ring-bg"
						cx="35" cy="35" r={RADIUS}
						stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
						transform="rotate({ARC_ROTATE} 35 35)"
					/>
					<circle
						class="ring-fill {macro.cls}"
						cx="35" cy="35" r={RADIUS}
						stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
						stroke-dashoffset={strokeOffset(macro.pct)}
						transform="rotate({ARC_ROTATE} 35 35)"
					/>
					<text class="ring-text" x="35" y="35">{macro.pct}%</text>
				</svg>
				<span class="macro-label">{macro.label}</span>
			</div>
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
			</div>
			<div class="detail-section">
				<h4>{labels.vitamins}</h4>
				<div class="detail-row"><span>Vitamin A</span><span>{fmt(nutrition.totalMicros.vitaminA / div)} mcg</span></div>
				<div class="detail-row"><span>Vitamin C</span><span>{fmt(nutrition.totalMicros.vitaminC / div)} mg</span></div>
				<div class="detail-row"><span>Vitamin D</span><span>{fmt(nutrition.totalMicros.vitaminD / div)} mcg</span></div>
				<div class="detail-row"><span>Vitamin E</span><span>{fmt(nutrition.totalMicros.vitaminE / div)} mg</span></div>
				<div class="detail-row"><span>Vitamin K</span><span>{fmt(nutrition.totalMicros.vitaminK / div)} mcg</span></div>
				<div class="detail-row"><span>Vitamin B12</span><span>{fmt(nutrition.totalMicros.vitaminB12 / div)} mcg</span></div>
				<div class="detail-row"><span>Folate</span><span>{fmt(nutrition.totalMicros.folate / div)} mcg</span></div>
			</div>
			<div class="detail-section">
				<h4>{labels.minerals}</h4>
				<div class="detail-row"><span>Calcium</span><span>{fmt(nutrition.totalMicros.calcium / div)} mg</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Iron' : 'Eisen'}</span><span>{fmt(nutrition.totalMicros.iron / div)} mg</span></div>
				<div class="detail-row"><span>Magnesium</span><span>{fmt(nutrition.totalMicros.magnesium / div)} mg</span></div>
				<div class="detail-row"><span>Potassium</span><span>{fmt(nutrition.totalMicros.potassium / div)} mg</span></div>
				<div class="detail-row"><span>Sodium</span><span>{fmt(nutrition.totalMicros.sodium / div)} mg</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Zinc' : 'Zink'}</span><span>{fmt(nutrition.totalMicros.zinc / div)} mg</span></div>
			</div>
			{#if hasAminoAcids}
			<div class="detail-section">
				<h4>{labels.aminoAcids}</h4>
				<div class="detail-row"><span>{isEnglish ? 'Leucine' : 'Leucin'}</span><span>{fmt(nutrition.totalAminoAcids.leucine / div)} g</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Isoleucine' : 'Isoleucin'}</span><span>{fmt(nutrition.totalAminoAcids.isoleucine / div)} g</span></div>
				<div class="detail-row"><span>Valin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.valine / div)} g</span></div>
				<div class="detail-row"><span>Lysin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.lysine / div)} g</span></div>
				<div class="detail-row"><span>Methionin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.methionine / div)} g</span></div>
				<div class="detail-row"><span>Phenylalanin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.phenylalanine / div)} g</span></div>
				<div class="detail-row"><span>Threonin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.threonine / div)} g</span></div>
				<div class="detail-row"><span>Tryptophan</span><span>{fmt(nutrition.totalAminoAcids.tryptophan / div)} g</span></div>
				<div class="detail-row"><span>Histidin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.histidine / div)} g</span></div>
				<div class="detail-row"><span>Arginin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.arginine / div)} g</span></div>
				<div class="detail-row"><span>Alanin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.alanine / div)} g</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Aspartic Acid' : 'Asparaginsäure'}</span><span>{fmt(nutrition.totalAminoAcids.asparticAcid / div)} g</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Cysteine' : 'Cystein'}</span><span>{fmt(nutrition.totalAminoAcids.cysteine / div)} g</span></div>
				<div class="detail-row"><span>{isEnglish ? 'Glutamic Acid' : 'Glutaminsäure'}</span><span>{fmt(nutrition.totalAminoAcids.glutamicAcid / div)} g</span></div>
				<div class="detail-row"><span>Glycin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.glycine / div)} g</span></div>
				<div class="detail-row"><span>Prolin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.proline / div)} g</span></div>
				<div class="detail-row"><span>Serin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.serine / div)} g</span></div>
				<div class="detail-row"><span>Tyrosin{isEnglish ? 'e' : ''}</span><span>{fmt(nutrition.totalAminoAcids.tyrosine / div)} g</span></div>
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
	</div>
</div>
{/if}

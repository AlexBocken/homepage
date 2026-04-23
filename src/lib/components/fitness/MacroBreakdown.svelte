<script>
	import { detectFitnessLang } from '$lib/js/fitnessI18n';
	import { page } from '$app/stores';
	import { Beef, Droplet, Wheat } from '@lucide/svelte';
	import RingGraph from './RingGraph.svelte';

	/**
	 * @type {{
	 *   calories?: number,
	 *   protein: number,
	 *   fat: number,
	 *   carbs: number,
	 *   saturatedFat?: number,
	 *   sugars?: number,
	 *   fiber?: number,
	 *   showCalories?: boolean,
	 *   showDetailRows?: boolean,
	 * }}
	 */
	let {
		calories = 0,
		protein = 0,
		fat = 0,
		carbs = 0,
		saturatedFat = 0,
		sugars = 0,
		fiber = 0,
		showCalories = true,
		showDetailRows = true,
	} = $props();

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const isEn = $derived(lang === 'en');

	const macroPercent = $derived.by(() => {
		const proteinCal = protein * 4;
		const fatCal = fat * 9;
		const carbsCal = carbs * 4;
		const total = proteinCal + fatCal + carbsCal;
		if (total === 0) return { protein: 0, fat: 0, carbs: 0 };
		return {
			protein: Math.round(proteinCal / total * 100),
			fat: Math.round(fatCal / total * 100),
			carbs: 100 - Math.round(proteinCal / total * 100) - Math.round(fatCal / total * 100),
		};
	});

	/** @param {number | null | undefined} v */
	function fmt(v) {
		if (v == null || isNaN(v)) return '0';
		if (v >= 100) return Math.round(v).toString();
		return v.toFixed(1);
	}

	const macros = $derived([
		{ pct: macroPercent.protein, label: isEn ? 'Protein' : 'Eiweiß', color: 'var(--nord14)', grams: protein, icon: Beef },
		{ pct: macroPercent.fat, label: isEn ? 'Fat' : 'Fett', color: 'var(--nord12)', grams: fat, icon: Droplet },
		{ pct: macroPercent.carbs, label: isEn ? 'Carbs' : 'Kohlenh.', color: 'var(--nord9)', grams: carbs, icon: Wheat },
	]);
</script>

<div class="macro-breakdown">
	{#if showCalories}
		<div class="mb-cal">
			<span class="mb-cal-num">{Math.round(calories)}</span>
			<span class="mb-cal-unit">kcal</span>
		</div>
	{/if}

	<div class="mb-rings">
		{#each macros as macro (macro.color)}
			{@const MacroIcon = macro.icon}
			<RingGraph
				percent={macro.pct}
				color={macro.color}
				label={macro.label}
				sublabel="{fmt(macro.grams)}g"
			>
				{#snippet labelIcon()}<MacroIcon size={12} />{/snippet}
			</RingGraph>
		{/each}
	</div>

	{#if showDetailRows}
		<div class="mb-rows">
			<div class="mb-row">
				<span class="mb-row-label"><Beef size={12} /> {isEn ? 'Protein' : 'Eiweiß'}</span>
				<span>{fmt(protein)} g</span>
			</div>
			<div class="mb-row">
				<span class="mb-row-label"><Droplet size={12} /> {isEn ? 'Fat' : 'Fett'}</span>
				<span>{fmt(fat)} g</span>
			</div>
			<div class="mb-row sub">
				<span>{isEn ? 'Saturated Fat' : 'Ges. Fettsäuren'}</span>
				<span>{fmt(saturatedFat)} g</span>
			</div>
			<div class="mb-row">
				<span class="mb-row-label"><Wheat size={12} /> {isEn ? 'Carbohydrates' : 'Kohlenhydrate'}</span>
				<span>{fmt(carbs)} g</span>
			</div>
			<div class="mb-row sub">
				<span>{isEn ? 'Sugars' : 'Zucker'}</span>
				<span>{fmt(sugars)} g</span>
			</div>
			<div class="mb-row">
				<span>{isEn ? 'Fiber' : 'Ballaststoffe'}</span>
				<span>{fmt(fiber)} g</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.macro-breakdown {
		display: flex;
		flex-direction: column;
	}
	.mb-cal {
		text-align: center;
		margin-bottom: 0.25rem;
	}
	.mb-cal-num {
		font-size: 2.2rem;
		font-weight: 800;
		color: var(--color-text-primary);
		line-height: 1;
	}
	.mb-cal-unit {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-left: 0.2rem;
	}
	.mb-rings {
		display: flex;
		justify-content: space-around;
		margin: 0.25rem 0 0.5rem;
	}
	.mb-rows {
		background: var(--color-surface);
		border-radius: 10px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
	}
	.mb-row {
		display: flex;
		justify-content: space-between;
		padding: 0.3rem 0;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
		color: var(--color-text-primary);
	}
	.mb-row:last-child {
		border-bottom: none;
	}
	.mb-row-label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.mb-row.sub span:first-child {
		padding-left: 0.75rem;
		color: var(--color-text-tertiary);
		font-size: 0.8rem;
	}
	.mb-row span:last-child {
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
</style>

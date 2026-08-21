<script>
	/**
	 * Which meal an entry belongs to: four buttons, one per bucket.
	 *
	 * Icon-only by default, which is what the tight diary rows have room for. Pass
	 * `showLabels` where the control is the main thing on screen — a dialog, a log
	 * panel — and each button names its meal as well, since a coffee cup alone is
	 * only obvious once you already know the convention.
	 */
	import { m } from '$lib/js/fitnessI18n';
	import { MEAL_TYPES } from '$lib/fitness/meals';
	import { MEAL_META } from './mealMeta';

	/** @type {{ value?: 'breakfast' | 'lunch' | 'dinner' | 'snack', lang?: 'en' | 'de', showLabels?: boolean, onchange?: (meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void }} */
	let {
		value = 'snack',
		lang = 'de',
		showLabels = false,
		onchange = () => {},
	} = $props();
	const t = $derived(m[lang]);

	/** @type {Array<'breakfast' | 'lunch' | 'dinner' | 'snack'>} */
	const mealTypes = [...MEAL_TYPES];
</script>

<div class="meal-type-picker" class:with-labels={showLabels}>
	{#each mealTypes as meal (meal)}
		{@const meta = MEAL_META[meal]}
		{@const MealIcon = meta.icon}
		<button
			type="button"
			class="meal-btn"
			class:active={value === meal}
			style="--mc: {meta.color}"
			aria-pressed={value === meal}
			onclick={() => { onchange(meal); }}
			title={t[meal]}
		>
			<MealIcon size={14} />
			{#if showLabels}<span>{t[meal]}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.meal-type-picker {
		display: flex;
		gap: 0.25rem;
	}
	.meal-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}
	.meal-btn.active {
		background: color-mix(in srgb, var(--mc) 15%, transparent);
		border-color: var(--mc);
		color: var(--mc);
	}
	.meal-btn:hover:not(.active) {
		border-color: var(--color-text-tertiary);
	}

	/* Labelled variant: the label wraps under the icon on narrow screens rather than
	   shrinking the four buttons past the point where any of them can be hit. */
	.with-labels .meal-btn {
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.45rem 0.3rem;
		font-size: 0.7rem;
		line-height: 1.2;
	}
	.with-labels .meal-btn span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}
</style>

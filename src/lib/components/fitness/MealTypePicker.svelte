<script>
	import { Coffee, Sun, Moon, Cookie } from '@lucide/svelte';
	import { t } from '$lib/js/fitnessI18n';

	let {
		value = 'snack',
		lang = 'de',
		onchange = () => {},
	} = $props();

	const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

	const mealMeta = {
		breakfast: { icon: Coffee, color: 'var(--nord13)' },
		lunch:     { icon: Sun, color: 'var(--nord12)' },
		dinner:    { icon: Moon, color: 'var(--nord15)' },
		snack:     { icon: Cookie, color: 'var(--nord14)' },
	};
</script>

<div class="meal-type-picker">
	{#each mealTypes as meal (meal)}
		{@const meta = mealMeta[meal]}
		{@const MealIcon = meta.icon}
		<button
			class="meal-btn"
			class:active={value === meal}
			style="--mc: {meta.color}"
			onclick={() => { onchange(meal); }}
			title={t(meal, lang)}
		>
			<MealIcon size={14} />
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
</style>

<script>
	/**
	 * One recipe's mappings, as a saveable form, for the review walk.
	 *
	 * Split out of the page so the queue can key it on the recipe: the route
	 * component is reused when only the `[name]` param changes, and the mapper's
	 * state is seeded from its props exactly once. Keying it is what makes
	 * "speichern & weiter" open the next recipe with the next recipe's mappings
	 * instead of the last one's.
	 */
	import { enhance } from '$app/forms';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import NutritionMapper from '$lib/components/recipes/NutritionMapper.svelte';

	/**
	 * @typedef {{
	 *   recipe: any,
	 *   base: string,
	 *   next: string | null,
	 *   previous: string | null,
	 * }} Props
	 */

	/** @type {Props} */
	let { recipe, base, next, previous } = $props();

	// Local from here on: the mapper owns them and posts them back through its own
	// hidden inputs.
	// svelte-ignore state_referenced_locally
	let mappings = $state(recipe.nutritionMappings || []);
	// svelte-ignore state_referenced_locally
	let finalWeight = $state(recipe.finalWeight ?? { mode: 'auto' });
	let submitting = $state(false);
</script>

<form
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update({ reset: false });
		};
	}}
>
	<NutritionMapper
		bind:mappings
		bind:finalWeight
		ingredients={recipe.ingredients || []}
		shortName={recipe.short_name}
		referencedNutrition={recipe.referencedNutrition || []}
	/>

	<div class="actions">
		{#if previous}
			<a class="ghost" href="{base}/{previous}">
				<ArrowLeft size={16} /> Vorheriges
			</a>
		{/if}

		<button class="secondary" type="submit" name="go" value="stay" disabled={submitting}>
			Speichern
		</button>

		<button class="primary" type="submit" name="go" value="next" disabled={submitting}>
			{next ? 'Speichern & weiter' : 'Speichern & fertig'}
			<ArrowRight size={16} />
		</button>

		{#if next}
			<a class="ghost skip" href="{base}/{next}">Ohne Speichern weiter</a>
		{/if}
	</div>
</form>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: 2rem;
	}

	.primary,
	.secondary,
	.ghost {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background var(--transition-fast), border-color var(--transition-fast);
	}
	.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.primary:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}
	.secondary {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border-color: var(--color-border);
	}
	.secondary:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}
	.ghost {
		background: transparent;
		color: var(--color-text-secondary);
		border-color: var(--color-border);
	}
	.ghost:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
	}
	.skip {
		margin-left: auto;
	}

	.primary:disabled,
	.secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 560px) {
		.actions {
			flex-direction: column;
			align-items: stretch;
		}
		.actions a,
		.actions button {
			justify-content: center;
		}
		.skip {
			margin-left: 0;
		}
	}
</style>

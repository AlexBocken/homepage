<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let ingredients: any[] = [];

	const dispatch = createEventDispatcher();

	function handleChange() {
		dispatch('change', { ingredients });
	}

	function updateIngredientGroupName(groupIndex: number, event: Event) {
		const target = event.target as HTMLInputElement;
		ingredients[groupIndex].name = target.value;
		handleChange();
	}

	function updateIngredientItem(groupIndex: number, itemIndex: number, field: string, event: Event) {
		const target = event.target as HTMLInputElement;
		ingredients[groupIndex].list[itemIndex][field] = target.value;
		handleChange();
	}
</script>

<style>
.ingredients-editor {
	background: var(--nord0);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	padding: 0.75rem;
}

@media(prefers-color-scheme: light) {
	.ingredients-editor {
		background: var(--nord5);
		border-color: var(--nord3);
	}
}

.ingredient-group {
	margin-bottom: 1.5rem;
}

.ingredient-group:last-child {
	margin-bottom: 0;
}

.group-name {
	width: 100%;
	padding: 0.5rem;
	margin-bottom: 0.5rem;
	background: var(--nord1);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	color: var(--nord6);
	font-weight: 600;
	font-size: 0.95rem;
}

@media(prefers-color-scheme: light) {
	.group-name {
		background: var(--nord6);
		color: var(--nord0);
	}
}

.ingredient-item {
	display: grid;
	grid-template-columns: 60px 60px 1fr;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.ingredient-item input {
	padding: 0.4rem;
	background: var(--nord1);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	color: var(--nord6);
	font-size: 0.9rem;
}

@media(prefers-color-scheme: light) {
	.ingredient-item input {
		background: var(--nord6);
		color: var(--nord0);
	}
}

.ingredient-item input:focus {
	outline: 2px solid var(--nord14);
	border-color: var(--nord14);
}

.ingredient-item input.amount {
	text-align: right;
}
</style>

<div class="ingredients-editor">
	{#each ingredients as group, groupIndex}
		<div class="ingredient-group">
			<input
				type="text"
				class="group-name"
				value={group.name || ''}
				on:input={(e) => updateIngredientGroupName(groupIndex, e)}
				placeholder="Ingredient group name"
			/>
			{#each group.list as item, itemIndex}
				<div class="ingredient-item">
					<input
						type="text"
						class="amount"
						value={item.amount || ''}
						on:input={(e) => updateIngredientItem(groupIndex, itemIndex, 'amount', e)}
						placeholder="Amt"
					/>
					<input
						type="text"
						class="unit"
						value={item.unit || ''}
						on:input={(e) => updateIngredientItem(groupIndex, itemIndex, 'unit', e)}
						placeholder="Unit"
					/>
					<input
						type="text"
						class="name"
						value={item.name || ''}
						on:input={(e) => updateIngredientItem(groupIndex, itemIndex, 'name', e)}
						placeholder="Ingredient name"
					/>
				</div>
			{/each}
		</div>
	{/each}
</div>

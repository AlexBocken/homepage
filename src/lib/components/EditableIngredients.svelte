<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let ingredients: any[] = [];
	export let translationMetadata: any[] | null | undefined = null;

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

	// Base recipe reference handlers
	function updateLabelOverride(groupIndex: number, event: Event) {
		const target = event.target as HTMLInputElement;
		ingredients[groupIndex].labelOverride = target.value;
		handleChange();
	}

	function updateItemBefore(groupIndex: number, itemIndex: number, field: string, event: Event) {
		const target = event.target as HTMLInputElement;
		if (!ingredients[groupIndex].itemsBefore) {
			ingredients[groupIndex].itemsBefore = [];
		}
		ingredients[groupIndex].itemsBefore[itemIndex][field] = target.value;
		handleChange();
	}

	function updateItemAfter(groupIndex: number, itemIndex: number, field: string, event: Event) {
		const target = event.target as HTMLInputElement;
		if (!ingredients[groupIndex].itemsAfter) {
			ingredients[groupIndex].itemsAfter = [];
		}
		ingredients[groupIndex].itemsAfter[itemIndex][field] = target.value;
		handleChange();
	}

	// Check if a group name was re-translated
	function isGroupNameTranslated(groupIndex: number): boolean {
		return translationMetadata?.[groupIndex]?.nameTranslated ?? false;
	}

	// Check if a specific item was re-translated
	function isItemTranslated(groupIndex: number, itemIndex: number): boolean {
		return translationMetadata?.[groupIndex]?.itemsTranslated?.[itemIndex] ?? false;
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

/* Highlight re-translated items with red border */
.retranslated {
	border: 2px solid var(--nord11) !important;
	animation: highlight-flash 0.6s ease-out;
}

@keyframes highlight-flash {
	0% {
		box-shadow: 0 0 10px var(--nord11);
	}
	100% {
		box-shadow: 0 0 0 transparent;
	}
}

.reference-badge {
	display: inline-block;
	padding: 0.25rem 0.5rem;
	background: var(--nord9);
	color: var(--nord6);
	border-radius: 4px;
	font-size: 0.75rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.reference-section {
	padding: 0.5rem;
	background: var(--nord2);
	border-radius: 4px;
	margin-bottom: 0.5rem;
}

@media(prefers-color-scheme: light) {
	.reference-section {
		background: var(--nord4);
	}
}

.reference-section-label {
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--nord8);
	margin-bottom: 0.25rem;
}
</style>

<div class="ingredients-editor">
	{#each ingredients as group, groupIndex}
		<div class="ingredient-group">
			{#if group.type === 'reference'}
				<span class="reference-badge">🔗 Base Recipe Reference</span>

				{#if group.labelOverride !== undefined}
					<input
						type="text"
						class="group-name"
						value={group.labelOverride || ''}
						on:input={(e) => updateLabelOverride(groupIndex, e)}
						placeholder="Label override (optional)"
					/>
				{/if}

				{#if group.itemsBefore && group.itemsBefore.length > 0}
					<div class="reference-section">
						<div class="reference-section-label">Items Before Base Recipe:</div>
						{#each group.itemsBefore as item, itemIndex}
							<div class="ingredient-item">
								<input
									type="text"
									class="amount"
									value={item.amount || ''}
									on:input={(e) => updateItemBefore(groupIndex, itemIndex, 'amount', e)}
									placeholder="Amt"
								/>
								<input
									type="text"
									class="unit"
									class:retranslated={isItemTranslated(groupIndex, itemIndex)}
									value={item.unit || ''}
									on:input={(e) => updateItemBefore(groupIndex, itemIndex, 'unit', e)}
									placeholder="Unit"
								/>
								<input
									type="text"
									class="name"
									class:retranslated={isItemTranslated(groupIndex, itemIndex)}
									value={item.name || ''}
									on:input={(e) => updateItemBefore(groupIndex, itemIndex, 'name', e)}
									placeholder="Ingredient name"
								/>
							</div>
						{/each}
					</div>
				{/if}

				{#if group.itemsAfter && group.itemsAfter.length > 0}
					<div class="reference-section">
						<div class="reference-section-label">Items After Base Recipe:</div>
						{#each group.itemsAfter as item, itemIndex}
							<div class="ingredient-item">
								<input
									type="text"
									class="amount"
									value={item.amount || ''}
									on:input={(e) => updateItemAfter(groupIndex, itemIndex, 'amount', e)}
									placeholder="Amt"
								/>
								<input
									type="text"
									class="unit"
									class:retranslated={isItemTranslated(groupIndex, itemIndex)}
									value={item.unit || ''}
									on:input={(e) => updateItemAfter(groupIndex, itemIndex, 'unit', e)}
									placeholder="Unit"
								/>
								<input
									type="text"
									class="name"
									class:retranslated={isItemTranslated(groupIndex, itemIndex)}
									value={item.name || ''}
									on:input={(e) => updateItemAfter(groupIndex, itemIndex, 'name', e)}
									placeholder="Ingredient name"
								/>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<input
					type="text"
					class="group-name"
					class:retranslated={isGroupNameTranslated(groupIndex)}
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
							class:retranslated={isItemTranslated(groupIndex, itemIndex)}
							value={item.unit || ''}
							on:input={(e) => updateIngredientItem(groupIndex, itemIndex, 'unit', e)}
							placeholder="Unit"
						/>
						<input
							type="text"
							class="name"
							class:retranslated={isItemTranslated(groupIndex, itemIndex)}
							value={item.name || ''}
							on:input={(e) => updateIngredientItem(groupIndex, itemIndex, 'name', e)}
							placeholder="Ingredient name"
						/>
					</div>
				{/each}
			{/if}
		</div>
	{/each}
</div>

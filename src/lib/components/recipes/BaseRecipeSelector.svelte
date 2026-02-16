<script lang="ts">
import { onMount } from 'svelte';
import { browser } from '$app/environment';
import { do_on_key } from '$lib/components/recipes/do_on_key.js'
import Check from '$lib/assets/icons/Check.svelte'

let {
	type = 'ingredients' as 'ingredients' | 'instructions',
	onSelect,
	open = $bindable(false)
}: {
	type?: 'ingredients' | 'instructions',
	onSelect: (recipe: any, options: any) => void,
	open?: boolean
} = $props();

// Unique dialog ID based on type to prevent conflicts when both are on the same page
const dialogId = `base-recipe-selector-modal-${type}`;

let baseRecipes: any[] = $state([]);
let selectedRecipe: any = $state(null);
let options = $state({
	includeIngredients: false,
	includeInstructions: false,
	showLabel: true,
	labelOverride: '',
	baseMultiplier: 1
});

// Reset options whenever type or modal state changes
$effect(() => {
	if (open || type) {
		options.includeIngredients = type === 'ingredients';
		options.includeInstructions = type === 'instructions';
	}
});

onMount(async () => {
	const res = await fetch('/api/rezepte/base-recipes');
	baseRecipes = await res.json();
});

function handleInsert() {
	if (selectedRecipe) {
		onSelect(selectedRecipe, options);
		// Reset modal
		selectedRecipe = null;
		options.labelOverride = '';
		options.showLabel = true;
		options.baseMultiplier = 1;
		closeModal();
	}
}

function closeModal() {
	open = false;
	if (browser) {
		const modal = document.querySelector(`#${dialogId}`) as HTMLDialogElement;
		if (modal) {
			modal.close();
		}
	}
}

function openModal() {
	if (browser) {
		const modal = document.querySelector(`#${dialogId}`) as HTMLDialogElement;
		if (modal) {
			modal.showModal();
		}
	}
}

$effect(() => {
	if (browser) {
		if (open) {
			setTimeout(openModal, 0);
		} else {
			closeModal();
		}
	}
});
</script>

<style>
dialog {
	box-sizing: content-box;
	width: 100%;
	height: 100%;
	background-color: transparent;
	border: unset;
	margin: 0;
	transition: 500ms;
}

dialog[open]::backdrop {
	animation: show 200ms ease forwards;
}

@keyframes show {
	from {
		backdrop-filter: blur(0px);
	}
	to {
		backdrop-filter: blur(10px);
	}
}

dialog h2 {
	font-size: 3rem;
	font-family: sans-serif;
	color: white;
	text-align: center;
	margin-top: 30vh;
	margin-top: 30dvh;
	filter: drop-shadow(0 0 0.4em black)
		drop-shadow(0 0 1em black);
}

.selector-content {
	box-sizing: border-box;
	margin-inline: auto;
	margin-top: 2rem;
	max-width: 600px;
	padding: 2rem;
	border-radius: var(--radius-card);
	background-color: var(--blue);
	color: white;
	box-shadow: 0 0 1em 0.2em rgba(0,0,0,0.3);
}

.selector-content label {
	display: block;
	margin-block: 1rem;
	font-size: 1.1rem;
}

.selector-content select,
.selector-content input[type="text"],
.selector-content input[type="number"] {
	width: 100%;
	padding: 0.5em 1em;
	margin-top: 0.5em;
	border-radius: var(--radius-pill);
	border: 2px solid var(--nord4);
	background-color: white;
	color: var(--nord0);
	font-size: 1rem;
	transition: var(--transition-fast);
}

.selector-content select:hover,
.selector-content select:focus,
.selector-content input[type="text"]:hover,
.selector-content input[type="text"]:focus,
.selector-content input[type="number"]:hover,
.selector-content input[type="number"]:focus {
	border-color: var(--nord9);
	transform: scale(1.02, 1.02);
}

.selector-content input[type="checkbox"] {
	width: 1.2em;
	height: 1.2em;
	margin-right: 0.5em;
	vertical-align: middle;
}

.button-group {
	display: flex;
	gap: 1rem;
	margin-top: 2rem;
	justify-content: center;
}

.button-group button {
	padding: 0.75em 2em;
	font-size: 1.1rem;
	border-radius: var(--radius-pill);
	border: none;
	cursor: pointer;
	transition: var(--transition-normal);
	font-weight: bold;
}

.button-insert {
	background-color: var(--nord14);
	color: var(--nord0);
}

.button-cancel {
	background-color: var(--nord3);
	color: white;
}

.button-group button:hover {
	transform: scale(1.1, 1.1);
	box-shadow: 0 0 1em 0.3em rgba(0,0,0,0.3);
}

@media (prefers-color-scheme: dark) {
	.selector-content {
		background-color: var(--nord1);
	}
}
</style>

<dialog id={dialogId}>
	<h2>Basisrezept einfügen</h2>

	<div class="selector-content">
		<label>
			Basisrezept auswählen:
			<select bind:value={selectedRecipe}>
				<option value={null}>-- Auswählen --</option>
				{#each baseRecipes as recipe}
					<option value={recipe}>{recipe.icon} {recipe.name}</option>
				{/each}
			</select>
		</label>

		{#if type === 'ingredients'}
			<label>
				<input type="checkbox" bind:checked={options.includeIngredients} />
				Zutaten einbeziehen
			</label>
		{/if}

		{#if type === 'instructions'}
			<label>
				<input type="checkbox" bind:checked={options.includeInstructions} />
				Zubereitungsschritte einbeziehen
			</label>
		{/if}

		<label>
			<input type="checkbox" bind:checked={options.showLabel} />
			Rezeptname als Überschrift anzeigen
		</label>

		{#if options.showLabel}
			<label>
				Eigene Überschrift (optional):
				<input
					type="text"
					bind:value={options.labelOverride}
					placeholder={selectedRecipe?.name || 'Überschrift eingeben...'}
					onkeydown={(event) => do_on_key(event, 'Enter', false, handleInsert)}
				/>
			</label>
		{/if}

		<label>
			Mengenfaktor (Multiplikator):
			<input
				type="number"
				bind:value={options.baseMultiplier}
				min="0"
				step="any"
				placeholder="1"
				onkeydown={(event) => do_on_key(event, 'Enter', false, handleInsert)}
			/>
		</label>

		<div class="button-group">
			<button class="button-insert" onclick={handleInsert} disabled={!selectedRecipe}>
				Einfügen
			</button>
			<button class="button-cancel" onclick={closeModal}>
				Abbrechen
			</button>
		</div>
	</div>
</dialog>

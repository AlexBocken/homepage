<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import Check from '$lib/assets/icons/Check.svelte';
	import SeasonSelect from '$lib/components/recipes/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import CardAdd from '$lib/components/recipes/CardAdd.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import '$lib/css/action_button.css';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Recipe data state
	let preamble = $state("");
	let addendum = $state("");
	let image_preview_url = $state("");
	let selected_image_file = $state<File | null>(null);

	// Translation workflow state
	let showTranslationWorkflow = $state(false);
	let translationData: any = $state(null);

	// Season store
	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';

	season.update(() => []);
	let season_local = $state<number[]>([]);
	season.subscribe((s) => {
		season_local = s;
	});

	let portions_local = $state("");
	portions.update(() => "");
	portions.subscribe((p) => {
		portions_local = p;
	});

	let card_data = $state({
		icon: "",
		category: "",
		name: "",
		description: "",
		tags: [] as string[],
	});

	let add_info = $state({
		preparation: "",
		fermentation: {
			bulk: "",
			final: "",
		},
		baking: {
			length: "",
			temperature: "",
			mode: "",
		},
		total_time: "",
		cooking: "",
	});

	let short_name = $state("");
	let isBaseRecipe = $state(false);
	let defaultForm = $state(null);
	let ingredients = $state<any[]>([]);
	let instructions = $state<any[]>([]);

	// Form submission state
	let submitting = $state(false);
	let formElement: HTMLFormElement;

	// Get season data from checkboxes
	function get_season(): number[] {
		const season: number[] = [];
		const el = document.getElementById("labels");
		if (!el) return season;

		for (let i = 0; i < el.children.length; i++) {
			const checkbox = el.children[i].children[0].children[0] as HTMLInputElement;
			if (checkbox?.checked) {
				season.push(i + 1);
			}
		}
		return season;
	}

	// Prepare German recipe data - use $derived to prevent infinite effect loops
	let germanRecipeData = $derived({
		...card_data,
		...add_info,
		images: selected_image_file ? [{ mediapath: 'pending', alt: "", caption: "" }] : [],
		season: season_local,
		short_name: short_name.trim(),
		portions: portions_local,
		datecreated: new Date(),
		datemodified: new Date(),
		instructions,
		ingredients,
		preamble,
		addendum,
		isBaseRecipe,
		defaultForm,
	});

	// Show translation workflow before submission
	function prepareSubmit() {
		// Client-side validation
		if (!short_name.trim()) {
			alert('Bitte geben Sie einen Kurznamen ein');
			return;
		}
		if (!card_data.name) {
			alert('Bitte geben Sie einen Namen ein');
			return;
		}

		showTranslationWorkflow = true;
		// Scroll to translation section
		setTimeout(() => {
			document.getElementById('translation-section')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	// Handle translation approval - populate form and submit
	async function handleTranslationApproved(event: CustomEvent) {
		translationData = event.detail.translatedRecipe;

		// Wait for Svelte to update the DOM with the hidden inputs
		await tick();

		// Submit the form programmatically
		if (formElement) {
			formElement.requestSubmit();
		}
	}

	// Handle translation skipped - submit without translation
	async function handleTranslationSkipped() {
		translationData = null;

		// Wait for Svelte to update the DOM (remove hidden inputs)
		await tick();

		// Submit the form programmatically
		if (formElement) {
			formElement.requestSubmit();
		}
	}

	// Handle translation cancelled
	function handleTranslationCancelled() {
		showTranslationWorkflow = false;
		translationData = null;
	}

	// Display form errors if any
	$effect(() => {
		if (form?.error) {
			alert(`Fehler: ${form.error}`);
		}
	});
</script>

<style>
input {
	display: block;
	border: unset;
	margin: 1rem auto;
	padding: 0.5em 1em;
	border-radius: var(--radius-pill);
	background-color: var(--nord4);
	font-size: 1.1rem;
	transition: var(--transition-fast);
}
input:hover,
input:focus-visible {
	scale: 1.05 1.05;
}
.list_wrapper {
	margin-inline: auto;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	gap: 2rem;
	justify-content: center;
}
@media screen and (max-width: 700px) {
	.list_wrapper {
		flex-direction: column;
	}
}
h1 {
	text-align: center;
	margin-bottom: 2rem;
}
.title_container {
	max-width: 1000px;
	display: flex;
	flex-direction: column;
	margin-inline: auto;
}
.title {
	position: relative;
	width: min(800px, 80vw);
	margin-block: 2rem;
	margin-inline: auto;
	background-color: var(--nord6);
	padding: 1rem 2rem;
}
.title p {
	border: 2px solid var(--nord1);
	border-radius: 10000px;
	padding: 0.5em 1em;
	font-size: 1.1rem;
	transition: var(--transition-normal);
}
.title p:hover,
.title p:focus-within {
	scale: 1.02 1.02;
}
.addendum {
	font-size: 1.1rem;
	max-width: 90%;
	margin-inline: auto;
	border: 2px solid var(--nord1);
	border-radius: 45px;
	padding: 1em 1em;
	transition: var(--transition-fast);
}
.addendum:hover,
.addendum:focus-within {
	scale: 1.02 1.02;
}
.addendum_wrapper {
	max-width: 1000px;
	margin-inline: auto;
}
h3 {
	text-align: center;
}
button.action_button {
	animation: unset !important;
	font-size: 1.3rem;
	color: white;
}
.submit_buttons {
	display: flex;
	margin-inline: auto;
	max-width: 1000px;
	margin-block: 1rem;
	justify-content: center;
	align-items: center;
	gap: 2rem;
}
.submit_buttons p {
	padding: 0;
	padding-right: 0.5em;
	margin: 0;
}
@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .title {
		background-color: var(--nord6-dark);
	}
  }
:global(:root[data-theme="dark"]) .title {
	background-color: var(--nord6-dark);
}
.form-size-section {
	max-width: 600px;
	margin: 1rem auto;
	text-align: center;
}
.form-size-controls {
	display: flex;
	gap: 1.5rem;
	justify-content: center;
	margin-bottom: 0.5rem;
}
.form-size-inputs {
	display: flex;
	gap: 1rem;
	justify-content: center;
	align-items: center;
	flex-wrap: wrap;
}
.form-size-inputs input[type="number"] {
	width: 4em;
	display: inline;
	margin: 0 0.3em;
}
.error-message {
	background: var(--nord11);
	color: var(--nord6);
	padding: 1rem;
	border-radius: 4px;
	margin: 1rem auto;
	max-width: 800px;
	text-align: center;
}
</style>

<svelte:head>
	<title>Rezept erstellen</title>
	<meta name="description" content="Hier können neue Rezepte hinzugefügt werden" />
</svelte:head>

<h1>Rezept erstellen</h1>

{#if form?.error}
	<div class="error-message">
		<strong>Fehler:</strong> {form.error}
	</div>
{/if}

<form
	method="POST"
	bind:this={formElement}
	enctype="multipart/form-data"
	use:enhance={({ formData }) => {
		submitting = true;
		// Append the image file BEFORE submission (in the outer function)
		if (selected_image_file) {
			formData.append('recipe_image', selected_image_file);
		}
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}
  }
>
	<!-- Hidden inputs for complex nested data -->
	<input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />
	<input type="hidden" name="instructions_json" value={JSON.stringify(instructions)} />
	<input type="hidden" name="add_info_json" value={JSON.stringify(add_info)} />
	<input type="hidden" name="season" value={JSON.stringify(season_local)} />
	<input type="hidden" name="tags" value={JSON.stringify(card_data.tags)} />

	<!-- Translation data (added after approval) -->
	{#if translationData}
		<input type="hidden" name="translation_json" value={JSON.stringify(translationData)} />
		<input type="hidden" name="translation_metadata_json" value={JSON.stringify({
			lastModifiedGerman: new Date(),
			fieldsModifiedSinceTranslation: []
		})} />
	{/if}

	<CardAdd
		bind:card_data
		bind:image_preview_url
		bind:selected_image_file
		short_name={short_name}
	/>

	<h3>Kurzname (für URL):</h3>
	<input name="short_name" bind:value={short_name} placeholder="Kurzname" required />

	<!-- Hidden inputs for card data -->
	<input type="hidden" name="name" value={card_data.name} />
	<input type="hidden" name="description" value={card_data.description} />
	<input type="hidden" name="category" value={card_data.category} />
	<input type="hidden" name="icon" value={card_data.icon} />
	<input type="hidden" name="portions" value={portions_local} />
	<input type="hidden" name="isBaseRecipe" value={isBaseRecipe ? "true" : "false"} />
	<input type="hidden" name="defaultForm_json" value={defaultForm ? JSON.stringify(defaultForm) : ''} />

	<div style="text-align: center; margin: 1rem;">
		<Toggle
			bind:checked={isBaseRecipe}
			label="Als Basisrezept markieren (kann von anderen Rezepten referenziert werden)"
		/>
	</div>

	<!-- Default Form (Cake Pan) -->
	<div class="form-size-section">
		<h3>Backform (Standard):</h3>
		<div class="form-size-controls">
			<label>
				<input type="radio" name="formShape" value="none" checked={!defaultForm} onchange={() => { defaultForm = null; }
  } />
				Keine
			</label>
			<label>
				<input type="radio" name="formShape" value="round" checked={defaultForm?.shape === 'round'} onchange={() => { defaultForm = { shape: 'round', diameter: defaultForm?.diameter || 26 }; }
  } />
				Rund
			</label>
			<label>
				<input type="radio" name="formShape" value="rectangular" checked={defaultForm?.shape === 'rectangular'} onchange={() => { defaultForm = { shape: 'rectangular', width: defaultForm?.width || 20, length: defaultForm?.length || 30 }; }
  } />
				Rechteckig
			</label>
			<label>
				<input type="radio" name="formShape" value="gugelhupf" checked={defaultForm?.shape === 'gugelhupf'} onchange={() => { defaultForm = { shape: 'gugelhupf', diameter: defaultForm?.diameter || 24, innerDiameter: defaultForm?.innerDiameter || 8 }; }
  } />
				Gugelhupf
			</label>
		</div>
		{#if defaultForm?.shape === 'round'}
			<div class="form-size-inputs">
				<label>Durchmesser: <input type="number" min="1" step="1" bind:value={defaultForm.diameter} /> cm</label>
			</div>
		{:else if defaultForm?.shape === 'rectangular'}
			<div class="form-size-inputs">
				<label>Breite: <input type="number" min="1" step="1" bind:value={defaultForm.width} /> cm</label>
				<label>Länge: <input type="number" min="1" step="1" bind:value={defaultForm.length} /> cm</label>
			</div>
		{:else if defaultForm?.shape === 'gugelhupf'}
			<div class="form-size-inputs">
				<label>Außen-Ø: <input type="number" min="1" step="1" bind:value={defaultForm.diameter} /> cm</label>
				<label>Innen-Ø: <input type="number" min="1" step="1" bind:value={defaultForm.innerDiameter} /> cm</label>
			</div>
		{/if}
	</div>

	<div class="title_container">
		<div class="title">
			<h4>Eine etwas längere Beschreibung:</h4>
			<p bind:innerText={preamble} contenteditable></p>
			<input type="hidden" name="preamble" value={preamble} />

			<div class="tags">
				<h4>Saison:</h4>
				<SeasonSelect />
			</div>
		</div>
	</div>

	<div class="list_wrapper">
		<div>
			<CreateIngredientList bind:ingredients />
		</div>
		<div>
			<CreateStepList bind:instructions bind:add_info />
		</div>
	</div>

	<div class="addendum_wrapper">
		<h3>Nachtrag:</h3>
		<div class="addendum" bind:innerText={addendum} contenteditable></div>
		<input type="hidden" name="addendum" value={addendum} />
	</div>

	{#if !showTranslationWorkflow}
		<div class="submit_buttons">
			<button
				type="button"
				class="action_button"
				onclick={prepareSubmit}
				disabled={submitting}
			>
				<p>Weiter zur Übersetzung</p>
				<Check fill="white" width="2rem" height="2rem" />
			</button>
		</div>
	{/if}
</form>

{#if showTranslationWorkflow}
	<div id="translation-section">
		<TranslationApproval
			germanData={germanRecipeData}
			onapproved={handleTranslationApproved}
			onskipped={handleTranslationSkipped}
			oncancelled={handleTranslationCancelled}
		/>
	</div>
{/if}

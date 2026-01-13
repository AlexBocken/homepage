<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import Check from '$lib/assets/icons/Check.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/TranslationApproval.svelte';
	import GenerateAltTextButton from '$lib/components/GenerateAltTextButton.svelte';
	import EditRecipeNote from '$lib/components/EditRecipeNote.svelte';
	import CardAdd from '$lib/components/CardAdd.svelte';
	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/CreateStepList.svelte';
	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';
	import '$lib/css/action_button.css';
	import '$lib/css/nordtheme.css';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Recipe data state
	let preamble = $state(data.recipe.preamble || "");
	let addendum = $state(data.recipe.addendum || "");
	let note = $state(data.recipe.note || "");
	let image_preview_url = $state(
		"https://bocken.org/static/rezepte/thumb/" +
			(data.recipe.images?.[0]?.mediapath || `${data.recipe.short_name}.webp`)
	);
	let uploaded_image_filename = $state("");

	// Translation workflow state
	let showTranslationWorkflow = $state(false);
	let translationData = $state<any>(data.recipe.translations?.en || null);
	let changedFields = $state<string[]>([]);

	// Store original recipe data for change detection
	const originalRecipe = JSON.parse(JSON.stringify(data.recipe));
	const old_short_name = data.recipe.short_name;

	// Season and portions stores
	portions.update(() => data.recipe.portions || "");
	let portions_local = $state<string>(data.recipe.portions || "");
	$effect(() => {
		portions.subscribe((p) => {
			portions_local = p;
		});
	});

	season.update(() => data.recipe.season || []);
	let season_local = $state<number[]>(data.recipe.season || []);
	$effect(() => {
		season.subscribe((s) => {
			season_local = s;
		});
	});

	let card_data = $state({
		icon: data.recipe.icon || "",
		category: data.recipe.category || "",
		name: data.recipe.name || "",
		description: data.recipe.description || "",
		tags: data.recipe.tags || [],
	});

	let add_info = $state({
		preparation: data.recipe.preparation || "",
		fermentation: {
			bulk: data.recipe.fermentation?.bulk || "",
			final: data.recipe.fermentation?.final || "",
		},
		baking: {
			length: data.recipe.baking?.length || "",
			temperature: data.recipe.baking?.temperature || "",
			mode: data.recipe.baking?.mode || "",
		},
		total_time: data.recipe.total_time || "",
		cooking: data.recipe.cooking || "",
	});

	let images = $state(data.recipe.images || []);
	let short_name = $state(data.recipe.short_name || "");
	let datecreated = $state(data.recipe.datecreated);
	let datemodified = $state(new Date());
	let isBaseRecipe = $state(data.recipe.isBaseRecipe || false);
	let ingredients = $state(data.recipe.ingredients || []);
	let instructions = $state(data.recipe.instructions || []);

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

	// Get current German recipe data - use $derived to prevent infinite effect loops
	let currentRecipeData = $derived.by(() => {
		// Ensure we always have a valid images array with at least one item
		let recipeImages;
		if (uploaded_image_filename) {
			// New image uploaded
			recipeImages = [{
				mediapath: uploaded_image_filename,
				alt: images[0]?.alt || "",
				caption: images[0]?.caption || ""
			}];
		} else if (images && images.length > 0) {
			// Use existing images
			recipeImages = images;
		} else {
			// No images - use placeholder based on short_name
			recipeImages = [{
				mediapath: `${short_name.trim()}.webp`,
				alt: "",
				caption: ""
			}];
		}

		return {
			...card_data,
			...add_info,
			images: recipeImages,
			season: season_local,
			short_name: short_name.trim(),
			datecreated,
			portions: portions_local,
			datemodified,
			instructions,
			ingredients,
			addendum,
			preamble,
			note,
			isBaseRecipe,
		};
	});

	// Detect which fields have changed from the original
	function detectChangedFields(): string[] {
		const current = currentRecipeData;
		const changed: string[] = [];

		const fieldsToCheck = [
			'name', 'description', 'preamble', 'addendum', 'note',
			'category', 'tags', 'portions', 'preparation', 'cooking',
			'total_time', 'baking', 'fermentation', 'ingredients', 'instructions'
		];

		for (const field of fieldsToCheck) {
			const oldValue = JSON.stringify(originalRecipe[field] || '');
			const newValue = JSON.stringify(current[field] || '');
			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		return changed;
	}

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

		// Only detect changed fields if there's an existing translation
		changedFields = translationData ? detectChangedFields() : [];
		showTranslationWorkflow = true;

		// Scroll to translation section
		setTimeout(() => {
			document.getElementById('translation-section')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	// Force full retranslation of entire recipe
	function forceFullRetranslation() {
		changedFields = [];
		showTranslationWorkflow = true;

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

	// Handle translation skipped - submit without translation update
	async function handleTranslationSkipped() {
		// Mark translation as needing update if fields changed
		if (changedFields.length > 0 && translationData) {
			translationData.translationStatus = 'needs_update';
			translationData.changedFields = changedFields;
		}

		// Wait for Svelte to update the DOM with the updated hidden inputs
		await tick();

		// Submit the form programmatically
		if (formElement) {
			formElement.requestSubmit();
		}
	}

	// Handle translation cancelled
	function handleTranslationCancelled() {
		showTranslationWorkflow = false;
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
		border-radius: 1000px;
		background-color: var(--nord4);
		font-size: 1.1rem;
		transition: 100ms;
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
		transition: 200ms;
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
		transition: 100ms;
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
		.title {
			background-color: var(--nord6-dark);
		}
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
	<title>Rezept bearbeiten - {data.recipe.name}</title>
	<meta name="description" content="Bearbeite das Rezept {data.recipe.name}" />
</svelte:head>

<h1>Rezept bearbeiten</h1>

{#if form?.error}
	<div class="error-message">
		<strong>Fehler:</strong> {form.error}
	</div>
{/if}

<form
	method="POST"
	bind:this={formElement}
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	<!-- Hidden inputs for tracking -->
	<input type="hidden" name="original_short_name" value={old_short_name} />
	<input type="hidden" name="keep_existing_image" value={uploaded_image_filename ? "false" : "true"} />
	<input type="hidden" name="existing_image_path" value={images[0]?.mediapath || `${old_short_name}.webp`} />

	<!-- Hidden inputs for complex nested data -->
	<input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />
	<input type="hidden" name="instructions_json" value={JSON.stringify(instructions)} />
	<input type="hidden" name="add_info_json" value={JSON.stringify(add_info)} />
	<input type="hidden" name="season" value={JSON.stringify(season_local)} />
	<input type="hidden" name="tags" value={JSON.stringify(card_data.tags)} />
	<input type="hidden" name="uploaded_image_filename" value={uploaded_image_filename} />
	<input type="hidden" name="datecreated" value={datecreated?.toString()} />

	<!-- Translation data (updated after approval or marked needs_update) -->
	{#if translationData}
		<input type="hidden" name="translation_json" value={JSON.stringify(translationData)} />
		<input type="hidden" name="translation_metadata_json" value={JSON.stringify({
			lastModifiedGerman: new Date(),
			fieldsModifiedSinceTranslation: changedFields
		})} />
	{/if}

	<CardAdd
		bind:card_data
		bind:image_preview_url
		bind:uploaded_image_filename
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

	<div style="text-align: center; margin: 1rem;">
		<label style="font-size: 1.1rem; cursor: pointer;">
			<input
				type="checkbox"
				name="isBaseRecipe"
				bind:checked={isBaseRecipe}
				style="width: auto; display: inline; margin-right: 0.5em;"
			/>
			Als Basisrezept markieren (kann von anderen Rezepten referenziert werden)
		</label>
	</div>

	<!-- Recipe Note Component -->
	<EditRecipeNote bind:note />
	<input type="hidden" name="note" value={note} />

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
				style="background-color: var(--nord14);"
			>
				<p>Speichern & Übersetzung aktualisieren</p>
				<Check fill="white" width="2rem" height="2rem" />
			</button>
			{#if translationData}
				<button
					type="button"
					class="action_button"
					onclick={forceFullRetranslation}
					disabled={submitting}
					style="background-color: var(--nord12);"
				>
					<p>Komplett neu übersetzen</p>
					<Check fill="white" width="2rem" height="2rem" />
				</button>
			{/if}
		</div>
	{/if}
</form>

{#if showTranslationWorkflow}
	<div id="translation-section">
		<TranslationApproval
			germanData={currentRecipeData}
			englishData={translationData}
			changedFields={changedFields}
			isEditMode={true}
			oldRecipeData={originalRecipe}
			onapproved={handleTranslationApproved}
			onskipped={handleTranslationSkipped}
			oncancelled={handleTranslationCancelled}
			onforceFullRetranslation={forceFullRetranslation}
		/>
	</div>
{/if}

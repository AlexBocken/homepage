<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import SeasonSelect from '$lib/components/recipes/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import EditTitleImgParallax from '$lib/components/recipes/EditTitleImgParallax.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Recipe data state
	let preamble = $state("");
	let addendum = $state("");
	let image_preview_url = $state("");
	let selected_image_file = $state<File | null>(null);

	// Translation workflow state
	let showTranslationWorkflow = $state(false);
	let translationData: any = $state(null);

	// Season ranges (controlled by SeasonSelect via bind:ranges)
	import type { SeasonRange } from '$types/types';
	import { portions } from '$lib/js/portions_store';

	let season_local = $state<SeasonRange[]>([]);

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
	let defaultForm = $state<{ shape: string; diameter?: number; width?: number; length?: number; innerDiameter?: number } | null>(null);
	let ingredients = $state<any[]>([]);
	let instructions = $state<any[]>([]);

	// Form submission state
	let submitting = $state(false);
	let formElement: HTMLFormElement;

	// Prepare German recipe data - use $derived to prevent infinite effect loops
	let germanRecipeData = $derived({
		...card_data,
		...add_info,
		images: selected_image_file ? [{ mediapath: 'pending', alt: "", caption: "" }] : [],
		seasonRanges: season_local,
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

	function validate(): boolean {
		if (!short_name.trim()) {
			toast.error('Bitte geben Sie einen Kurznamen ein');
			return false;
		}
		if (!card_data.name) {
			toast.error('Bitte geben Sie einen Namen ein');
			return false;
		}
		return true;
	}

	// Create directly without an English translation (mirrors /edit's SaveFab).
	async function saveRecipe() {
		if (!validate()) return;
		translationData = null;
		await tick();
		formElement?.requestSubmit();
	}

	// Open the optional translation workflow before submission.
	function openTranslation() {
		if (!validate()) return;
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
			toast.error(form.error);
		}
	});
</script>

<style>
	h3 {
		text-align: center;
		font-size: 1.15rem;
		letter-spacing: 0.02em;
		margin-block: 1.25rem 0.75rem;
		color: var(--color-text-primary);
	}

	/* ===== Below-hero content wrapper: full-width backdrop hides the sticky hero ===== */
	.below-hero {
		--bg-color: var(--color-bg-primary);
		position: relative;
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}
	.below-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100vw;
		background-color: var(--bg-color);
		z-index: -1;
	}

	/* ===== Title-card extras (inside hero card) ===== */
	.section-label {
		font-size: 1.1rem;
		font-weight: 700;
		text-align: center;
		margin-block: 1.25rem 0.5rem;
		color: var(--color-text-primary);
	}
	.season-wrapper {
		margin-block: 0.25rem 0.75rem;
	}
	.preamble {
		margin: 0.5rem 0 0.25rem;
		padding: 1em 1.25em;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: 1rem;
		min-height: 3em;
		outline: none;
		transition: border-color 200ms ease;
	}
	.preamble:focus,
	.preamble:hover {
		border-color: var(--color-primary);
	}
	.preamble:empty::before {
		content: attr(data-placeholder);
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	/* ===== Meta row under the hero: URL + base-recipe toggle ===== */
	.meta-row {
		display: flex;
		gap: 1.5rem 2rem;
		align-items: flex-end;
		justify-content: center;
		flex-wrap: wrap;
		margin-block: 0.5rem 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.url-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
		font-weight: 700;
	}
	.url-field input {
		display: block;
		border: 1px solid var(--color-border);
		margin: 0;
		padding: 0.55em 1.1em;
		border-radius: var(--radius-pill);
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: 0;
		text-transform: none;
		min-width: 16rem;
		transition: var(--transition-fast);
	}
	.url-field input:hover,
	.url-field input:focus-visible {
		border-color: var(--color-primary);
		outline: none;
	}
	.toggle-field {
		align-self: center;
	}

	/* ===== Ingredients + Instructions two-col ===== */
	.list_wrapper {
		margin-inline: auto;
		display: flex;
		flex-direction: row;
		max-width: 1000px;
		gap: 2rem;
		justify-content: center;
		margin-block: 2.5rem;
	}
	@media screen and (max-width: 700px) {
		.list_wrapper {
			flex-direction: column;
			gap: 1rem;
		}
	}

	/* ===== Addendum ===== */
	.addendum_wrapper {
		max-width: 1000px;
		margin: 2.5rem auto;
	}
	.addendum {
		font-size: 1.05rem;
		max-width: min(720px, 100%);
		margin-inline: auto;
		padding: 1em 1.25em;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		min-height: 3em;
		outline: none;
		transition: border-color 200ms ease;
	}
	.addendum:hover,
	.addendum:focus-visible {
		border-color: var(--color-primary);
	}
	.addendum:empty::before {
		content: attr(data-placeholder);
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	/* ===== Form-size / Backform ===== */
	.form-size-section {
		max-width: 600px;
		margin: 2rem auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.form-size-head {
		padding: 0.75rem 1rem;
	}
	.form-size-title {
		font-weight: 600;
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}
	.form-size-body {
		padding: 0.25rem 1rem 1rem;
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.form-shape-row {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}
	.form-shape-row .shape-tile {
		flex: 1 1 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0;
		background: var(--color-bg-tertiary);
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		color: var(--color-text-secondary);
		transition: all 150ms ease;
	}
	.form-shape-row .shape-tile:hover,
	.form-shape-row .shape-tile:focus-visible {
		border-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-border));
		color: var(--color-text-primary);
		outline: none;
	}
	.form-shape-row .shape-tile[aria-checked="true"] {
		border-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 10%, var(--color-bg-tertiary));
		color: var(--color-primary);
	}
	.form-shape-row .shape-tile svg {
		width: 1.25rem;
		height: 1.25rem;
	}
	.form-size-inputs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
	}
	.form-size-inputs .input-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.form-size-inputs .input-label {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
	}
	.form-size-inputs .input-box {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.form-size-inputs .input-box:focus-within {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.form-size-inputs .input-box input {
		flex: 1;
		width: 100%;
		padding: 0.55rem 2.25rem 0.55rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font: inherit;
		font-size: 1rem;
		outline: none;
	}
	.form-size-inputs .input-box input::-webkit-outer-spin-button,
	.form-size-inputs .input-box input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.form-size-inputs .input-box input[type="number"] {
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.form-size-inputs .input-suffix {
		position: absolute;
		right: 0.75rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
		pointer-events: none;
		letter-spacing: 0.02em;
	}
	@media (max-width: 560px) {
		.form-size-head { padding: 0.65rem 0.75rem; }
		.form-size-body { padding: 0.25rem 0.75rem 0.85rem; }
		.form-shape-row .shape-tile { height: 2rem; }
		.form-shape-row .shape-tile svg { width: 1.1rem; height: 1.1rem; }
		.form-size-inputs { grid-template-columns: 1fr 1fr; }
	}

	/* ===== Translation trigger ===== */
	.translation-section-trigger {
		max-width: 1000px;
		margin: 2.5rem auto;
		text-align: center;
	}
	.section-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}
	.section-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--radius-pill);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all var(--transition-fast);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.section-btn:hover {
		opacity: 0.85;
	}
	.section-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		background: var(--red);
		color: white;
		padding: 1rem;
		border-radius: var(--radius-md);
		margin: 1rem auto;
		max-width: 800px;
		text-align: center;
	}
</style>

<svelte:head>
	<title>Rezept erstellen</title>
	<meta name="description" content="Hier können neue Rezepte hinzugefügt werden" />
</svelte:head>

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
	<input type="hidden" name="seasonRanges" value={JSON.stringify(season_local)} />
	<input type="hidden" name="tags" value={JSON.stringify(card_data.tags)} />

	<!-- Translation data (added after approval) -->
	{#if translationData}
		<input type="hidden" name="translation_json" value={JSON.stringify(translationData)} />
		<input type="hidden" name="translation_metadata_json" value={JSON.stringify({
			lastModifiedGerman: new Date(),
			fieldsModifiedSinceTranslation: []
		})} />
	{/if}

	<!-- Hidden inputs for card data -->
	<input type="hidden" name="name" value={card_data.name} />
	<input type="hidden" name="description" value={card_data.description} />
	<input type="hidden" name="category" value={card_data.category} />
	<input type="hidden" name="icon" value={card_data.icon} />
	<input type="hidden" name="portions" value={portions_local} />
	<input type="hidden" name="isBaseRecipe" value={isBaseRecipe ? "true" : "false"} />
	<input type="hidden" name="defaultForm_json" value={defaultForm ? JSON.stringify(defaultForm) : ''} />
	<input type="hidden" name="preamble" value={preamble} />

	<EditTitleImgParallax
		bind:card_data
		bind:image_preview_url
		bind:selected_image_file
	>
		{#snippet titleExtras()}
			<h2 class="section-label">Saison</h2>
			<div class="season-wrapper">
				<SeasonSelect bind:ranges={season_local} />
			</div>

			<h2 class="section-label">Einleitung</h2>
			<p
				class="preamble"
				contenteditable="plaintext-only"
				bind:innerText={preamble}
				data-placeholder="Eine etwas längere Einleitung für dieses Rezept…"
				aria-label="Einleitung"
			></p>
		{/snippet}

		<div class="below-hero">
			<div class="meta-row">
				<label class="url-field">
					<span>URL-Kurzname</span>
					<input name="short_name" bind:value={short_name} placeholder="Kurzname" required />
				</label>
				<div class="toggle-field">
					<Toggle bind:checked={isBaseRecipe} label="Als Basisrezept markieren" />
				</div>
			</div>

			<div class="form-size-section">
				<div class="form-size-head">
					<span class="form-size-title">Backform (Standard)</span>
				</div>
				<div class="form-size-body">
					<div class="form-shape-row" role="radiogroup" aria-label="Backform">
						<button
							type="button"
							role="radio"
							aria-checked={!defaultForm}
							aria-label="Keine"
							title="Keine"
							class="shape-tile"
							onclick={() => { defaultForm = null; }}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true">
								<circle cx="12" cy="12" r="8.5"/>
								<path d="m6 6 12 12"/>
							</svg>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={defaultForm?.shape === 'round'}
							aria-label="Rund"
							title="Rund"
							class="shape-tile"
							onclick={() => { defaultForm = { shape: 'round', diameter: defaultForm?.diameter || 26 }; }}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
								<circle cx="12" cy="12" r="8.5"/>
							</svg>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={defaultForm?.shape === 'rectangular'}
							aria-label="Rechteckig"
							title="Rechteckig"
							class="shape-tile"
							onclick={() => { defaultForm = { shape: 'rectangular', width: defaultForm?.width || 20, length: defaultForm?.length || 30 }; }}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
								<rect x="3" y="6" width="18" height="12" rx="1.5"/>
							</svg>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={defaultForm?.shape === 'gugelhupf'}
							aria-label="Gugelhupf"
							title="Gugelhupf"
							class="shape-tile"
							onclick={() => { defaultForm = { shape: 'gugelhupf', diameter: defaultForm?.diameter || 24, innerDiameter: defaultForm?.innerDiameter || 8 }; }}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
								<circle cx="12" cy="12" r="8.5"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						</button>
					</div>

					{#if defaultForm?.shape === 'round'}
						<div class="form-size-inputs">
							<label class="input-wrap">
								<span class="input-label">Durchmesser</span>
								<span class="input-box">
									<input type="number" min="1" step="1" bind:value={defaultForm.diameter} />
									<span class="input-suffix">cm</span>
								</span>
							</label>
						</div>
					{:else if defaultForm?.shape === 'rectangular'}
						<div class="form-size-inputs">
							<label class="input-wrap">
								<span class="input-label">Breite</span>
								<span class="input-box">
									<input type="number" min="1" step="1" bind:value={defaultForm.width} />
									<span class="input-suffix">cm</span>
								</span>
							</label>
							<label class="input-wrap">
								<span class="input-label">Länge</span>
								<span class="input-box">
									<input type="number" min="1" step="1" bind:value={defaultForm.length} />
									<span class="input-suffix">cm</span>
								</span>
							</label>
						</div>
					{:else if defaultForm?.shape === 'gugelhupf'}
						<div class="form-size-inputs">
							<label class="input-wrap">
								<span class="input-label">Aussen-Ø</span>
								<span class="input-box">
									<input type="number" min="1" step="1" bind:value={defaultForm.diameter} />
									<span class="input-suffix">cm</span>
								</span>
							</label>
							<label class="input-wrap">
								<span class="input-label">Innen-Ø</span>
								<span class="input-box">
									<input type="number" min="1" step="1" bind:value={defaultForm.innerDiameter} />
									<span class="input-suffix">cm</span>
								</span>
							</label>
						</div>
					{/if}
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
				<h3>Nachtrag</h3>
				<div
					class="addendum"
					contenteditable="plaintext-only"
					bind:innerText={addendum}
					data-placeholder="Optionaler Nachtrag…"
					aria-label="Nachtrag"
				></div>
				<input type="hidden" name="addendum" value={addendum} />
			</div>

			{#if !showTranslationWorkflow}
				<div class="translation-section-trigger">
					<h3>Übersetzung</h3>
					<div class="section-actions">
						<button type="button" class="section-btn" onclick={openTranslation} disabled={submitting}>
							Übersetzen & erstellen
						</button>
					</div>
				</div>
			{/if}
		</div>
	</EditTitleImgParallax>
</form>

<SaveFab type="button" onclick={saveRecipe} disabled={submitting} label="Rezept erstellen" />

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

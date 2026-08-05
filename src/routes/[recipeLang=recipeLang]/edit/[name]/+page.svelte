<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick, untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/recipes/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import GenerateAltTextButton from '$lib/components/recipes/GenerateAltTextButton.svelte';
	import EditRecipeNote from '$lib/components/recipes/EditRecipeNote.svelte';
	import EditTitleImgParallax from '$lib/components/recipes/EditTitleImgParallax.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import NutritionMapper from '$lib/components/recipes/NutritionMapper.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import type { SeasonRange } from '$types/types';
	import { portions } from '$lib/js/portions_store';
	import '$lib/css/action_button.css';
	import { toast } from '$lib/js/toast.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Recipe data state — all form fields initialized from server data (intentionally local mutable state)
	// svelte-ignore state_referenced_locally
	let preamble = $state(data.recipe.preamble || "");
	// svelte-ignore state_referenced_locally
	let addendum = $state(data.recipe.addendum || "");
	// svelte-ignore state_referenced_locally
	let note = $state(data.recipe.note || "");
	// svelte-ignore state_referenced_locally
	let image_preview_url = $state(
		"https://bocken.org/static/rezepte/thumb/" +
			(data.recipe.images?.[0]?.mediapath || `${data.recipe.short_name}.webp`)
	);
	let selected_image_file = $state<File | null>(null);

	// Translation workflow state
	let showTranslationWorkflow = $state(false);
	// svelte-ignore state_referenced_locally
	let translationData = $state<any>(data.recipe.translations?.en || null);
	let translationPanel = $state<any>(null);

	// Store original recipe data for change detection
	// svelte-ignore state_referenced_locally
	const originalRecipe = JSON.parse(JSON.stringify(data.recipe));
	// svelte-ignore state_referenced_locally
	const old_short_name = data.recipe.short_name;

	// Season and portions stores
	// svelte-ignore state_referenced_locally
	portions.update(() => data.recipe.portions || "");
	// svelte-ignore state_referenced_locally
	let portions_local = $state<string>(data.recipe.portions || "");
	$effect(() => {
		portions.subscribe((p) => {
			portions_local = p;
		});
	});

	// svelte-ignore state_referenced_locally
	let season_local = $state<SeasonRange[]>(data.recipe.seasonRanges || []);

	// svelte-ignore state_referenced_locally
	let card_data = $state({
		icon: data.recipe.icon || "",
		category: data.recipe.category || "",
		name: data.recipe.name || "",
		description: data.recipe.description || "",
		tags: data.recipe.tags || [],
	});

	// svelte-ignore state_referenced_locally
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

	// svelte-ignore state_referenced_locally
	let images = $state(data.recipe.images || []);
	// German alt text for the hero image. Held separately from `images` so the field
	// still has somewhere to write when the recipe has no image row yet.
	// svelte-ignore state_referenced_locally
	let imageAlt = $state(data.recipe.images?.[0]?.alt || "");
	// svelte-ignore state_referenced_locally
	let short_name = $state(data.recipe.short_name || "");
	// svelte-ignore state_referenced_locally
	let datecreated = $state(data.recipe.datecreated);
	let datemodified = $state(new Date());
	// svelte-ignore state_referenced_locally
	let isBaseRecipe = $state(data.recipe.isBaseRecipe || false);
	// svelte-ignore state_referenced_locally
	let defaultForm = $state(data.recipe.defaultForm ? { ...data.recipe.defaultForm } : null);
	// svelte-ignore state_referenced_locally
	let ingredients = $state(data.recipe.ingredients || []);
	// svelte-ignore state_referenced_locally
	let instructions = $state(data.recipe.instructions || []);

	// Form submission state
	let submitting = $state(false);
	let formElement: HTMLFormElement;

	// Get current German recipe data - use $derived to prevent infinite effect loops
	let currentRecipeData = $derived.by(() => {
		// Ensure we always have a valid images array with at least one item
		let recipeImages;
		if (selected_image_file) {
			// New image selected (will be uploaded on form submission)
			recipeImages = [{
				mediapath: 'pending',
				alt: imageAlt,
				caption: images[0]?.caption || ""
			}];
		} else if (images && images.length > 0) {
			// Use existing images, with the edited alt text applied to the hero
			recipeImages = images.map((img: { alt?: string }, i: number) =>
				i === 0 ? { ...img, alt: imageAlt } : img
			);
		} else {
			// No images - use placeholder based on short_name
			recipeImages = [{
				mediapath: `${short_name.trim()}.webp`,
				alt: imageAlt,
				caption: ""
			}];
		}

		return {
			...card_data,
			...add_info,
			images: recipeImages,
			seasonRanges: season_local,
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
			defaultForm,
		};
	});

	/**
	 * Empty string, empty array and an all-empty object all mean "not set".
	 * The form normalises absent groups into fully-keyed objects — a recipe with no
	 * baking step still gets `{length:'',temperature:'',mode:''}` — so comparing raw
	 * values reported `baking` and `fermentation` as changed on every recipe that has
	 * neither, and sent them to be re-translated for nothing. Keys are sorted and
	 * Mongo's `_id` dropped so ordering and subdocument ids don't register as edits.
	 */
	function normalizeForCompare(value: unknown): unknown {
		if (value === null || value === undefined) return '';
		if (typeof value === 'string') return value.trim();
		if (Array.isArray(value)) {
			const items = value.map(normalizeForCompare);
			return items.length ? items : '';
		}
		if (typeof value === 'object') {
			const entries = Object.entries(value as Record<string, unknown>)
				.filter(([key]) => key !== '_id')
				.map(([key, v]) => [key, normalizeForCompare(v)] as const)
				.filter(([, v]) => v !== '')
				.sort(([a], [b]) => (a < b ? -1 : 1));
			return entries.length ? Object.fromEntries(entries) : '';
		}
		return value;
	}

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
			const oldValue = JSON.stringify(
				normalizeForCompare((originalRecipe as Record<string, any>)[field])
			);
			const newValue = JSON.stringify(
				normalizeForCompare((current as Record<string, any>)[field])
			);
			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		return changed;
	}

	/**
	 * Which German fields moved since load. Must be reactive, not computed on demand:
	 * the panel renders as soon as a translation exists, so the only code that used to
	 * populate this (openTranslation) never ran for an already-translated recipe. It
	 * stayed `[]`, and an empty list is the signal for "translate the whole recipe" —
	 * which is why delta translation effectively never happened.
	 */
	let changedFields = $derived(translationData ? detectChangedFields() : []);

	// Save recipe directly (no translation workflow)
	async function saveRecipe() {
		if (!short_name.trim()) {
			toast.error('Bitte einen Kurznamen eingeben');
			return;
		}
		if (!card_data.name) {
			toast.error('Bitte einen Namen eingeben');
			return;
		}

		// The panel has no Approve button any more — saving is what approves. Only a
		// translation that was actually produced or edited counts; an untouched one
		// falls through to the needs_update path below.
		if (translationPanel?.hasPendingApproval()) {
			if (!translationPanel.approve()) {
				toast.error('Übersetzung unvollständig — bitte die markierten Felder ergänzen');
				return;
			}
			// approve() fires onapproved, which submits the form itself.
			return;
		}

		// Mark translation as needing update if fields changed
		if (translationData) {
			const changed = detectChangedFields();
			if (changed.length > 0) {
				translationData.translationStatus = 'needs_update';
				translationData.changedFields = changed;
			}
		}
		await tick();
		formElement.requestSubmit();
	}

	// Open translation workflow (optional)
	function openTranslation() {
		if (!short_name.trim()) {
			toast.error('Bitte einen Kurznamen eingeben');
			return;
		}
		if (!card_data.name) {
			toast.error('Bitte einen Namen eingeben');
			return;
		}
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

	// Nutrition mappings live in NutritionMapper, which posts them through the
	// form's hidden inputs. Only the state itself stays here, because the form
	// action reads it back out of the same page data on save.
	let nutritionMappings = $state<any[]>(data.recipe.nutritionMappings || []);

	// Display form errors if any
	$effect(() => {
		if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<style>
	/* ===== Below-hero content wrapper mirrors viewer's .wrapper_wrapper trick:
	   a full-width backdrop behind the editor content hides the sticky hero image. */
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

	h3 {
		text-align: center;
		font-size: 1.15rem;
		letter-spacing: 0.02em;
		margin-block: 1.25rem 0.75rem;
		color: var(--color-text-primary);
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
	.alt-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
		justify-content: center;
		flex-wrap: wrap;
		margin-block: 0 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border);
	}
	.alt-field input {
		min-width: min(32rem, 100%);
	}
	.alt-count {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
		padding-bottom: 0.7em;
		font-variant-numeric: tabular-nums;
	}
	.alt-count.over {
		color: var(--red);
	}
	.toggle-field {
		align-self: center;
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
	.note-slot {
		margin-top: 1.5rem;
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
		outline: none;
		transition: border-color 200ms ease;
	}
	.addendum:hover,
	.addendum:focus-visible {
		border-color: var(--color-primary);
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

	.error-message {
		background: var(--red);
		color: white;
		padding: 1rem;
		border-radius: var(--radius-md);
		margin: 1rem auto;
		max-width: 800px;
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
	.translation-section-trigger {
		max-width: 1000px;
		margin: 2.5rem auto;
		text-align: center;
	}
</style>

<svelte:head>
	<title>Rezept bearbeiten - {data.recipe.name}</title>
	<meta name="description" content="Bearbeite das Rezept {data.recipe.name}" />
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
	<!-- Hidden inputs for tracking -->
	<input type="hidden" name="original_short_name" value={old_short_name} />
	<input type="hidden" name="keep_existing_image" value={selected_image_file ? "false" : "true"} />
	<input type="hidden" name="existing_image_path" value={images[0]?.mediapath || `${old_short_name}.webp`} />

	<!-- Hidden inputs for complex nested data -->
	<!-- Without images_json the extractor sees no images at all, and the action's
	     `recipeData.images?.[0]?.alt || ''` fallback blanked the alt text on save. -->
	<input type="hidden" name="images_json" value={JSON.stringify(currentRecipeData.images)} />
	<input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />
	<input type="hidden" name="instructions_json" value={JSON.stringify(instructions)} />
	<input type="hidden" name="add_info_json" value={JSON.stringify(add_info)} />
	<input type="hidden" name="seasonRanges" value={JSON.stringify(season_local)} />
	<input type="hidden" name="tags" value={JSON.stringify(card_data.tags)} />
	<input type="hidden" name="datecreated" value={datecreated?.toString()} />

	<!-- Translation data (updated after approval or marked needs_update) -->
	{#if translationData}
		<input type="hidden" name="translation_json" value={JSON.stringify(translationData)} />
		<input type="hidden" name="translation_metadata_json" value={JSON.stringify({
			lastModifiedGerman: new Date(),
			fieldsModifiedSinceTranslation: changedFields
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
	<input type="hidden" name="note" value={note} />

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

			<div class="note-slot">
				<EditRecipeNote bind:note />
			</div>
		{/snippet}

		<div class="below-hero">
			<div class="meta-row">
				<label class="url-field">
					<span>URL-Kurzname</span>
					<input
						name="short_name"
						bind:value={short_name}
						placeholder="Kurzname"
						required
					/>
				</label>
				<div class="toggle-field">
					<Toggle
						bind:checked={isBaseRecipe}
						label="Als Basisrezept markieren"
					/>
				</div>
			</div>

			<div class="alt-row">
				<label class="url-field alt-field">
					<span>Bildbeschreibung (Alt-Text)</span>
					<input
						bind:value={imageAlt}
						maxlength="125"
						aria-label="Bildbeschreibung"
						placeholder="Was auf dem Bild zu sehen ist — für Screenreader"
					/>
				</label>
				<span class="alt-count" class:over={imageAlt.length > 125}>
					{imageAlt.length}/125
				</span>
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
		<h3>Nachtrag:</h3>
		<div class="addendum" bind:innerText={addendum} contenteditable></div>
		<input type="hidden" name="addendum" value={addendum} />
	</div>

	<NutritionMapper
		bind:mappings={nutritionMappings}
		{ingredients}
		shortName={short_name}
		referencedNutrition={data.recipe.referencedNutrition || []}
	/>

	{#if !translationData && !showTranslationWorkflow}
		<div class="translation-section-trigger">
			<h3>Übersetzung</h3>
			<div class="section-actions">
				<button type="button" class="section-btn" onclick={openTranslation} disabled={submitting}>
					Übersetzen
				</button>
			</div>
		</div>
	{/if}
		</div>
	</EditTitleImgParallax>
</form>

{#if translationData || showTranslationWorkflow}
	<div id="translation-section">
		<TranslationApproval
			bind:this={translationPanel}
			germanData={currentRecipeData}
			englishData={translationData}
			changedFields={changedFields}
			isEditMode={true}
			oldRecipeData={originalRecipe}
			onapproved={handleTranslationApproved}
			onskipped={handleTranslationSkipped}
			oncancelled={handleTranslationCancelled}
		/>
	</div>
{/if}

<SaveFab type="button" onclick={saveRecipe} disabled={submitting} label="Rezept speichern" />

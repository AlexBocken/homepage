<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import GenerateAltTextButton from '$lib/components/recipes/GenerateAltTextButton.svelte';
	import EditRecipeNote from '$lib/components/recipes/EditRecipeNote.svelte';
	import RecipeForm from '$lib/components/recipes/RecipeForm.svelte';
	import NutritionMapper from '$lib/components/recipes/NutritionMapper.svelte';
	import type { SeasonRange } from '$types/types';
	import '$lib/css/action_button.css';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/js/recipesI18n';
	import Trash2 from '@lucide/svelte/icons/trash-2';

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

	// svelte-ignore state_referenced_locally
	let portions_local = $state<string>(data.recipe.portions || "");

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

	// Recipes that use this one as a base; deleting it copies its content into them.
	const referencedBy = $derived(data.referencedBy ?? []);
	let deleting = $state(false);

	async function deleteRecipe() {
		const names = referencedBy.map((r) => `„${r.name}“`).join(', ');
		const message = referencedBy.length
			? `„${data.recipe.name}“ ist Basisrezept für ${names}. Sein Inhalt wird dort übernommen, dann werden Rezept und Bild endgültig gelöscht.`
			: `„${data.recipe.name}“ und sein Bild werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.`;
		const ok = await confirm(message, {
			title: m.de.delete_recipe_confirm,
			confirmText: 'Löschen',
			cancelText: 'Abbrechen',
			destructive: true
		});
		if (!ok) return;
		deleting = true;
		const res = await fetch('/api/rezepte/delete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ old_short_name })
		});
		if (!res.ok) {
			deleting = false;
			const body = await res.json().catch(() => null);
			toast.error(`Löschen fehlgeschlagen${body?.message ? `: ${body.message}` : ''}`);
			return;
		}
		toast.success(`„${data.recipe.name}“ gelöscht`);
		await goto(resolve('/[recipeLang=recipeLang]', { recipeLang: 'rezepte' }), { invalidateAll: true });
	}
	let formElement = $state<HTMLFormElement>();

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
		formElement?.requestSubmit();
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
	// svelte-ignore state_referenced_locally
	let nutritionMappings = $state<any[]>(data.recipe.nutritionMappings || []);
	// svelte-ignore state_referenced_locally
	let finalWeight = $state<any>(data.recipe.finalWeight ?? { mode: 'auto' });

	// Display form errors if any
	$effect(() => {
		if (form?.error) {
			toast.error(form.error);
		}
	});
</script>

<style>
	.image-card {
		max-width: min(44rem, 100%);
		margin: 0 auto 2rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.image-card-row {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}
	.image-card-row img {
		width: 96px;
		height: 96px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}
	.image-card-body {
		flex: 1;
		min-width: 0;
	}
	.alt-label {
		display: block;
		margin-bottom: 0.3rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-tertiary);
	}
	.alt-field input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font: inherit;
		font-size: 0.95rem;
		transition: border-color 150ms ease, box-shadow 150ms ease;
	}
	.alt-field input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
	}
	.alt-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 0.6rem;
	}
	@media (max-width: 560px) {
		.image-card-row { flex-direction: column; }
		.image-card-row img { width: 100%; height: 140px; }
	}
	.alt-count {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}
	.alt-count.over {
		color: var(--red);
	}
	.note-slot {
		margin-top: 1.5rem;
	}

	.danger-zone {
		max-width: min(720px, calc(100% - 2rem));
		margin: 3rem auto 7rem;
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.danger-text h2 {
		margin: 0 0 0.25rem;
		font-size: var(--text-base);
	}
	.danger-text p {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.delete-button {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1.1rem;
		border: 1px solid var(--red);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--red);
		font: inherit;
		cursor: pointer;
		transition: background-color var(--transition-fast), color var(--transition-fast);
	}
	.delete-button:hover:not(:disabled),
	.delete-button:focus-visible {
		background: var(--red);
		color: var(--color-text-on-accent);
	}
	.delete-button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	@media (max-width: 560px) {
		.danger-zone {
			flex-direction: column;
			align-items: stretch;
		}
		.delete-button {
			justify-content: center;
		}
	}
</style>

<svelte:head>
	<title>Rezept bearbeiten - {data.recipe.name}</title>
	<meta name="description" content="Bearbeite das Rezept {data.recipe.name}" />
</svelte:head>

<RecipeForm
	error={form?.error}
	bind:formElement
	bind:submitting
	bind:card_data
	bind:image_preview_url
	bind:selected_image_file
	bind:season_local
	bind:preamble
	bind:short_name
	bind:isBaseRecipe
	bind:defaultForm
	bind:ingredients
	bind:instructions
	bind:portions_local
	bind:add_info
	bind:addendum
	showTranslationTrigger={!translationData && !showTranslationWorkflow}
	translateLabel="Übersetzen"
	onTranslate={openTranslation}
>
	{#snippet hiddenFields()}
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
	{/snippet}

	{#snippet cardExtras()}
		<div class="note-slot">
			<EditRecipeNote bind:note />
		</div>
	{/snippet}

	{#snippet beforeFormSize()}
		<!-- The picture beside the words describing it: judging an alt text
		     without seeing the image is guesswork, and the translation panel
		     has shown it this way all along. -->
		<div class="image-card">
			<div class="image-card-row">
				<img src={image_preview_url} alt={imageAlt || 'Rezeptbild'} />
				<div class="image-card-body">
					<label class="alt-field">
						<span class="alt-label">Bildbeschreibung (Alt-Text)</span>
						<input
							bind:value={imageAlt}
							maxlength="125"
							aria-label="Bildbeschreibung"
							placeholder="Was auf dem Bild zu sehen ist — für Screenreader"
						/>
					</label>
					<div class="alt-foot">
						<GenerateAltTextButton
							shortName={old_short_name}
							imageIndex={0}
							onGenerated={(alt) => (imageAlt = alt.de)}
						/>
						<span class="alt-count" class:over={imageAlt.length > 125}>
							{imageAlt.length}/125
						</span>
					</div>
				</div>
			</div>
		</div>
	{/snippet}

	{#snippet afterAddendum()}
		<NutritionMapper
			bind:mappings={nutritionMappings}
			bind:finalWeight
			{ingredients}
			shortName={short_name}
			referencedNutrition={data.recipe.referencedNutrition || []}
		/>
	{/snippet}
</RecipeForm>

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

<!-- Last on the page and far from the save button, so it takes a deliberate
     scroll and a confirmation to reach. -->
<section class="danger-zone" aria-labelledby="delete-recipe-title">
	<div class="danger-text">
		<h2 id="delete-recipe-title">Rezept löschen</h2>
		<p>
			Entfernt das Rezept samt Bild und aus allen Favoriten.
			{#if referencedBy.length}
				Es ist Basisrezept für {referencedBy.length === 1 ? 'ein anderes Rezept' : `${referencedBy.length} andere Rezepte`};
				sein Inhalt wird dort übernommen.
			{/if}
		</p>
	</div>
	<button type="button" class="delete-button" onclick={deleteRecipe} disabled={deleting || submitting}>
		<Trash2 size={18} aria-hidden="true" />
		{deleting ? 'Wird gelöscht…' : 'Löschen'}
	</button>
</section>

<SaveFab type="button" onclick={saveRecipe} disabled={submitting} label="Rezept speichern" />

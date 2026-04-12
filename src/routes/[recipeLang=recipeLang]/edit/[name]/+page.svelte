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
	import Toggle from '$lib/components/Toggle.svelte';
	import { season } from '$lib/js/season_store';
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
	let changedFields = $state<string[]>([]);

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
	season.update(() => data.recipe.season || []);
	// svelte-ignore state_referenced_locally
	let season_local = $state<number[]>(data.recipe.season || []);
	$effect(() => {
		season.subscribe((s) => {
			season_local = s;
		});
	});

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
		if (selected_image_file) {
			// New image selected (will be uploaded on form submission)
			recipeImages = [{
				mediapath: 'pending',
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
			defaultForm,
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
			const oldValue = JSON.stringify((originalRecipe as Record<string, any>)[field] || '');
			const newValue = JSON.stringify((current as Record<string, any>)[field] || '');
			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		return changed;
	}

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
		changedFields = translationData ? detectChangedFields() : [];
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

	// Nutrition state — all edits are local until form save
	// svelte-ignore state_referenced_locally
	let nutritionMappings = $state<any[]>(data.recipe.nutritionMappings || []);
	let generatingNutrition = $state(false);
	let searchQueries = $state<Record<string, string>>({});
	let searchResults = $state<Record<string, { source: 'bls' | 'usda'; id: string; name: string; category: string; calories: number }[]>>({});
	let searchTimers = $state<Record<string, ReturnType<typeof setTimeout>>>({});
	let globalToggle = $state<Record<string, boolean>>({});

	function mappingKey(m: any) {
		return `${m.sectionIndex}-${m.ingredientIndex}`;
	}

	// Global overwrites loaded from DB — used to init toggle state
	let globalOverwriteNames = $state<Set<string>>(new Set());

	async function loadGlobalOverwrites() {
		try {
			const res = await fetch('/api/nutrition/overwrites');
			if (res.ok) {
				const overwrites: any[] = await res.json();
				globalOverwriteNames = new Set(overwrites.map((o: any) => o.ingredientNameDe));
			}
		} catch { /* ignore */ }
	}

	// Ensure globalToggle entries exist for all mappings, init from DB overwrites
	function initGlobalToggles() {
		for (const m of nutritionMappings) {
			const key = mappingKey(m);
			if (!(key in globalToggle)) {
				const deName = (m.ingredientNameDe || m.ingredientName || '').toLowerCase().trim();
				globalToggle[key] = globalOverwriteNames.has(deName);
			}
		}
	}

	// Pre-init all toggles to false (prevents bind:checked={undefined}), then load real state
	initGlobalToggles();
	if (untrack(() => nutritionMappings).length > 0) {
		loadGlobalOverwrites().then(() => {
			// Re-init with real overwrite data (overwrite the false defaults)
			for (const m of nutritionMappings) {
				const key = mappingKey(m);
				const deName = (m.ingredientNameDe || m.ingredientName || '').toLowerCase().trim();
				globalToggle[key] = globalOverwriteNames.has(deName);
			}
		});
	}

	async function generateNutrition() {
		generatingNutrition = true;
		try {
			const res = await fetch(`/api/rezepte/nutrition/generate/${encodeURIComponent(short_name.trim())}?preview=true`, { method: 'POST' });
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: res.statusText }));
				throw new Error(err.message || `HTTP ${res.status}`);
			}
			const result = await res.json();
			// Merge: keep local manual edits, use auto for the rest
			const manualMap = new Map(
				nutritionMappings
					.filter((m: any) => m.manuallyEdited)
					.map((m: any) => [mappingKey(m), m])
			);
			nutritionMappings = result.mappings.map((m: any) => {
				const key = mappingKey(m);
				return manualMap.get(key) || m;
			});
			await loadGlobalOverwrites();
			initGlobalToggles();
			const mapped = nutritionMappings.filter((m: any) => m.matchMethod !== 'none' || m.recipeRef).length;
			toast.success(`Nährwerte generiert: ${mapped}/${result.count} Zutaten zugeordnet`);
		} catch (e: any) {
			toast.error(`Fehler: ${e.message}`);
		} finally {
			generatingNutrition = false;
		}
	}

	function handleSearchInput(key: string, value: string) {
		searchQueries[key] = value;
		if (searchTimers[key]) clearTimeout(searchTimers[key]);
		if (value.length < 2) {
			searchResults[key] = [];
			return;
		}
		searchTimers[key] = setTimeout(async () => {
			try {
				const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(value)}`);
				if (res.ok) searchResults[key] = await res.json();
			} catch { /* ignore */ }
		}, 250);
	}

	function assignNutritionEntry(mapping: any, entry: { source: 'bls' | 'usda'; id: string; name: string }) {
		const key = mappingKey(mapping);
		if (entry.source === 'bls') {
			mapping.blsCode = entry.id;
			mapping.source = 'bls';
		} else {
			mapping.fdcId = parseInt(entry.id);
			mapping.source = 'usda';
		}
		mapping.nutritionDbName = entry.name;
		mapping.matchMethod = 'manual';
		mapping.matchConfidence = 1;
		mapping.excluded = false;
		mapping.manuallyEdited = true;
		searchResults[key] = [];
		searchQueries[key] = '';
		const isGlobal = globalToggle[key] || false;
		toast.success(`${mapping.ingredientNameDe} → ${entry.name}${isGlobal ? ' (global)' : ''}`);
	}

	function skipIngredient(mapping: any) {
		const key = mappingKey(mapping);
		mapping.excluded = true;
		mapping.matchMethod = 'manual';
		mapping.manuallyEdited = true;
		searchResults[key] = [];
		searchQueries[key] = '';
		const isGlobal = globalToggle[key] || false;
		toast.success(`${mapping.ingredientNameDe} übersprungen${isGlobal ? ' (global)' : ''}`);
	}

	async function revertToAuto(mapping: any) {
		mapping.manuallyEdited = false;
		mapping.excluded = false;
		await generateNutrition();
	}

	function getGlobalOverwrites() {
		return nutritionMappings
			.filter((m: any) => globalToggle[mappingKey(m)])
			.map((m: any) => ({
				ingredientNameDe: (m.ingredientNameDe || m.ingredientName).toLowerCase().trim(),
				ingredientNameEn: m.ingredientName,
				source: m.excluded ? 'skip' : (m.source || 'usda'),
				fdcId: m.fdcId,
				blsCode: m.blsCode,
				nutritionDbName: m.nutritionDbName,
				excluded: m.excluded || false,
			}));
	}

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

	/* ===== Nutrition ===== */
	.nutrition-section {
		max-width: 1000px;
		margin: 2.5rem auto;
	}
	.nutrition-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.nutrition-header h3 {
		margin: 0;
	}
	.regenerate-btn {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-pill);
		padding: 0.45rem 1.1rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: opacity var(--transition-fast);
	}
	.regenerate-btn:hover {
		opacity: 0.85;
	}
	.regenerate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.nutrition-table-wrapper {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1rem;
	}
	.nutrition-result-summary {
		margin: 0 0 0.75rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.nutrition-result-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}
	.nutrition-result-table th,
	.nutrition-result-table td {
		text-align: left;
		padding: 0.55rem 0.6rem;
		border-bottom: 1px solid var(--color-border);
		vertical-align: top;
	}
	.nutrition-result-table th {
		color: var(--color-text-secondary);
		font-weight: 700;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.unmapped-row { opacity: 0.55; }
	.manual-row { border-left: 3px solid var(--orange); }
	.recipe-ref-row { border-left: 3px solid var(--blue); }
	.excluded-row { opacity: 0.45; }
	.excluded-row .name-td,
	.excluded-row .src-td { text-decoration: line-through; }

	.search-cell {
		position: relative;
	}
	.search-input {
		display: block !important;
		width: 100%;
		padding: 0.4rem 0.6rem !important;
		margin: 0 !important;
		border: 1px solid var(--color-border) !important;
		border-radius: var(--radius-sm) !important;
		background: var(--color-bg-primary) !important;
		color: var(--color-text-primary) !important;
		font-size: 0.9rem !important;
		scale: 1 !important;
		box-sizing: border-box;
	}
	.search-input:hover,
	.search-input:focus-visible {
		scale: 1 !important;
		border-color: var(--color-primary) !important;
		outline: none;
	}
	.search-input.has-match {
		opacity: 0.55;
		font-size: 0.8rem !important;
	}
	.search-input.has-match:focus {
		opacity: 1;
		font-size: 0.9rem !important;
	}
	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 10;
		list-style: none;
		margin: 2px 0 0;
		padding: 0;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		max-height: 260px;
		overflow-y: auto;
		min-width: 260px;
		box-shadow: var(--shadow-md);
	}
	.search-dropdown li button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.55rem 0.75rem;
		border: none;
		background: none;
		color: var(--color-text-primary);
		font-size: 0.85rem;
		cursor: pointer;
	}
	.search-dropdown li button:hover {
		background: var(--color-bg-elevated);
	}
	.search-cal {
		color: var(--color-text-secondary);
		margin-left: 0.5rem;
		font-size: 0.75rem;
	}
	.source-badge {
		display: inline-block;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-sm);
		margin-right: 0.3rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		vertical-align: middle;
		letter-spacing: 0.05em;
	}
	.source-badge.bls { background: var(--green); color: white; }
	.source-badge.skip { background: var(--red); color: white; }
	.source-badge.recipe-ref { background: var(--blue); color: white; }
	.manual-indicator {
		display: inline-block;
		font-size: 0.55rem;
		font-weight: 700;
		color: var(--orange);
		margin-left: 0.2rem;
		vertical-align: super;
	}
	.recipe-ref-label {
		font-size: 0.88rem;
		color: var(--blue);
		font-weight: 600;
	}
	.ref-multiplier {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin-left: 0.5rem;
	}
	.ref-multiplier .gpu-input { width: 3.5rem; }
	.excluded-label {
		font-style: italic;
		color: var(--red);
		font-size: 0.85rem;
	}
	.en-name {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
	.current-match {
		display: block;
		font-size: 0.85rem;
		margin-bottom: 0.3rem;
		color: var(--color-text-primary);
	}
	.current-match.manual-match {
		color: var(--orange);
	}
	.row-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.45rem;
		flex-wrap: wrap;
	}
	.row-controls :global(.toggle-wrapper) {
		font-size: 0.75rem;
	}
	.row-controls :global(.toggle-wrapper label) {
		gap: 0.4rem;
	}
	.row-controls :global(.toggle-track),
	.row-controls :global(input[type='checkbox']) {
		width: 32px !important;
		height: 18px !important;
	}
	.row-controls :global(.toggle-track::before),
	.row-controls :global(input[type='checkbox']::before) {
		width: 14px !important;
		height: 14px !important;
	}
	.row-controls :global(.toggle-track.checked::before),
	.row-controls :global(input[type='checkbox']:checked::before) {
		transform: translateX(14px) !important;
	}
	.revert-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.2rem 0.55rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all var(--transition-fast);
	}
	.revert-btn:hover {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.skip-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		color: var(--red);
		cursor: pointer;
		padding: 0.3rem 0.55rem;
		font-size: 0.9rem;
		line-height: 1;
		transition: all var(--transition-fast);
	}
	.skip-btn:hover,
	.skip-btn.active {
		background: var(--red);
		color: white;
		border-color: var(--red);
	}
	.skip-btn.active:hover {
		background: var(--green);
		color: white;
		border-color: var(--green);
	}
	.gpu-input {
		display: inline !important;
		width: 4em !important;
		padding: 0.25rem 0.4rem !important;
		margin: 0 !important;
		border: 1px solid var(--color-border) !important;
		border-radius: var(--radius-sm) !important;
		background: var(--color-bg-primary) !important;
		color: var(--color-text-primary) !important;
		font-size: 0.85rem !important;
		scale: 1 !important;
		text-align: right;
	}
	.gpu-input:hover,
	.gpu-input:focus-visible {
		scale: 1 !important;
	}

	/* ===== Mobile nutrition: table → card stack ===== */
	@media (max-width: 700px) {
		.nutrition-table-wrapper {
			padding: 0;
			background: transparent;
			border: none;
		}
		.nutrition-result-table,
		.nutrition-result-table tbody,
		.nutrition-result-table tr,
		.nutrition-result-table td {
			display: block;
			width: 100%;
			box-sizing: border-box;
		}
		.nutrition-result-table thead {
			display: none;
		}
		.nutrition-result-table tr {
			position: relative;
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-md);
			padding: 0.85rem 1rem 0.75rem;
			margin-bottom: 0.85rem;
			box-shadow: var(--shadow-sm);
		}
		.nutrition-result-table td {
			padding: 0.45rem 0;
			border-bottom: 1px dashed var(--color-border);
			display: flex;
			justify-content: space-between;
			gap: 0.75rem;
			align-items: baseline;
		}
		.nutrition-result-table td:last-child {
			border-bottom: none;
		}
		.nutrition-result-table td::before {
			content: attr(data-label);
			color: var(--color-text-secondary);
			font-size: 0.66rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.06em;
			flex-shrink: 0;
			min-width: 5rem;
			align-self: center;
		}
		.nutrition-result-table td.num-td {
			position: absolute;
			top: 0.6rem;
			right: 0.9rem;
			padding: 0;
			border: none;
			width: auto;
			opacity: 0.5;
			font-size: 0.7rem;
			display: inline-block;
		}
		.nutrition-result-table td.num-td::before {
			display: none;
		}
		.nutrition-result-table td.name-td {
			font-size: 1.05rem;
			font-weight: 600;
			padding-right: 2rem;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.15rem;
		}
		.nutrition-result-table td.name-td::before {
			font-size: 0.62rem;
			opacity: 0.7;
		}
		.nutrition-result-table td.search-td {
			flex-direction: column;
			align-items: stretch;
			gap: 0.4rem;
		}
		.nutrition-result-table td.action-td {
			justify-content: flex-end;
		}
		.nutrition-result-table td.action-td::before {
			display: none;
		}
		.search-input {
			font-size: 1rem !important;
			padding: 0.6rem 0.75rem !important;
		}
		.search-dropdown {
			min-width: 100%;
		}
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
	<input type="hidden" name="ingredients_json" value={JSON.stringify(ingredients)} />
	<input type="hidden" name="instructions_json" value={JSON.stringify(instructions)} />
	<input type="hidden" name="add_info_json" value={JSON.stringify(add_info)} />
	<input type="hidden" name="season" value={JSON.stringify(season_local)} />
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
				<SeasonSelect />
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

	<!-- Nutrition section -->
	<input type="hidden" name="nutritionMappings_json" value={JSON.stringify(nutritionMappings)} />
	<input type="hidden" name="globalOverwrites_json" value={JSON.stringify(getGlobalOverwrites())} />

	{#if nutritionMappings.length > 0}
		<div class="nutrition-section">
			<div class="nutrition-header">
				<h3>Nährwerte</h3>
				<button type="button" class="regenerate-btn" onclick={generateNutrition} disabled={generatingNutrition || !short_name.trim()}>
					{generatingNutrition ? 'Generiere…' : 'Neu generieren'}
				</button>
			</div>
			<div class="nutrition-table-wrapper">
				<p class="nutrition-result-summary">
					{nutritionMappings.filter((m) => m.matchMethod !== 'none' || m.recipeRef).length}/{nutritionMappings.length} Zutaten zugeordnet
				</p>
				<table class="nutrition-result-table">
					<thead><tr><th>#</th><th>Zutat</th><th>Quelle</th><th>Treffer / Suche</th><th>Konf.</th><th>g/u</th><th></th></tr></thead>
					<tbody>
						{#each nutritionMappings as m, i (mappingKey(m))}
							{@const key = mappingKey(m)}
							<tr class:unmapped-row={m.matchMethod === 'none' && !m.excluded && !m.recipeRef} class:excluded-row={m.excluded && !m.recipeRef} class:manual-row={m.manuallyEdited && !m.excluded} class:recipe-ref-row={!!m.recipeRef}>
								<td data-label="#" class="num-td">{i + 1}</td>
								<td data-label="Zutat" class="name-td">
									{m.ingredientNameDe || m.ingredientName}
									{#if m.ingredientName && m.ingredientName !== m.ingredientNameDe}
										<span class="en-name">({m.ingredientName})</span>
									{/if}
								</td>
								<td data-label="Quelle" class="src-td">
									{#if m.recipeRef}
										<span class="source-badge recipe-ref">REF</span>
									{:else if m.excluded}
										<span class="source-badge skip">SKIP</span>
									{:else if m.matchMethod !== 'none'}
										<span class="source-badge" class:bls={m.source === 'bls'}>{(m.source || 'usda').toUpperCase()}</span>
										{#if m.manuallyEdited}<span class="manual-indicator" title="Manuell zugeordnet">M</span>{/if}
									{:else}
										—
									{/if}
								</td>
								<td data-label="Treffer / Suche" class="search-td">
									<div class="search-cell">
										{#if m.recipeRef}
											<span class="recipe-ref-label">{m.recipeRef}</span>
											<label class="ref-multiplier">
												<span>Anteil:</span>
												<input type="number" class="gpu-input" min="0" max="10" step="0.1" bind:value={m.recipeRefMultiplier} />
											</label>
										{:else if m.excluded}
											<span class="excluded-label">Übersprungen</span>
										{:else if m.matchMethod !== 'none' && !searchQueries[key]}
											<span class="current-match" class:manual-match={m.manuallyEdited}>{m.nutritionDbName || '—'}</span>
										{/if}
										{#if !m.recipeRef}
											<input
												type="text"
												class="search-input"
												class:has-match={m.matchMethod !== 'none' && !m.excluded && !searchQueries[key]}
												placeholder={m.excluded ? 'Suche für neuen Treffer…' : (m.matchMethod !== 'none' ? 'Überschreiben…' : 'BLS/USDA suchen…')}
												value={searchQueries[key] || ''}
												oninput={(e) => handleSearchInput(key, e.currentTarget.value)}
											/>
											{#if searchResults[key]?.length > 0}
												<ul class="search-dropdown">
													{#each searchResults[key] as result (result.id)}
														<li>
															<button
																type="button"
																onclick={() => assignNutritionEntry(m, result)}
															>
																<span class="source-badge" class:bls={result.source === 'bls'}>{result.source.toUpperCase()}</span>
																{result.name}
																<span class="search-cal">{Math.round(result.calories)} kcal</span>
															</button>
														</li>
													{/each}
												</ul>
											{/if}
											<div class="row-controls">
												<Toggle checked={globalToggle[key] ?? false} label="global" onchange={() => { globalToggle[key] = !globalToggle[key]; }} />
												{#if m.manuallyEdited || m.excluded}
													<button type="button" class="revert-btn" onclick={() => revertToAuto(m)} title="Zurück auf automatisch">auto</button>
												{/if}
											</div>
										{/if}
									</div>
								</td>
								<td data-label="Konf." class="conf-td">{m.recipeRef ? '—' : (m.matchConfidence ? (m.matchConfidence * 100).toFixed(0) + '%' : '—')}</td>
								<td data-label="g/u" class="unit-td">
									{#if m.recipeRef}
										—
									{:else if m.manuallyEdited}
										<input type="number" class="gpu-input" min="0" step="0.1" bind:value={m.gramsPerUnit} />
									{:else}
										{m.gramsPerUnit || '—'}
									{/if}
								</td>
								<td data-label="" class="action-td">
									{#if !m.recipeRef}
										<button
											type="button"
											class="skip-btn"
											class:active={m.excluded}
											onclick={() => m.excluded ? revertToAuto(m) : skipIngredient(m)}
											title={m.excluded ? 'Wieder aktivieren' : 'Überspringen'}
										>
											{m.excluded ? '↩' : '✕'}
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="nutrition-section">
			<h3>Nährwerte</h3>
			<div class="section-actions">
				<button type="button" class="section-btn" onclick={generateNutrition} disabled={generatingNutrition || !short_name.trim()}>
					{generatingNutrition ? 'Generiere…' : 'Generieren'}
				</button>
			</div>
		</div>
	{/if}

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

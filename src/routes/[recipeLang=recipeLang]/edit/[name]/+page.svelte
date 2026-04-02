<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import Check from '$lib/assets/icons/Check.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/recipes/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import GenerateAltTextButton from '$lib/components/recipes/GenerateAltTextButton.svelte';
	import EditRecipeNote from '$lib/components/recipes/EditRecipeNote.svelte';
	import CardAdd from '$lib/components/recipes/CardAdd.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';
	import '$lib/css/action_button.css';
	import { toast } from '$lib/js/toast.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Recipe data state
	let preamble = $state(data.recipe.preamble || "");
	let addendum = $state(data.recipe.addendum || "");
	let note = $state(data.recipe.note || "");
	let image_preview_url = $state(
		"https://bocken.org/static/rezepte/thumb/" +
			(data.recipe.images?.[0]?.mediapath || `${data.recipe.short_name}.webp`)
	);
	let selected_image_file = $state<File | null>(null);

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
	let defaultForm = $state(data.recipe.defaultForm ? { ...data.recipe.defaultForm } : null);
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
	if (nutritionMappings.length > 0) {
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
			const mapped = nutritionMappings.filter((m: any) => m.matchMethod !== 'none').length;
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
	.fab-save {
		position: fixed;
		bottom: 0;
		right: 0;
		width: 1rem;
		height: 1rem;
		padding: 2rem;
		margin: 2rem;
		border-radius: var(--radius-pill);
		background-color: var(--red);
		display: grid;
		justify-content: center;
		align-content: center;
		z-index: 100;
		animation: unset !important;
	}
	.fab-save:hover, .fab-save:focus {
		background-color: var(--nord0) !important;
	}
	.fab-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	@media screen and (max-width: 500px) {
		.fab-save {
			margin: 1rem;
		}
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
	.nutrition-section {
		max-width: 1000px;
		margin: 1.5rem auto;
	}
	.nutrition-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.nutrition-header h3 {
		margin: 0;
	}
	.regenerate-btn {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-pill);
		padding: 0.4rem 1rem;
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
		background: var(--color-bg-secondary);
		border-radius: 12px;
		padding: 1rem;
		overflow-x: auto;
	}
	.nutrition-result-summary {
		margin: 0 0 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.nutrition-result-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.nutrition-result-table th,
	.nutrition-result-table td {
		text-align: left;
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid var(--color-bg-elevated);
	}
	.nutrition-result-table th {
		color: var(--color-text-secondary);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.unmapped-row {
		opacity: 0.6;
	}
	.search-cell {
		position: relative;
	}
	.search-input {
		display: inline !important;
		width: 100%;
		padding: 0.3rem 0.5rem !important;
		margin: 0 !important;
		border: 1px solid var(--color-bg-elevated) !important;
		border-radius: 6px !important;
		background: var(--color-bg-primary) !important;
		color: var(--color-text-primary) !important;
		font-size: 0.85rem !important;
		scale: 1 !important;
	}
	.search-input:hover,
	.search-input:focus-visible {
		scale: 1 !important;
		border-color: var(--color-primary) !important;
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
		border: 1px solid var(--color-bg-elevated);
		border-radius: 8px;
		max-height: 240px;
		overflow-y: auto;
		min-width: 300px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}
	.search-dropdown li button {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.4rem 0.6rem;
		border: none;
		background: none;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		cursor: pointer;
	}
	.search-dropdown li button:hover {
		background: var(--color-bg-tertiary);
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
		padding: 0.1rem 0.35rem;
		border-radius: 4px;
		margin-right: 0.3rem;
		background: var(--nord10);
		color: white;
		vertical-align: middle;
	}
	.source-badge.bls {
		background: var(--nord14);
		color: var(--nord0);
	}
	.source-badge.skip {
		background: var(--nord11);
		color: white;
	}
	.manual-indicator {
		display: inline-block;
		font-size: 0.55rem;
		font-weight: 700;
		color: var(--nord13);
		margin-left: 0.2rem;
		vertical-align: super;
	}
	.excluded-row {
		opacity: 0.4;
	}
	.excluded-row td {
		text-decoration: line-through;
	}
	.excluded-row td:last-child,
	.excluded-row td:nth-last-child(2),
	.excluded-row td:nth-last-child(3),
	.excluded-row td:nth-last-child(4) {
		text-decoration: none;
	}
	.manual-row {
		border-left: 2px solid var(--nord13);
	}
	.excluded-label {
		font-style: italic;
		color: var(--nord11);
		font-size: 0.8rem;
	}
	.en-name {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
	.current-match {
		display: block;
		font-size: 0.8rem;
		margin-bottom: 0.2rem;
		color: var(--color-text-primary);
	}
	.current-match.manual-match {
		color: var(--nord13);
	}
	.search-input.has-match {
		opacity: 0.5;
		font-size: 0.75rem !important;
	}
	.search-input.has-match:focus {
		opacity: 1;
		font-size: 0.85rem !important;
	}
	.row-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.3rem;
	}
	.row-controls :global(.toggle-wrapper) {
		font-size: 0.75rem;
	}
	.row-controls :global(.toggle-wrapper label) {
		gap: 0.4rem;
	}
	.row-controls :global(.toggle-track),
	.row-controls :global(input[type="checkbox"]) {
		width: 32px !important;
		height: 18px !important;
	}
	.row-controls :global(.toggle-track::before),
	.row-controls :global(input[type="checkbox"]::before) {
		width: 14px !important;
		height: 14px !important;
	}
	.row-controls :global(.toggle-track.checked::before),
	.row-controls :global(input[type="checkbox"]:checked::before) {
		transform: translateX(14px) !important;
	}
	.revert-btn {
		background: none;
		border: 1px solid var(--color-bg-elevated);
		border-radius: 4px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.15rem 0.4rem;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		transition: all var(--transition-fast);
	}
	.revert-btn:hover {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.skip-btn {
		background: none;
		border: 1px solid var(--color-bg-elevated);
		border-radius: 4px;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.15rem 0.4rem;
		font-size: 0.8rem;
		line-height: 1;
		transition: all var(--transition-fast);
	}
	.skip-btn:hover {
		background: var(--nord11);
		color: white;
	}
	.skip-btn.active {
		background: var(--nord11);
		color: white;
	}
	.skip-btn.active:hover {
		background: var(--nord14);
		color: var(--nord0);
	}
	.gpu-input {
		display: inline !important;
		width: 4em !important;
		padding: 0.2rem 0.3rem !important;
		margin: 0 !important;
		border: 1px solid var(--color-bg-elevated) !important;
		border-radius: 4px !important;
		background: var(--color-bg-primary) !important;
		color: var(--color-text-primary) !important;
		font-size: 0.8rem !important;
		scale: 1 !important;
		text-align: right;
	}
	.gpu-input:hover, .gpu-input:focus-visible {
		scale: 1 !important;
	}
	.section-actions {
		display: flex;
		gap: 0.75rem;
	}
	.section-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 4px;
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
		margin: 1.5rem auto;
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
				<label>Aussen-Ø: <input type="number" min="1" step="1" bind:value={defaultForm.diameter} /> cm</label>
				<label>Innen-Ø: <input type="number" min="1" step="1" bind:value={defaultForm.innerDiameter} /> cm</label>
			</div>
		{/if}
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
					{nutritionMappings.filter((m) => m.matchMethod !== 'none').length}/{nutritionMappings.length} Zutaten zugeordnet
				</p>
				<table class="nutrition-result-table">
					<thead><tr><th>#</th><th>Zutat</th><th>Quelle</th><th>Treffer / Suche</th><th>Konf.</th><th>g/u</th><th></th></tr></thead>
					<tbody>
						{#each nutritionMappings as m, i (mappingKey(m))}
							{@const key = mappingKey(m)}
							<tr class:unmapped-row={m.matchMethod === 'none' && !m.excluded} class:excluded-row={m.excluded} class:manual-row={m.manuallyEdited && !m.excluded}>
								<td>{i + 1}</td>
								<td>
									{m.ingredientNameDe || m.ingredientName}
									{#if m.ingredientName && m.ingredientName !== m.ingredientNameDe}
										<span class="en-name">({m.ingredientName})</span>
									{/if}
								</td>
								<td>
									{#if m.excluded}
										<span class="source-badge skip">SKIP</span>
									{:else if m.matchMethod !== 'none'}
										<span class="source-badge" class:bls={m.source === 'bls'}>{(m.source || 'usda').toUpperCase()}</span>
										{#if m.manuallyEdited}<span class="manual-indicator" title="Manuell zugeordnet">M</span>{/if}
									{:else}
										—
									{/if}
								</td>
								<td>
									<div class="search-cell">
										{#if m.excluded}
											<span class="excluded-label">Übersprungen</span>
										{:else if m.matchMethod !== 'none' && !searchQueries[key]}
											<span class="current-match" class:manual-match={m.manuallyEdited}>{m.nutritionDbName || '—'}</span>
										{/if}
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
									</div>
								</td>
								<td>{m.matchConfidence ? (m.matchConfidence * 100).toFixed(0) + '%' : '—'}</td>
								<td>
									{#if m.manuallyEdited}
										<input type="number" class="gpu-input" min="0" step="0.1" bind:value={m.gramsPerUnit} />
									{:else}
										{m.gramsPerUnit || '—'}
									{/if}
								</td>
								<td>
									<button
										type="button"
										class="skip-btn"
										class:active={m.excluded}
										onclick={() => m.excluded ? revertToAuto(m) : skipIngredient(m)}
										title={m.excluded ? 'Wieder aktivieren' : 'Überspringen'}
									>
										{m.excluded ? '↩' : '✕'}
									</button>
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

<!-- FAB save button -->
<button
	type="button"
	class="fab-save action_button"
	onclick={saveRecipe}
	disabled={submitting}
	aria-label="Rezept speichern"
>
	<Check fill="white" width="2rem" height="2rem" />
</button>

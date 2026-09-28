<script lang="ts">
	import { resolve } from '$app/paths';
	import type { TranslatedRecipeType } from '$types/types';
	import TranslationField from './TranslationField.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import GenerateAltTextButton from './GenerateAltTextButton.svelte';
	import { baseRecipeShortName as getShortName, mergeRefs } from '$lib/js/translationRefs';

	interface Props {
		germanData: any;
		englishData?: TranslatedRecipeType | null;
		changedFields?: string[];
		isEditMode?: boolean;
		oldRecipeData?: any;
		onapproved?: (event: CustomEvent) => void;
		onskipped?: () => void;
		oncancelled?: () => void;
	}

	let {
		germanData,
		englishData = null,
		changedFields = [],
		isEditMode = false,
		oldRecipeData = null,
		onapproved,
		onskipped,
		oncancelled,
	}: Props = $props();

	type TranslationState = 'idle' | 'translating' | 'preview' | 'approved' | 'error';
	// svelte-ignore state_referenced_locally
	let translationState = $state<TranslationState>(englishData ? 'preview' : 'idle');
	let errorMessage = $state('');
	let validationErrors = $state<string[]>([]);

	// Helper function to initialize images array for English translation
	function initializeImagesArray(germanImages: any[]): any[] {
		if (!germanImages || germanImages.length === 0) return [];
		return germanImages.map((img) => ({
			mediapath: img.mediapath || '',
			alt: '',
			caption: ''
		}));
	}

	// Eagerly initialize editableEnglish from germanData if no English translation exists
	// svelte-ignore state_referenced_locally
	let editableEnglish = $state<any>(
		englishData ? {
			...englishData,
			images: englishData.images || initializeImagesArray(germanData.images || [])
		} : {
			...germanData,
			translationStatus: 'pending',
			ingredients: JSON.parse(JSON.stringify(germanData.ingredients || [])),
			instructions: JSON.parse(JSON.stringify(germanData.instructions || [])),
			images: initializeImagesArray(germanData.images || [])
		}
	);

	// Snapshot of the English exactly as it was handed to us. A recipe that merely
	// *has* a translation opens in 'preview' too, so the state alone cannot tell
	// "user produced something to approve" from "user just opened the page". Reading
	// the initial value is the whole point, so the locality warning is expected here.
	// svelte-ignore state_referenced_locally
	const initialEditableJson = JSON.stringify(editableEnglish ?? null);

	/** Set once an auto-translate run has replaced the English. */
	let translationTouched = $state(false);

	/**
	 * Which fields the English is behind on.
	 *
	 * Two sources, because they answer different questions. `changedFields` is what
	 * the German form has moved *this session*. The list stored on the translation is
	 * what a previous save recorded when it marked the translation `needs_update` and
	 * the user did not retranslate — without it, reopening the recipe later showed
	 * "needs update" with no indication of what.
	 */
	const staleFields = $derived.by(() => {
		const out = new Set(changedFields);
		if (englishData?.translationStatus === 'needs_update') {
			for (const f of englishData.changedFields ?? []) out.add(f);
		}
		return out;
	});

	function isStale(field: string): boolean {
		return staleFields.has(field);
	}

	const FIELD_LABELS: Record<string, string> = {
		name: 'Name',
		description: 'Description',
		category: 'Category',
		tags: 'Tags',
		preamble: 'Preamble',
		note: 'Note',
		addendum: 'Addendum',
		portions: 'Portions',
		preparation: 'Preparation',
		cooking: 'Cooking',
		total_time: 'Total time',
		baking: 'Baking',
		fermentation: 'Fermentation',
		ingredients: 'Ingredients',
		instructions: 'Instructions',
	};

	const staleLabels = $derived(
		[...staleFields].map((f) => FIELD_LABELS[f] ?? f)
	);

	/**
	 * Is there a translation the save button should approve? True after an
	 * auto-translate, or once the English has been edited by hand. False for an
	 * untouched existing translation, which keeps whatever needs_update state it had.
	 */
	export function hasPendingApproval(): boolean {
		if (translationState === 'translating' || translationState === 'approved') return false;
		if (translationTouched) return true;
		return JSON.stringify(editableEnglish ?? null) !== initialEditableJson;
	}

	/** Approve the current English. Returns false if validation failed; the errors
	 *  are rendered in-panel. */
	export function approve(): boolean {
		return handleApprove();
	}

	// Translation metadata (tracks which items were re-translated)
	let translationMetadata = $state<any>(null);

	// Track base recipes that need translation
	let untranslatedBaseRecipes = $state<{ shortName: string, name: string }[]>([]);
	let checkingBaseRecipes = $state(false);

	// Ensure images array is properly synced when germanData changes
	$effect(() => {
		if (germanData?.images && (!editableEnglish.images || editableEnglish.images.length !== germanData.images.length)) {
			// Re-initialize images array to match germanData length
			editableEnglish.images = initializeImagesArray(germanData.images);
		}
	});

	// Sync base recipe references from German to English
	async function syncBaseRecipeReferences() {
		if (!germanData) return;

		checkingBaseRecipes = true;

		// Collect all base recipe references from German data
		const germanBaseRecipeShortNames = new Set<string>();
		const baseRecipeRefMap = new Map<string, any>(); // Map short_name to baseRecipeRef (ID or object)

		(germanData.ingredients || []).forEach((ing: any) => {
			if (ing.type === 'reference' && ing.baseRecipeRef) {
				const shortName = getShortName(ing.baseRecipeRef);
				germanBaseRecipeShortNames.add(shortName);
				baseRecipeRefMap.set(shortName, ing.baseRecipeRef);
			}
		});
		(germanData.instructions || []).forEach((inst: any) => {
			if (inst.type === 'reference' && inst.baseRecipeRef) {
				const shortName = getShortName(inst.baseRecipeRef);
				germanBaseRecipeShortNames.add(shortName);
				baseRecipeRefMap.set(shortName, inst.baseRecipeRef);
			}
		});

		// If no base recipes in German, we're done
		if (germanBaseRecipeShortNames.size === 0) {
			checkingBaseRecipes = false;
			return;
		}

		// Fetch all base recipes and check their English translations
		const untranslated: { shortName: string, name: string }[] = [];
		const baseRecipeTranslations = new Map<string, { deName: string, enName: string }>();

		for (const shortName of germanBaseRecipeShortNames) {
			try {
				const response = await fetch(`/api/rezepte/items/${shortName}`);
				if (response.ok) {
					const recipe = await response.json();
					if (!recipe.translations?.en) {
						untranslated.push({ shortName, name: recipe.name });
					} else {
						baseRecipeTranslations.set(shortName, {
							deName: recipe.name,
							enName: recipe.translations.en.name
						});
					}
				}
			} catch (error) {
				console.error(`Error fetching base recipe ${shortName}:`, error);
			}
		}

		untranslatedBaseRecipes = untranslated;
		checkingBaseRecipes = false;

		// Don't proceed if there are untranslated base recipes
		if (untranslated.length > 0) {
			return;
		}

		// Merge German base recipe references into editableEnglish, with English
		// base recipe names, keeping the English wherever it already lines up
		editableEnglish.ingredients = mergeRefs(germanData.ingredients, editableEnglish.ingredients, baseRecipeTranslations);
		editableEnglish.instructions = mergeRefs(germanData.instructions, editableEnglish.instructions, baseRecipeTranslations);

		// Sync images array - keep existing English alt/caption or initialize empty
		editableEnglish.images = germanData.images?.map((germanImg: any, index: number) => {
			const existingEnImage = editableEnglish.images?.[index];
			return existingEnImage || { alt: '', caption: '' };
		}) || [];
	}

	// Run base recipe check in background (non-blocking)
	$effect(() => {
		syncBaseRecipeReferences();
	});

	// Handle auto-translate button click
	async function handleAutoTranslate(fullRetranslation = false) {
		translationState = 'translating';
		errorMessage = '';
		validationErrors = [];

		try {
			const response = await fetch('/api/rezepte/translate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					recipe: germanData,
					fields: isEditMode && !fullRetranslation && changedFields.length > 0 ? changedFields : undefined,
					oldRecipe: oldRecipeData, // For granular item-level change detection
					existingTranslation: englishData, // To merge with unchanged items
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Translation failed');
			}

			const result = await response.json();

			// Capture metadata about what was re-translated
			translationMetadata = result.translationMetadata;

			// If translating only specific fields, merge with existing translation
			// Otherwise use the full translation result
			if (isEditMode && changedFields.length > 0 && englishData) {
				editableEnglish = { ...englishData, ...result.translatedRecipe };
			} else {
				editableEnglish = result.translatedRecipe;
			}

			translationState = 'preview';
			translationTouched = true;

		} catch (error: any) {
			console.error('Translation error:', error);
			translationState = 'error';
			errorMessage = error.message || 'Translation failed. Please try again.';
		}
	}

	/** Global reveal — opens the German under every field at once. */
	let showGerman = $state(false);

	// Tags are chips on both sides, the same ones the German form uses. The
	// German pills are clickable because most tags travel untranslated: a name,
	// a loanword, a technique. Adopting beats retyping.
	let newTag = $state('');

	function addTag() {
		const t = newTag.trim();
		if (t && !(editableEnglish.tags ?? []).includes(t)) {
			editableEnglish.tags = [...(editableEnglish.tags ?? []), t];
		}
		newTag = '';
	}
	function removeTag(tag: string) {
		editableEnglish.tags = (editableEnglish.tags ?? []).filter((x: string) => x !== tag);
	}
	function adoptTag(tag: string) {
		if (!(editableEnglish.tags ?? []).includes(tag)) {
			editableEnglish.tags = [...(editableEnglish.tags ?? []), tag];
		}
	}
	function onTagKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag();
		}
	}

	// Handle field changes from the translation fields
	function handleFieldChange(value: string, field: string) {
		// Special handling for tags (comma-separated string -> array)
		if (field === 'tags') {
			editableEnglish[field] = value.split(',').map((t: string) => t.trim()).filter((t: string) => t);
		}
		// Handle nested fields (e.g., baking.temperature, fermentation.bulk)
		else if (field.includes('.')) {
			const [parent, child] = field.split('.');
			if (!editableEnglish[parent]) {
				editableEnglish[parent] = {};
			}
			editableEnglish[parent][child] = value;
		} else {
			editableEnglish[field] = value;
		}
	}

	/**
	 * Accessors for editableEnglish[parent][key] for each key: reading a missing
	 * value gives '', and writing creates the parent object (all keys empty) first.
	 */
	function nestedFields(parent: string, keys: string[]) {
		const fields: Record<string, string> = {};
		for (const key of keys) {
			Object.defineProperty(fields, key, {
				enumerable: true,
				get: () => editableEnglish[parent]?.[key] || '',
				set: (value: string) => {
					if (!editableEnglish[parent]) editableEnglish[parent] = Object.fromEntries(keys.map((k) => [k, '']));
					editableEnglish[parent][key] = value;
				},
			});
		}
		return fields;
	}

	// Create add_info object for CreateStepList that references editableEnglish properties
	// This allows CreateStepList to modify the values directly
	let englishAddInfo = $derived({
		get preparation() { return editableEnglish.preparation || ''; },
		set preparation(value) { editableEnglish.preparation = value; },
		fermentation: nestedFields('fermentation', ['bulk', 'final']),
		baking: nestedFields('baking', ['length', 'temperature', 'mode']),
		get total_time() { return editableEnglish.total_time || ''; },
		set total_time(value) { editableEnglish.total_time = value; },
		get cooking() { return editableEnglish.cooking || ''; },
		set cooking(value) { editableEnglish.cooking = value; },
	});

	// Handle approval
	function handleApprove(): boolean {
		// Validate required fields
		validationErrors = [];

		if (!editableEnglish?.name) {
			validationErrors.push('English name is required');
		}
		if (!editableEnglish?.description) {
			validationErrors.push('English description is required');
		}
		if (!editableEnglish?.short_name) {
			validationErrors.push('English short_name is required');
		}

		if (validationErrors.length > 0) {
			return false;
		}

		translationState = 'approved';
		onapproved?.(new CustomEvent('approved', {
			detail: {
				translatedRecipe: {
					...editableEnglish,
					translationStatus: 'approved',
					lastTranslated: new Date(),
					changedFields: [],
				}
			}
		}));
		return true;
	}

	// Handle skip translation
	function handleSkip() {
		onskipped?.();
	}

	// Handle cancel
	function handleCancel() {
		translationState = 'idle';
		editableEnglish = {
			...germanData,
			translationStatus: 'pending',
			ingredients: JSON.parse(JSON.stringify(germanData.ingredients || [])),
			instructions: JSON.parse(JSON.stringify(germanData.instructions || [])),
			images: initializeImagesArray(germanData.images || [])
		};
		oncancelled?.();
	}

</script>

<style>
.translation-approval {
	margin: 3rem auto 2rem;
	padding: 2rem clamp(1rem, 3vw, 2.5rem);
	max-width: 1200px;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-card);
	box-shadow: var(--shadow-md);
	position: relative;
}
.translation-approval::before{
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4px;
	background: linear-gradient(90deg, var(--color-primary), var(--blue), var(--green));
	border-radius: var(--radius-card) var(--radius-card) 0 0;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 1rem;
	flex-wrap: wrap;
	margin-bottom: 1.75rem;
	padding-bottom: 1rem;
	border-bottom: 1px solid var(--color-border);
}
.header h3 {
	margin: 0;
	font-size: 1.5rem;
	font-weight: 700;
	color: var(--color-text-primary);
	display: flex;
	align-items: center;
	gap: 0.6rem;
	letter-spacing: -0.01em;
}
.status-badge {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.35rem 0.9rem;
	border-radius: var(--radius-pill);
	font-size: 0.8rem;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.06em;
}
.status-badge::before{
	content: '';
	width: 0.45rem;
	height: 0.45rem;
	border-radius: 50%;
	background: currentColor;
}
.status-pending {
	background: color-mix(in srgb, var(--orange) 18%, transparent);
	color: var(--orange);
}
.status-approved {
	background: color-mix(in srgb, var(--green) 18%, transparent);
	color: var(--green);
}
.status-needs_update {
	background: color-mix(in srgb, var(--red) 18%, transparent);
	color: var(--red);
}

.translation-preview {
	max-width: 1000px;
	margin: 1.5rem auto;
}


.list-wrapper {
	margin-inline: auto;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	gap: 2rem;
	justify-content: center;
	margin-bottom: 2rem;
}
@media screen and (max-width: 700px) {
	.list-wrapper {
		flex-direction: column;
	}
}

.preview-title{
	margin: 0 0 1.5rem;
	font-size: 1.15rem;
	font-weight: 700;
	color: var(--color-primary);
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding-bottom: 0.5rem;
	border-bottom: 2px solid var(--color-primary);
	max-width: 900px;
	margin-inline: auto;
}

.actions {
	display: flex;
	gap: 0.75rem;
	justify-content: flex-end;
	margin-top: 2rem;
	padding-top: 1.5rem;
	border-top: 1px solid var(--color-border);
	flex-wrap: wrap;
}

button {
	padding: 0.65rem 1.25rem;
	border: none;
	border-radius: var(--radius-pill);
	font-size: 0.95rem;
	font-weight: 600;
	cursor: pointer;
	transition: var(--transition-fast);
	font-family: inherit;
}
button:hover:not(:disabled){
	transform: scale(1.03);
}
button:active:not(:disabled){
	transform: scale(0.98);
}
button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-primary {
	background: var(--color-primary);
	color: var(--color-text-on-primary);
	box-shadow: var(--shadow-sm);
}
.btn-primary:hover:not(:disabled) {
	background: var(--color-primary-hover);
}

.btn-secondary {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border);
}
.btn-secondary:hover:not(:disabled) {
	background: var(--color-bg-tertiary);
	border-color: var(--color-primary);
}

.btn-danger {
	background: transparent;
	color: var(--red);
	border: 1px solid color-mix(in srgb, var(--red) 40%, transparent);
}
.btn-danger:hover:not(:disabled) {
	background: var(--red);
	color: white;
	border-color: var(--red);
}

.loading-spinner {
	display: inline-block;
	width: 18px;
	height: 18px;
	border: 2px solid var(--color-border);
	border-top-color: var(--color-primary);
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-right: 0.5rem;
	vertical-align: middle;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

.notice {
	padding: 1rem 1.25rem;
	border-radius: var(--radius-md);
	margin-bottom: 1.25rem;
	font-size: 0.95rem;
	display: flex;
	gap: 0.75rem;
	align-items: flex-start;
	border: 1px solid;
}
.notice-body{ flex: 1; min-width: 0; }
.notice-body strong{ display: block; margin-bottom: 0.2rem; }

.notice-error {
	background: color-mix(in srgb, var(--red) 10%, var(--color-surface));
	color: var(--color-text-primary);
	border-color: color-mix(in srgb, var(--red) 40%, transparent);
}
.notice-warn {
	background: color-mix(in srgb, var(--orange) 10%, var(--color-surface));
	color: var(--color-text-primary);
	border-color: color-mix(in srgb, var(--orange) 40%, transparent);
}
.notice-info {
	background: color-mix(in srgb, var(--blue) 10%, var(--color-surface));
	color: var(--color-text-primary);
	border-color: color-mix(in srgb, var(--blue) 40%, transparent);
}

.stale-badge {
	display: inline-block;
	padding: 0.05rem 0.4rem;
	border-radius: var(--radius-pill);
	background: color-mix(in srgb, var(--orange) 18%, transparent);
	color: var(--orange);
	font-size: 0.65rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}
.stale-note {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin: 0 0 0.5rem;
	font-size: 0.8rem;
	color: var(--orange);
}

.notice ul {
	margin: 0.35rem 0 0;
	padding-left: 1.25rem;
}
.notice ul li{
	margin: 0.2rem 0;
}
.notice a{
	color: var(--color-primary);
	text-decoration: underline;
	margin-left: 0.4rem;
}

.idle-state {
	text-align: center;
	padding: 2rem;
	color: var(--color-text-secondary);
}
.idle-state p {
	margin-bottom: 1rem;
	font-size: 1.05rem;
}

.approve-hint {
	display: inline-flex;
	align-items: center;
	padding: 0.5rem 0;
	color: var(--color-text-secondary);
	font-size: 0.85rem;
}
.approved-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	border-radius: var(--radius-pill);
	background: color-mix(in srgb, var(--green) 18%, transparent);
	color: var(--green);
	font-weight: 700;
}

/* Images section */
.images-section {
	margin: 2rem auto;
	max-width: 900px;
	padding: 1.25rem;
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
}
.images-section h4{
	margin: 0 0 1rem;
	font-size: 1rem;
	color: var(--color-text-primary);
	display: flex;
	align-items: center;
	gap: 0.5rem;
}
.image-card{
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	padding: 1rem;
	margin-bottom: 0.75rem;
}
.image-card:last-child{ margin-bottom: 0; }
.image-card-row{
	display: flex;
	gap: 1rem;
	align-items: flex-start;
}
.image-card-row img{
	width: 96px;
	height: 96px;
	object-fit: cover;
	border-radius: var(--radius-sm);
	flex-shrink: 0;
}
.image-card-body{ flex: 1; min-width: 0; }
.image-path{
	margin: 0 0 0.75rem;
	font-size: 0.8rem;
	color: var(--color-text-tertiary);
	font-family: monospace;
	word-break: break-all;
}
@media (max-width: 560px){
	.image-card-row{ flex-direction: column; }
	.image-card-row img{ width: 100%; height: 140px; }
}
/* ── English recipe block ─────────────────────────────────────────────────
   Same width and centring as the German hero, so the two read as one object
   seen twice rather than as a form about a recipe. */
.review-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.75rem;
	flex-wrap: wrap;
	margin-bottom: 1rem;
}
.show-all {
	padding: 0.3rem 0.85rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-pill);
	background: transparent;
	color: var(--color-text-secondary);
	font: inherit;
	font-size: 0.78rem;
	font-weight: 600;
	cursor: pointer;
	transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
}
.show-all:hover,
.show-all[aria-pressed='true'] {
	color: var(--color-text-primary);
	border-color: var(--color-text-tertiary);
}
.show-all:focus-visible {
	outline: 2px solid var(--color-primary);
	outline-offset: 2px;
}

.en-recipe {
	max-width: 46rem;
	margin-inline: auto;
}
.meta-row {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem;
}
@media (max-width: 640px) {
	.meta-row { grid-template-columns: 1fr; }
}

/* Tags: the chips from the German hero, unchanged, plus a muted source row
   whose pills copy themselves across on click. */
.tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
	justify-content: center;
}
.tag-chip {
	all: unset;
	cursor: pointer;
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	padding: 0.25em 0.9em;
	border-radius: var(--radius-pill);
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
	transition: var(--transition-fast);
}
.tag-chip .x {
	opacity: 0.55;
	font-size: 1.1em;
	line-height: 1;
}
.tag-chip:hover,
.tag-chip:focus-visible {
	background: var(--red);
	color: white;
	transform: scale(1.05);
}
.tag-chip:hover .x,
.tag-chip:focus-visible .x { opacity: 1; }
.tag-add {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	background: transparent;
	border: 1px dashed var(--color-border);
	color: var(--color-text-secondary);
	padding: 0.15em 0.7em;
	border-radius: var(--radius-pill);
}
.tag-add input {
	all: unset;
	min-width: 6ch;
	color: var(--color-text-primary);
	font-size: inherit;
}
.tag-source {
	all: unset;
	cursor: pointer;
	padding: 0.15em 0.8em;
	border-radius: var(--radius-pill);
	background: transparent;
	border: 1px solid var(--color-border);
	color: var(--color-text-secondary);
	font-size: 0.85rem;
	transition: var(--transition-fast);
}
.tag-source:hover,
.tag-source:focus-visible {
	background: var(--color-bg-elevated);
	color: var(--color-text-primary);
}
.tag-empty { color: var(--color-text-tertiary); }

</style>

<div class="translation-approval">
	<div class="header">
		<h3>English Translation</h3>
		{#if editableEnglish?.translationStatus}
			<span class="status-badge status-{editableEnglish.translationStatus}">
				{editableEnglish.translationStatus === 'pending' ? 'Pending Approval' : ''}
				{editableEnglish.translationStatus === 'approved' ? 'Approved' : ''}
				{editableEnglish.translationStatus === 'needs_update' ? 'Needs Update' : ''}
			</span>
		{/if}
	</div>

	{#if errorMessage}
		<div class="notice notice-error">
			<div class="notice-body">
				<strong>Error</strong>
				{errorMessage}
			</div>
		</div>
	{/if}

	{#if validationErrors.length > 0}
		<div class="notice notice-warn">
			<div class="notice-body">
				<strong>Please fix the following errors:</strong>
				<ul>
					{#each validationErrors as error}
						<li>{error}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	{#if isEditMode && staleFields.size > 0}
		<div class="notice notice-warn">
			<div class="notice-body">
				<strong>Needs an update: {staleLabels.join(', ')}</strong>
				<small>
					Marked <span class="stale-badge">veraltet</span> below. Auto-translate re-translates
					only these and leaves the rest of the English as it is.
				</small>
			</div>
		</div>
	{:else if isEditMode && englishData?.translationStatus === 'needs_update'}
		<div class="notice notice-warn">
			<div class="notice-body">
				<strong>Translation is marked as needing an update</strong>
				<small>
					No record of which fields changed — the flag predates that being stored.
					Auto-translate will redo the whole recipe.
				</small>
			</div>
		</div>
	{/if}

	{#if checkingBaseRecipes}
		<div class="notice notice-info">
			<div class="notice-body"><span class="loading-spinner"></span>Checking if referenced base recipes are translated…</div>
		</div>
	{/if}

	{#if untranslatedBaseRecipes.length > 0}
		<div class="notice notice-warn">
			<div class="notice-body">
				<strong>Base recipes need translation</strong>
				The following base recipes need to be translated to English before you can translate this recipe:
				<ul>
					{#each untranslatedBaseRecipes as baseRecipe}
						<li>
							<strong>{baseRecipe.name}</strong>
							<a href={resolve('/[recipeLang=recipeLang]/edit/[name]', { recipeLang: 'de', name: baseRecipe.shortName })} target="_blank" rel="noopener noreferrer">
								Open in new tab →
							</a>
						</li>
					{/each}
				</ul>
				<div style="margin-top: 0.75rem;">
					<button type="button" class="btn-secondary" onclick={syncBaseRecipeReferences}>
						Re-check base recipes
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if translationState === 'idle'}
		<div class="notice notice-info">
			<div class="notice-body">
				<strong>Preview — not yet translated</strong>
				The structure below shows what will be translated. Click “Auto-translate” to generate the English translation.
			</div>
		</div>
	{/if}

	{#if translationState === 'translating'}
		<div class="idle-state">
			<p>
				<span class="loading-spinner"></span>
				Translating recipe...
			</p>
		</div>
	{/if}

	{#if translationState === 'idle' || translationState === 'preview' || translationState === 'approved'}
		<div class="translation-preview">
			<div class="review-head">
				<h3 class="preview-title">Review English translation</h3>
				<button type="button" class="show-all" aria-pressed={showGerman} onclick={() => (showGerman = !showGerman)}>
					{showGerman ? 'Hide German' : 'Show German'}
				</button>
			</div>

			<!-- The recipe as it will read in English, in the chrome the German is
			     edited in. German sits underneath each field, on request. -->
			<div class="en-recipe">
				<TranslationField
					label="Name"
					fieldName="name"
					variant="title"
					german={germanData.name}
					value={editableEnglish?.name || ''}
					stale={isStale('name')}
					{showGerman}
					placeholder="Recipe name"
					onchange={(value) => handleFieldChange(value, 'name')}
				/>

				<TranslationField
					label="Description"
					fieldName="description"
					variant="description"
					german={germanData.description}
					value={editableEnglish?.description || ''}
					stale={isStale('description')}
					{showGerman}
					placeholder="Short description"
					onchange={(value) => handleFieldChange(value, 'description')}
				/>

				<TranslationField label="Tags" fieldName="tags" stale={isStale('tags')} {showGerman}>
					{#snippet control()}
						<div class="tag-row">
							{#each editableEnglish?.tags ?? [] as tag (tag)}
								<button
									type="button"
									class="g-tag tag-chip"
									onclick={() => removeTag(tag)}
									aria-label={`Remove tag ${tag}`}
								>
									<span>{tag}</span><span class="x" aria-hidden="true">×</span>
								</button>
							{/each}
							<label class="g-tag tag-add">
								<span aria-hidden="true">+</span>
								<input
									type="text"
									bind:value={newTag}
									onkeydown={onTagKey}
									onblur={addTag}
									placeholder="new…"
									size="1"
									aria-label="New tag"
								/>
							</label>
						</div>
					{/snippet}
					{#snippet germanSlot()}
						<div class="tag-row">
							{#each germanData.tags ?? [] as tag (tag)}
								<button
									type="button"
									class="g-tag tag-source"
									onclick={() => adoptTag(tag)}
									title="Use as English tag"
									aria-label={`Use ${tag} as English tag`}
								>{tag}</button>
							{/each}
							{#if !(germanData.tags ?? []).length}<span class="tag-empty">—</span>{/if}
						</div>
					{/snippet}
				</TranslationField>

				<div class="meta-row">
					<TranslationField
						label="URL short name"
						fieldName="short_name"
						german={germanData.short_name}
						value={editableEnglish?.short_name || ''}
						stale={isStale('short_name')}
						{showGerman}
						placeholder="url-short-name"
						onchange={(value) => handleFieldChange(value, 'short_name')}
					/>
					<TranslationField
						label="Category"
						fieldName="category"
						german={germanData.category}
						value={editableEnglish?.category || ''}
						stale={isStale('category')}
						{showGerman}
						placeholder="Category"
						onchange={(value) => handleFieldChange(value, 'category')}
					/>
				</div>

				{#if editableEnglish?.preamble !== undefined}
					<TranslationField
						label="Preamble"
						fieldName="preamble"
						variant="block"
						german={germanData.preamble || ''}
						value={editableEnglish.preamble}
						stale={isStale('preamble')}
						{showGerman}
						placeholder="Longer introduction to this recipe…"
						onchange={(value) => handleFieldChange(value, 'preamble')}
					/>
				{/if}

				{#if editableEnglish?.note !== undefined}
					<TranslationField
						label="Note"
						fieldName="note"
						variant="block"
						german={germanData.note || ''}
						value={editableEnglish.note}
						stale={isStale('note')}
						{showGerman}
						placeholder="Note"
						onchange={(value) => handleFieldChange(value, 'note')}
					/>
				{/if}
			</div>

			<!-- Images Section -->
			{#if germanData.images && germanData.images.length > 0}
				<section class="images-section">
					<h4>Images — Alt texts &amp; captions</h4>
					{#each germanData.images as germanImage, i}
						{#if editableEnglish.images && editableEnglish.images[i]}
							<div class="image-card">
								<div class="image-card-row">
									<img
										src="https://bocken.org/static/rezepte/thumb/{germanImage.mediapath}"
										alt={germanImage.alt || 'Recipe image'}
									/>
									<div class="image-card-body">
										<p class="image-path"><strong>Image {i + 1}:</strong> {germanImage.mediapath}</p>

										<TranslationField
											label="Alt text"
											fieldName="image-alt-{i}"
											german={germanImage.alt || ''}
											value={editableEnglish.images[i].alt || ''}
											{showGerman}
											placeholder="English image description for screen readers"
											onchange={(value) => (editableEnglish.images[i].alt = value)}
										/>

										<TranslationField
											label="Caption"
											fieldName="image-caption-{i}"
											german={germanImage.caption || ''}
											value={editableEnglish.images[i].caption || ''}
											{showGerman}
											placeholder="English caption (optional)"
											onchange={(value) => (editableEnglish.images[i].caption = value)}
										/>

										<div style="margin-top: 0.75rem;">
											<GenerateAltTextButton
												shortName={germanData.short_name}
												imageIndex={i}
												onGenerated={(alt) => (editableEnglish.images[i].alt = alt.en)}
											/>
										</div>
									</div>
								</div>
							</div>
						{/if}
					{/each}
				</section>
			{/if}

			<!-- Ingredients and Instructions in two-column layout -->
			{#if editableEnglish?.ingredients || editableEnglish?.instructions}
				<div class="list-wrapper">
					<div>
						{#if isStale('ingredients')}
							<p class="stale-note"><span class="stale-badge">veraltet</span> Zutaten wurden auf Deutsch geändert</p>
						{/if}
						{#if editableEnglish?.ingredients}
							<CreateIngredientList
								bind:ingredients={editableEnglish.ingredients}
								bind:portions={editableEnglish.portions}
								lang="en"
							/>
						{/if}
					</div>
					<div>
						{#if isStale('instructions')}
							<p class="stale-note"><span class="stale-badge">veraltet</span> Zubereitung wurde auf Deutsch geändert</p>
						{/if}
						{#if editableEnglish?.instructions && englishAddInfo}
							<CreateStepList bind:instructions={editableEnglish.instructions} add_info={englishAddInfo} lang="en" />
						{/if}
					</div>
				</div>
			{/if}

			{#if editableEnglish?.addendum !== undefined}
				<TranslationField
					label="Addendum"
					fieldName="addendum"
					variant="block"
					german={germanData.addendum || ''}
					value={editableEnglish.addendum}
					stale={isStale('addendum')}
					{showGerman}
					placeholder="Addendum"
					onchange={(value) => handleFieldChange(value, 'addendum')}
				/>
			{/if}
		</div>

		<div class="actions">
			{#if translationState === 'idle'}
				<button type="button" class="btn-danger" onclick={handleCancel}>
					Cancel
				</button>
				<button type="button" class="btn-secondary" onclick={handleSkip}>
					Skip Translation
				</button>
				<button type="button" class="btn-primary" onclick={() => handleAutoTranslate()} disabled={untranslatedBaseRecipes.length > 0}>
					{#if untranslatedBaseRecipes.length > 0}
						Translate base recipes first
					{:else}
						Auto-translate
					{/if}
				</button>
			{:else if translationState !== 'approved'}
				<button type="button" class="btn-danger" onclick={handleCancel}>
					Cancel
				</button>
				<button type="button" class="btn-secondary" onclick={() => handleAutoTranslate(true)}>
					Vollständig neu übersetzen
				</button>
				<button type="button" class="btn-secondary" onclick={() => handleAutoTranslate()}>
					Re-translate
				</button>
				<span class="approve-hint">Speichern übernimmt die Übersetzung</span>
			{:else}
				<span class="approved-pill" aria-live="polite">Translation Approved</span>
			{/if}
		</div>
	{/if}
</div>

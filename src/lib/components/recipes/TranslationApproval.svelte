<script lang="ts">
	import type { TranslatedRecipeType } from '$types/types';
	import TranslationFieldComparison from './TranslationFieldComparison.svelte';
	import CreateIngredientList from '$lib/components/recipes/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/recipes/CreateStepList.svelte';
	import GenerateAltTextButton from './GenerateAltTextButton.svelte';

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

		// Helper to extract short_name from baseRecipeRef (which might be an object or string)
		const getShortName = (baseRecipeRef: any): string => {
			return typeof baseRecipeRef === 'object' ? baseRecipeRef.short_name : baseRecipeRef;
		};

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

		// Merge German base recipe references into editableEnglish
		// Update ingredients with English base recipe names
		editableEnglish.ingredients = germanData.ingredients.map((germanIng: any, index: number) => {
			if (germanIng.type === 'reference' && germanIng.baseRecipeRef) {
				const shortName = getShortName(germanIng.baseRecipeRef);
				const translation = baseRecipeTranslations.get(shortName);
				const englishIng = editableEnglish.ingredients[index];

				// If English already has this reference at same position, keep it
				if (englishIng?.type === 'reference' && englishIng.baseRecipeRef === germanIng.baseRecipeRef) {
					return englishIng;
				}

				// Otherwise, create new reference with English base recipe name
				return translation ? { ...germanIng, name: translation.enName } : germanIng;
			} else {
				// Regular ingredient section - keep existing English translation if it exists
				const englishIng = editableEnglish.ingredients[index];
				if (englishIng && englishIng.type !== 'reference') {
					return englishIng;
				}
				// If no English translation exists, use German structure (will be translated later)
				return germanIng;
			}
		});

		// Update instructions with English base recipe names
		editableEnglish.instructions = germanData.instructions.map((germanInst: any, index: number) => {
			if (germanInst.type === 'reference' && germanInst.baseRecipeRef) {
				const shortName = getShortName(germanInst.baseRecipeRef);
				const translation = baseRecipeTranslations.get(shortName);
				const englishInst = editableEnglish.instructions[index];

				// If English already has this reference at same position, keep it
				if (englishInst?.type === 'reference' && englishInst.baseRecipeRef === germanInst.baseRecipeRef) {
					return englishInst;
				}

				// Otherwise, create new reference with English base recipe name
				return translation ? { ...germanInst, name: translation.enName } : germanInst;
			} else {
				// Regular instruction section - keep existing English translation if it exists
				const englishInst = editableEnglish.instructions[index];
				if (englishInst && englishInst.type !== 'reference') {
					return englishInst;
				}
				// If no English translation exists, use German structure (will be translated later)
				return germanInst;
			}
		});

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

		} catch (error: any) {
			console.error('Translation error:', error);
			translationState = 'error';
			errorMessage = error.message || 'Translation failed. Please try again.';
		}
	}

	// Handle field changes from TranslationFieldComparison components
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

	// Create add_info object for CreateStepList that references editableEnglish properties
	// This allows CreateStepList to modify the values directly
	let englishAddInfo = $derived({
		get preparation() { return editableEnglish.preparation || ''; },
		set preparation(value) { editableEnglish.preparation = value; },
		fermentation: {
			get bulk() { return editableEnglish.fermentation?.bulk || ''; },
			set bulk(value) {
				if (!editableEnglish.fermentation) editableEnglish.fermentation = { bulk: '', final: '' };
				editableEnglish.fermentation.bulk = value;
			},
			get final() { return editableEnglish.fermentation?.final || ''; },
			set final(value) {
				if (!editableEnglish.fermentation) editableEnglish.fermentation = { bulk: '', final: '' };
				editableEnglish.fermentation.final = value;
			},
		},
		baking: {
			get length() { return editableEnglish.baking?.length || ''; },
			set length(value) {
				if (!editableEnglish.baking) editableEnglish.baking = { length: '', temperature: '', mode: '' };
				editableEnglish.baking.length = value;
			},
			get temperature() { return editableEnglish.baking?.temperature || ''; },
			set temperature(value) {
				if (!editableEnglish.baking) editableEnglish.baking = { length: '', temperature: '', mode: '' };
				editableEnglish.baking.temperature = value;
			},
			get mode() { return editableEnglish.baking?.mode || ''; },
			set mode(value) {
				if (!editableEnglish.baking) editableEnglish.baking = { length: '', temperature: '', mode: '' };
				editableEnglish.baking.mode = value;
			},
		},
		get total_time() { return editableEnglish.total_time || ''; },
		set total_time(value) { editableEnglish.total_time = value; },
		get cooking() { return editableEnglish.cooking || ''; },
		set cooking(value) { editableEnglish.cooking = value; },
	});

	// Handle approval
	function handleApprove() {
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
			return;
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

.field-section {
	margin-bottom: 1.25rem;
	max-width: 900px;
	margin-inline: auto;
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
.image-grid{
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem;
	margin-bottom: 0.75rem;
}
@media (max-width: 560px){
	.image-card-row{ flex-direction: column; }
	.image-card-row img{ width: 100%; height: 140px; }
	.image-grid{ grid-template-columns: 1fr; gap: 0.5rem; }
}
.image-field label{
	display: block;
	margin-bottom: 0.25rem;
	font-size: 0.75rem;
	font-weight: 700;
	color: var(--color-text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
.image-field input{
	width: 100%;
	padding: 0.45rem 0.6rem;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-sm);
	background: var(--color-bg-tertiary);
	color: var(--color-text-primary);
	font-size: 0.9rem;
	box-sizing: border-box;
	font-family: inherit;
	transition: border-color 150ms ease;
}
.image-field input:focus{
	outline: none;
	border-color: var(--color-primary);
}
.image-field input:disabled{
	background: var(--color-bg-secondary);
	color: var(--color-text-tertiary);
	cursor: default;
}
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

	{#if isEditMode && changedFields.length > 0}
		<div class="notice notice-info">
			<div class="notice-body">
				<strong>Changed fields: {changedFields.join(', ')}</strong>
				<small>Only these fields will be re-translated if you use auto-translate.</small>
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
							<a href="/de/edit/{baseRecipe.shortName}" target="_blank" rel="noopener noreferrer">
								Open in new tab →
							</a>
						</li>
					{/each}
				</ul>
				<div style="margin-top: 0.75rem;">
					<button class="btn-secondary" onclick={syncBaseRecipeReferences}>
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
			<h3 class="preview-title">Side-by-side review</h3>

			<!-- Basic Fields -->
			<div class="field-section">
				<TranslationFieldComparison
					label="Name"
					germanValue={germanData.name}
					englishValue={editableEnglish?.name || ''}
					fieldName="name"
					readonly={false}
					onchange={(value) => handleFieldChange(value, 'name')}
				/>
			</div>

			<div class="field-section">
				<TranslationFieldComparison
					label="Short Name (URL)"
					germanValue={germanData.short_name}
					englishValue={editableEnglish?.short_name || ''}
					fieldName="short_name"
					readonly={false}
					onchange={(value) => handleFieldChange(value, 'short_name')}
				/>
			</div>

			<div class="field-section">
				<TranslationFieldComparison
					label="Description"
					germanValue={germanData.description}
					englishValue={editableEnglish?.description || ''}
					fieldName="description"
					readonly={false}
					multiline={true}
					onchange={(value) => handleFieldChange(value, 'description')}
				/>
			</div>

			<div class="field-section">
				<TranslationFieldComparison
					label="Category"
					germanValue={germanData.category}
					englishValue={editableEnglish?.category || ''}
					fieldName="category"
					readonly={false}
					onchange={(value) => handleFieldChange(value, 'category')}
				/>
			</div>

			{#if editableEnglish?.tags}
				<div class="field-section">
					<TranslationFieldComparison
						label="Tags"
						germanValue={germanData.tags?.join(', ') || ''}
						englishValue={editableEnglish.tags.join(', ')}
						fieldName="tags"
						readonly={false}
						onchange={(value) => handleFieldChange(value, 'tags')}
					/>
				</div>
			{/if}

			{#if editableEnglish?.preamble !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Preamble"
						germanValue={germanData.preamble || ''}
						englishValue={editableEnglish.preamble}
						fieldName="preamble"
						readonly={false}
						multiline={true}
						onchange={(value) => handleFieldChange(value, 'preamble')}
					/>
				</div>
			{/if}

			{#if editableEnglish?.note !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Note"
						germanValue={germanData.note || ''}
						englishValue={editableEnglish.note}
						fieldName="note"
						readonly={false}
						multiline={true}
						onchange={(value) => handleFieldChange(value, 'note')}
					/>
				</div>
			{/if}

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

										<div class="image-grid">
											<div class="image-field">
												<label for="german-alt-{i}">German Alt-Text</label>
												<input
													id="german-alt-{i}"
													type="text"
													value={germanImage.alt || ''}
													disabled
												/>
											</div>
											<div class="image-field">
												<label for="english-alt-{i}">English Alt-Text</label>
												<input
													id="english-alt-{i}"
													type="text"
													bind:value={editableEnglish.images[i].alt}
													placeholder="English image description for screen readers"
												/>
											</div>
										</div>

										<div class="image-grid">
											<div class="image-field">
												<label for="german-caption-{i}">German Caption</label>
												<input
													id="german-caption-{i}"
													type="text"
													value={germanImage.caption || ''}
													disabled
												/>
											</div>
											<div class="image-field">
												<label for="english-caption-{i}">English Caption</label>
												<input
													id="english-caption-{i}"
													type="text"
													bind:value={editableEnglish.images[i].caption}
													placeholder="English caption (optional)"
												/>
											</div>
										</div>

										<div style="margin-top: 0.75rem;">
											<GenerateAltTextButton shortName={germanData.short_name} imageIndex={i} />
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
						{#if editableEnglish?.ingredients}
							<CreateIngredientList
								bind:ingredients={editableEnglish.ingredients}
								bind:portions={editableEnglish.portions}
								useStore={false}
								lang="en"
							/>
						{/if}
					</div>
					<div>
						{#if editableEnglish?.instructions && englishAddInfo}
							<CreateStepList bind:instructions={editableEnglish.instructions} add_info={englishAddInfo} lang="en" />
						{/if}
					</div>
				</div>
			{/if}

			{#if editableEnglish?.addendum !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Addendum"
						germanValue={germanData.addendum || ''}
						englishValue={editableEnglish.addendum}
						fieldName="addendum"
						readonly={false}
						multiline={true}
						onchange={(value) => handleFieldChange(value, 'addendum')}
					/>
				</div>
			{/if}
		</div>

		<div class="actions">
			{#if translationState === 'idle'}
				<button class="btn-danger" onclick={handleCancel}>
					Cancel
				</button>
				<button class="btn-secondary" onclick={handleSkip}>
					Skip Translation
				</button>
				<button class="btn-primary" onclick={handleAutoTranslate} disabled={untranslatedBaseRecipes.length > 0}>
					{#if untranslatedBaseRecipes.length > 0}
						Translate base recipes first
					{:else}
						Auto-translate
					{/if}
				</button>
			{:else if translationState !== 'approved'}
				<button class="btn-danger" onclick={handleCancel}>
					Cancel
				</button>
				<button class="btn-secondary" onclick={() => handleAutoTranslate(true)}>
					Vollständig neu übersetzen
				</button>
				<button class="btn-secondary" onclick={() => handleAutoTranslate()}>
					Re-translate
				</button>
				<button class="btn-primary" onclick={handleApprove}>
					Approve Translation
				</button>
			{:else}
				<span class="approved-pill" aria-live="polite">Translation Approved</span>
			{/if}
		</div>
	{/if}
</div>

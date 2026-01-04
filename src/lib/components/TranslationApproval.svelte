<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TranslatedRecipeType } from '$types/types';
	import TranslationFieldComparison from './TranslationFieldComparison.svelte';
	import CreateIngredientList from './CreateIngredientList.svelte';
	import CreateStepList from './CreateStepList.svelte';

	export let germanData: any;
	export let englishData: TranslatedRecipeType | null = null;
	export let changedFields: string[] = [];
	export let isEditMode: boolean = false; // true when editing existing recipe

	const dispatch = createEventDispatcher();

	type TranslationState = 'idle' | 'translating' | 'preview' | 'approved' | 'error';
	let translationState: TranslationState = englishData ? 'preview' : 'idle';
	let errorMessage: string = '';
	let validationErrors: string[] = [];

	// Editable English data (clone of englishData or initialized from germanData)
	let editableEnglish: any = englishData ? { ...englishData } : null;

	// Store old recipe data for granular change detection
	export let oldRecipeData: any = null;

	// Translation metadata (tracks which items were re-translated)
	let translationMetadata: any = null;

	// Track base recipes that need translation
	let untranslatedBaseRecipes: { shortName: string, name: string }[] = [];
	let checkingBaseRecipes = false;

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

		// If no base recipes in German, just initialize editableEnglish from German data if needed
		if (germanBaseRecipeShortNames.size === 0) {
			if (!editableEnglish) {
				editableEnglish = {
					...germanData,
					translationStatus: 'pending',
					ingredients: JSON.parse(JSON.stringify(germanData.ingredients || [])),
					instructions: JSON.parse(JSON.stringify(germanData.instructions || []))
				};
			}
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

		// Now merge German base recipe references into editableEnglish
		// This works for both new translations and existing translations

		if (!editableEnglish) {
			// No existing English translation - create from German structure with English base recipe names
			editableEnglish = {
				...germanData,
				translationStatus: 'pending',
				ingredients: JSON.parse(JSON.stringify(germanData.ingredients || [])).map((ing: any) => {
					if (ing.type === 'reference' && ing.baseRecipeRef) {
						const shortName = getShortName(ing.baseRecipeRef);
						const translation = baseRecipeTranslations.get(shortName);
						return translation ? { ...ing, name: translation.enName } : ing;
					}
					return ing;
				}),
				instructions: JSON.parse(JSON.stringify(germanData.instructions || [])).map((inst: any) => {
					if (inst.type === 'reference' && inst.baseRecipeRef) {
						const shortName = getShortName(inst.baseRecipeRef);
						const translation = baseRecipeTranslations.get(shortName);
						return translation ? { ...inst, name: translation.enName } : inst;
					}
					return inst;
				})
			};
		} else {
			// Existing English translation - merge German structure with English translations
			// Use German structure but keep English translations where they exist
			editableEnglish = {
				...editableEnglish,
				ingredients: germanData.ingredients.map((germanIng: any, index: number) => {
					if (germanIng.type === 'reference' && germanIng.baseRecipeRef) {
						// This is a base recipe reference - use English base recipe name
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
				}),
				instructions: germanData.instructions.map((germanInst: any, index: number) => {
					if (germanInst.type === 'reference' && germanInst.baseRecipeRef) {
						// This is a base recipe reference - use English base recipe name
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
				})
			};
		}
	}

	// Always sync base recipe references when component mounts
	syncBaseRecipeReferences();

	// Handle auto-translate button click
	async function handleAutoTranslate() {
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
					fields: isEditMode && changedFields.length > 0 ? changedFields : undefined,
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

			// Notify parent component
			dispatch('translated', { translatedRecipe: editableEnglish });

		} catch (error: any) {
			console.error('Translation error:', error);
			translationState = 'error';
			errorMessage = error.message || 'Translation failed. Please try again.';
		}
	}

	// Handle field changes from TranslationFieldComparison components
	function handleFieldChange(event: CustomEvent) {
		const { field, value } = event.detail;
		if (editableEnglish) {
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
			editableEnglish = editableEnglish; // Trigger reactivity
		}
	}

	// Create add_info object for CreateStepList that references editableEnglish properties
	// This allows CreateStepList to modify the values directly
	$: englishAddInfo = editableEnglish ? {
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
	} : null;

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
		dispatch('approved', {
			translatedRecipe: {
				...editableEnglish,
				translationStatus: 'approved',
				lastTranslated: new Date(),
				changedFields: [],
			}
		});
	}

	// Handle skip translation
	function handleSkip() {
		dispatch('skipped');
	}

	// Handle cancel
	function handleCancel() {
		translationState = 'idle';
		editableEnglish = null;
		dispatch('cancelled');
	}

	// Handle force full retranslation
	function handleForceFullRetranslation() {
		dispatch('forceFullRetranslation');
	}

	// Get status badge color
	function getStatusColor(status: string): string {
		switch (status) {
			case 'approved': return 'var(--nord14)';
			case 'pending': return 'var(--nord13)';
			case 'needs_update': return 'var(--nord12)';
			default: return 'var(--nord9)';
		}
	}
</script>

<style>
.translation-approval {
	margin: 2rem 0;
	padding: 1.5rem;
	border: 2px solid var(--nord9);
	border-radius: 8px;
	background: var(--nord1);
}

@media(prefers-color-scheme: light) {
	.translation-approval {
		background: var(--nord6);
		border-color: var(--nord4);
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1.5rem;
}

.header h3 {
	margin: 0;
	color: var(--nord6);
}

@media(prefers-color-scheme: light) {
	.header h3 {
		color: var(--nord0);
	}
}

.status-badge {
	padding: 0.25rem 0.75rem;
	border-radius: 16px;
	font-size: 0.85rem;
	font-weight: 600;
	color: var(--nord0);
}

.status-pending {
	background: var(--nord13);
}

.status-approved {
	background: var(--nord14);
}

.status-needs_update {
	background: var(--nord12);
}

.translation-preview {
	max-width: 1000px;
	margin: 1.5rem auto;
}

.field-section {
	margin-bottom: 1.5rem;
	max-width: 800px;
	margin-left: auto;
	margin-right: auto;
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

.column-header {
	font-weight: 700;
	font-size: 1.1rem;
	color: var(--nord8);
	margin-bottom: 1rem;
	padding-bottom: 0.5rem;
	border-bottom: 2px solid var(--nord9);
}

.field-group {
	margin-bottom: 1.5rem;
}

.actions {
	display: flex;
	gap: 1rem;
	justify-content: flex-end;
	margin-top: 1.5rem;
	flex-wrap: wrap;
}

button {
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 4px;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s;
}

.btn-primary {
	background: var(--nord14);
	color: var(--nord0);
}

.btn-primary:hover {
	background: var(--nord15);
}

.btn-secondary {
	background: var(--nord9);
	color: var(--nord6);
}

.btn-secondary:hover {
	background: var(--nord10);
}

.btn-danger {
	background: var(--nord11);
	color: var(--nord6);
}

.btn-danger:hover {
	background: var(--nord12);
}

button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.loading-spinner {
	display: inline-block;
	width: 20px;
	height: 20px;
	border: 3px solid var(--nord4);
	border-top-color: var(--nord14);
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-right: 0.5rem;
}

@keyframes spin {
	to { transform: rotate(360deg); }
}

.error-message {
	background: var(--nord11);
	color: var(--nord6);
	padding: 1rem;
	border-radius: 4px;
	margin: 1rem 0;
}

.validation-errors {
	background: var(--nord12);
	color: var(--nord0);
	padding: 1rem;
	border-radius: 4px;
	margin: 1rem 0;
}

.validation-errors ul {
	margin: 0.5rem 0 0 0;
	padding-left: 1.5rem;
}

.changed-fields {
	background: var(--nord13);
	color: var(--nord0);
	padding: 0.75rem;
	border-radius: 4px;
	margin-bottom: 1rem;
	font-size: 0.9rem;
}

.changed-fields strong {
	font-weight: 700;
}

.idle-state {
	text-align: center;
	padding: 2rem;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	.idle-state {
		color: var(--nord2);
	}
}

.idle-state p {
	margin-bottom: 1rem;
	font-size: 1.05rem;
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
		<div class="error-message">
			<strong>Error:</strong> {errorMessage}
		</div>
	{/if}

	{#if validationErrors.length > 0}
		<div class="validation-errors">
			<strong>Please fix the following errors:</strong>
			<ul>
				{#each validationErrors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if isEditMode && changedFields.length > 0}
		<div class="changed-fields">
			<strong>Changed fields:</strong> {changedFields.join(', ')}
			<br>
			<small>Only these fields will be re-translated if you use auto-translate.</small>
		</div>
	{/if}

	{#if checkingBaseRecipes}
		<div style="background: var(--nord9); color: var(--nord6); padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; text-align: center;">
			<p>Checking if referenced base recipes are translated...</p>
		</div>
	{/if}

	{#if untranslatedBaseRecipes.length > 0}
		<div style="background: var(--nord12); color: var(--nord0); padding: 1.5rem; border-radius: 4px; margin-bottom: 1.5rem;">
			<h4 style="margin-top: 0;">⚠️ Base Recipes Need Translation</h4>
			<p>The following base recipes need to be translated to English before you can translate this recipe:</p>
			<ul style="margin: 1rem 0;">
				{#each untranslatedBaseRecipes as baseRecipe}
					<li>
						<strong>{baseRecipe.name}</strong>
						<a href="/de/edit/{baseRecipe.id}" target="_blank" rel="noopener noreferrer" style="margin-left: 0.5rem; color: var(--nord10);">
							Open in new tab →
						</a>
					</li>
				{/each}
			</ul>
			<p style="margin-bottom: 0;">
				<button class="btn-secondary" on:click={syncBaseRecipeReferences}>
					Re-check Base Recipes
				</button>
			</p>
		</div>
	{/if}

	{#if translationState === 'idle'}
		<div style="background: var(--nord13); color: var(--nord0); padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; text-align: center;">
			<strong>Preview (Not yet translated)</strong>
			<p style="margin: 0.5rem 0;">The structure below shows what will be translated. Click "Auto-translate" to generate English translation.</p>
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
			<h3 style="margin-bottom: 1.5rem; color: var(--nord8);">🇬🇧 English Translation</h3>

			<!-- Basic Fields -->
			<div class="field-section">
				<TranslationFieldComparison
					label="Name"
					germanValue={germanData.name}
					englishValue={editableEnglish?.name || ''}
					fieldName="name"
					readonly={false}
					on:change={handleFieldChange}
				/>
			</div>

			<div class="field-section">
				<TranslationFieldComparison
					label="Short Name (URL)"
					germanValue={germanData.short_name}
					englishValue={editableEnglish?.short_name || ''}
					fieldName="short_name"
					readonly={false}
					on:change={handleFieldChange}
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
					on:change={handleFieldChange}
				/>
			</div>

			<div class="field-section">
				<TranslationFieldComparison
					label="Category"
					germanValue={germanData.category}
					englishValue={editableEnglish?.category || ''}
					fieldName="category"
					readonly={false}
					on:change={handleFieldChange}
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
						on:change={handleFieldChange}
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
						on:change={handleFieldChange}
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
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			{#if editableEnglish?.portions !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Portions"
						germanValue={germanData.portions || ''}
						englishValue={editableEnglish.portions}
						fieldName="portions"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			<!-- Ingredients and Instructions in two-column layout -->
			{#if editableEnglish?.ingredients || editableEnglish?.instructions}
				<div class="list-wrapper">
					<div>
						{#if editableEnglish?.ingredients}
							<CreateIngredientList bind:ingredients={editableEnglish.ingredients} lang="en" />
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
						on:change={handleFieldChange}
					/>
				</div>
			{/if}
		</div>

		<div class="actions">
			{#if translationState === 'idle'}
				<button class="btn-danger" on:click={handleCancel}>
					Cancel
				</button>
				<button class="btn-secondary" on:click={handleSkip}>
					Skip Translation
				</button>
				<button class="btn-primary" on:click={handleAutoTranslate} disabled={untranslatedBaseRecipes.length > 0}>
					{#if untranslatedBaseRecipes.length > 0}
						Translate base recipes first
					{:else}
						Auto-translate
					{/if}
				</button>
			{:else if translationState !== 'approved'}
				<button class="btn-danger" on:click={handleCancel}>
					Cancel
				</button>
				<button class="btn-secondary" on:click={handleForceFullRetranslation}>
					Vollständig neu übersetzen
				</button>
				<button class="btn-secondary" on:click={handleAutoTranslate}>
					Re-translate
				</button>
				<button class="btn-primary" on:click={handleApprove}>
					Approve Translation
				</button>
			{:else}
				<span style="color: var(--nord14); font-weight: 700;">✓ Translation Approved</span>
			{/if}
		</div>
	{/if}
</div>

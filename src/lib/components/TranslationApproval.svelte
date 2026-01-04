<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TranslatedRecipeType } from '$types/types';
	import TranslationFieldComparison from './TranslationFieldComparison.svelte';
	import EditableIngredients from './EditableIngredients.svelte';
	import EditableInstructions from './EditableInstructions.svelte';
	import IngredientsPage from './IngredientsPage.svelte';
	import InstructionsPage from './InstructionsPage.svelte';

	export let germanData: any;
	export let englishData: TranslatedRecipeType | null = null;
	export let changedFields: string[] = [];
	export let isEditMode: boolean = false; // true when editing existing recipe

	const dispatch = createEventDispatcher();

	type TranslationState = 'idle' | 'translating' | 'preview' | 'approved' | 'error';
	let translationState: TranslationState = englishData ? 'preview' : 'idle';
	let errorMessage: string = '';
	let validationErrors: string[] = [];

	// Editable English data (clone of englishData)
	let editableEnglish: any = englishData ? { ...englishData } : null;

	// Store old recipe data for granular change detection
	export let oldRecipeData: any = null;

	// Translation metadata (tracks which items were re-translated)
	let translationMetadata: any = null;

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

	// Handle ingredients changes
	function handleIngredientsChange(event: CustomEvent) {
		if (editableEnglish) {
			editableEnglish.ingredients = event.detail.ingredients;
			editableEnglish = editableEnglish; // Trigger reactivity
		}
	}

	// Handle instructions changes
	function handleInstructionsChange(event: CustomEvent) {
		if (editableEnglish) {
			editableEnglish.instructions = event.detail.instructions;
			editableEnglish = editableEnglish; // Trigger reactivity
		}
	}

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
	max-width: 800px;
	margin: 1.5rem auto;
}

.field-section {
	margin-bottom: 1.5rem;
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

	{#if translationState === 'idle'}
		<div class="idle-state">
			<p>Click "Auto-translate" to generate English translation using DeepL.</p>
			<div class="actions">
				<button class="btn-primary" on:click={handleAutoTranslate}>
					Auto-translate
				</button>
				<button class="btn-secondary" on:click={handleSkip}>
					Skip Translation
				</button>
			</div>
		</div>

	{:else if translationState === 'translating'}
		<div class="idle-state">
			<p>
				<span class="loading-spinner"></span>
				Translating recipe...
			</p>
		</div>

	{:else if translationState === 'preview' || translationState === 'approved'}
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

			{#if editableEnglish?.preparation !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Preparation Time"
						germanValue={germanData.preparation || ''}
						englishValue={editableEnglish.preparation}
						fieldName="preparation"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			{#if editableEnglish?.cooking !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Cooking Time"
						germanValue={germanData.cooking || ''}
						englishValue={editableEnglish.cooking}
						fieldName="cooking"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			{#if editableEnglish?.total_time !== undefined}
				<div class="field-section">
					<TranslationFieldComparison
						label="Total Time"
						germanValue={germanData.total_time || ''}
						englishValue={editableEnglish.total_time}
						fieldName="total_time"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			{#if editableEnglish?.baking}
				<div class="field-section">
					<h4 style="margin-bottom: 0.5rem;">Baking</h4>
					<TranslationFieldComparison
						label="Temperature"
						germanValue={germanData.baking?.temperature || ''}
						englishValue={editableEnglish.baking.temperature || ''}
						fieldName="baking.temperature"
						readonly={false}
						on:change={handleFieldChange}
					/>
					<TranslationFieldComparison
						label="Time"
						germanValue={germanData.baking?.length || ''}
						englishValue={editableEnglish.baking.length || ''}
						fieldName="baking.length"
						readonly={false}
						on:change={handleFieldChange}
					/>
					<TranslationFieldComparison
						label="Mode"
						germanValue={germanData.baking?.mode || ''}
						englishValue={editableEnglish.baking.mode || ''}
						fieldName="baking.mode"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			{#if editableEnglish?.fermentation}
				<div class="field-section">
					<h4 style="margin-bottom: 0.5rem;">Fermentation</h4>
					<TranslationFieldComparison
						label="Bulk"
						germanValue={germanData.fermentation?.bulk || ''}
						englishValue={editableEnglish.fermentation.bulk || ''}
						fieldName="fermentation.bulk"
						readonly={false}
						on:change={handleFieldChange}
					/>
					<TranslationFieldComparison
						label="Final"
						germanValue={germanData.fermentation?.final || ''}
						englishValue={editableEnglish.fermentation.final || ''}
						fieldName="fermentation.final"
						readonly={false}
						on:change={handleFieldChange}
					/>
				</div>
			{/if}

			<!-- Ingredients -->
			{#if editableEnglish?.ingredients && editableEnglish.ingredients.length > 0}
				<div class="field-section">
					<h4 style="margin-bottom: 0.5rem;">Ingredients</h4>
					<EditableIngredients
						ingredients={editableEnglish.ingredients}
						translationMetadata={translationMetadata?.ingredientTranslations}
						on:change={handleIngredientsChange}
					/>
				</div>
			{/if}

			<!-- Instructions -->
			{#if editableEnglish?.instructions && editableEnglish.instructions.length > 0}
				<div class="field-section">
					<h4 style="margin-bottom: 0.5rem;">Instructions</h4>
					<EditableInstructions
						instructions={editableEnglish.instructions}
						translationMetadata={translationMetadata?.instructionTranslations}
						on:change={handleInstructionsChange}
					/>
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
			{#if translationState !== 'approved'}
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

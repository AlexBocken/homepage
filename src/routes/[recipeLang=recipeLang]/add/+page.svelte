<script lang="ts">
	import { tick } from 'svelte';
	import type { ActionData, PageData } from './$types';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import TranslationApproval from '$lib/components/recipes/TranslationApproval.svelte';
	import RecipeForm from '$lib/components/recipes/RecipeForm.svelte';
	import { toast } from '$lib/js/toast.svelte';

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

	let season_local = $state<SeasonRange[]>([]);

	let portions_local = $state("");

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
	let formElement = $state<HTMLFormElement>();

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


<svelte:head>
	<title>Rezept erstellen</title>
	<meta name="description" content="Hier können neue Rezepte hinzugefügt werden" />
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
	addendumPlaceholder="Optionaler Nachtrag…"
	showTranslationTrigger={!showTranslationWorkflow}
	translateLabel="Übersetzen & erstellen"
	onTranslate={openTranslation}
>
	{#snippet hiddenFields()}
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
	{/snippet}
</RecipeForm>

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

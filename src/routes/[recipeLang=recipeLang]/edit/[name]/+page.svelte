<script lang="ts">
	import Check from '$lib/assets/icons/Check.svelte';
	import Cross from '$lib/assets/icons/Cross.svelte';
	import SeasonSelect from '$lib/components/SeasonSelect.svelte';
	import TranslationApproval from '$lib/components/TranslationApproval.svelte';
	import GenerateAltTextButton from '$lib/components/GenerateAltTextButton.svelte';
	import '$lib/css/action_button.css'
	import '$lib/css/nordtheme.css'
	import { redirect } from '@sveltejs/kit';
	import EditRecipeNote from '$lib/components/EditRecipeNote.svelte';
	import type { PageData } from './$types';
	import CardAdd from '$lib/components/CardAdd.svelte';
	import CreateIngredientList from '$lib/components/CreateIngredientList.svelte';
	import CreateStepList from '$lib/components/CreateStepList.svelte';
	import { season } from '$lib/js/season_store';
	import { portions } from '$lib/js/portions_store';
	import { img } from '$lib/js/img_store';

	let { data } = $props<{ data: PageData }>();

	let preamble = $state(data.recipe.preamble);
	let addendum = $state(data.recipe.addendum);
	let image_preview_url = $state("https://bocken.org/static/rezepte/thumb/" + (data.recipe.images?.[0]?.mediapath || `${data.recipe.short_name}.webp`));
	let note = $state(data.recipe.note);

	// Translation workflow state
	let showTranslationWorkflow = $state(false);
	let translationData = $state<any>(data.recipe.translations?.en || null);
	let changedFields = $state<string[]>([]);

	// Store original recipe data for change detection
	const originalRecipe = JSON.parse(JSON.stringify(data.recipe));

	portions.update(() => data.recipe.portions);
	let portions_local = $state<any>(data.recipe.portions);
	$effect(() => {
		portions.subscribe((p) => {
			portions_local = p;
		});
	});

	season.update(() => data.recipe.season);
	let season_local = $state<any>(data.recipe.season);
	$effect(() => {
		season.subscribe((s) => {
			season_local = s;
		});
	});

	let img_local = $state<string>('');
	img.update(() => '');
	$effect(() => {
		img.subscribe((i) => {
			img_local = i;
		});
	});

	let old_short_name = $state(data.recipe.short_name);

	let card_data = $state({
		icon: data.recipe.icon,
		category: data.recipe.category,
		name: data.recipe.name,
		description: data.recipe.description,
		tags: data.recipe.tags,
	});

	let add_info = $state({
		preparation: data.recipe.preparation,
		fermentation: {
			bulk: data.recipe.fermentation.bulk,
			final: data.recipe.fermentation.final,
		},
		baking: {
			length: data.recipe.baking.length,
			temperature: data.recipe.baking.temperature,
			mode: data.recipe.baking.mode,
		},
		total_time: data.recipe.total_time,
		cooking: data.recipe.cooking,
	});

	let images = $state(data.recipe.images);

	let short_name = $state(data.recipe.short_name);
	let datecreated = $state(data.recipe.datecreated);
	let datemodified = $state(new Date());
	let isBaseRecipe = $state(data.recipe.isBaseRecipe || false);

	let ingredients = $state(data.recipe.ingredients);
	let instructions = $state(data.recipe.instructions);


	function get_season(){
		let season = []
		const el = document.getElementById("labels");
		for(var i = 0; i < el.children.length; i++){
			if(el.children[i].children[0].children[0].checked){
				season.push(i+1)
			}
		}
		return season
	}
	function write_season(season){
		const el = document.getElementById("labels");
		for(var i = 0; i < season.length; i++){
			el.children[i].children[0].children[0].checked = true
		}
	}

	// Get current German recipe data
	function getCurrentRecipeData() {
		return {
			...card_data,
			...add_info,
			images,
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
		};
	}

	// Detect which fields have changed from the original
	function detectChangedFields() {
		const current = getCurrentRecipeData();
		const changed: string[] = [];

		const fieldsToCheck = [
			'name', 'description', 'preamble', 'addendum',
			'note', 'category', 'tags', 'portions', 'preparation',
			'cooking', 'total_time', 'baking', 'fermentation',
			'ingredients', 'instructions'
		];

		for (const field of fieldsToCheck) {
			const oldValue = JSON.stringify(originalRecipe[field] || '');
			const newValue = JSON.stringify(current[field] || '');
			if (oldValue !== newValue) {
				changed.push(field);
			}
		}

		return changed;
	}

	// Show translation workflow before submission
	function prepareSubmit() {
		// Only detect changed fields if there's an existing translation
		// For first-time translations, changedFields should be empty
		changedFields = translationData ? detectChangedFields() : [];
		showTranslationWorkflow = true;

		// Scroll to translation section
		setTimeout(() => {
			document.getElementById('translation-section')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	// Force full retranslation of entire recipe
	function forceFullRetranslation() {
		// Set changedFields to empty array to trigger full translation
		changedFields = [];
		showTranslationWorkflow = true;

		// Scroll to translation section
		setTimeout(() => {
			document.getElementById('translation-section')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}

	// Handle translation approval
	function handleTranslationApproved(event: CustomEvent) {
		translationData = event.detail.translatedRecipe;
		doEdit();
	}

	// Handle translation skipped
	function handleTranslationSkipped() {
		// Mark translation as needing update if fields changed
		if (changedFields.length > 0 && translationData) {
			translationData.translationStatus = 'needs_update';
			translationData.changedFields = changedFields;
		}
		doEdit();
	}

	// Handle translation cancelled
	function handleTranslationCancelled() {
		showTranslationWorkflow = false;
	}

	async function doDelete(){
		// Check for references if this is a base recipe
		const checkRes = await fetch(`/api/rezepte/check-references/${data.recipe._id}`);
		const checkData = await checkRes.json();

		let response;
		if (checkData.isReferenced) {
			const refList = checkData.references
				.map(r => `  • ${r.name}`)
				.join('\n');

			response = confirm(
				`Dieses Rezept wird von folgenden Rezepten referenziert:\n\n${refList}\n\n` +
				`Die Referenzen werden in regulären Inhalt umgewandelt.\n` +
				`Möchtest du fortfahren?`
			);
		} else {
			response = confirm("Bist du dir sicher, dass du das Rezept löschen willst?");
		}

		if(!response){
			return
		}
		const res_img = await fetch('/api/rezepte/img/delete', {
			method: 'POST',
			body: JSON.stringify({
				name: old_short_name,
				}),
			headers : {
       				'content-type': 'application/json',
				credentials: 'include',
				}
			})
		if(!res_img.ok){
			const item = await res_img.json();
			//alert(item.message)
			return
		}
		const res = await fetch('/api/rezepte/delete', {
			method: 'POST',
			body: JSON.stringify({
				old_short_name,
			}),
			headers: {
       				'content-type': 'application/json',
				credentials: 'include',
     			}
		})
		if(res.ok){
			const url = location.href.split('/')
			url.splice(url.length -2, 2);
			location.assign(url.join('/'))
		}
		else{
			const item = await res.json();
			// alert(item.message)
		}
	}
	async function doEdit() {
		// two cases:
		//new image uploaded (not implemented yet)
		// new short_name -> move images as well

		// if new image
		console.log("img_local", img_local)
		if(img_local != ""){
			async function delete_img(){
				const res = await fetch('/api/rezepte/img/delete', {
					method: 'POST',
					body: JSON.stringify({
						name: old_short_name,
						}),
					headers : {
       						'content-type': 'application/json',
						credentials: 'include',
						}
				})
				if(!res.ok){
					const item = await res.json();
					// alert(item.message)
				}
			}
			async function upload_img(){
        			const data = {
					image: img_local,
					name: short_name.trim(),
				}
        			const res = await fetch(`/api/rezepte/img/add`, {
        			    method: 'POST',
        			    headers: {
        			        'Content-Type': 'application/json',
        			        Accept: 'application/json',
				    	credentials: 'include',
        			    },
        			    body: JSON.stringify(data)
        			});
				if(!res.ok){
					const item = await res.json();
					// alert(item.message)
				}
			}
			delete_img()
			upload_img()
		}
		// case new short_name:
		else if(short_name != old_short_name){
			console.log("MOVING")
			const res_img = await fetch('/api/rezepte/img/mv', {
				method: 'POST',
				headers: {
        			        'Content-Type': 'application/json',
        			        Accept: 'application/json',
					credentials: 'include',
        			    },
				body: JSON.stringify({
					old_name: old_short_name,
					new_name: short_name.trim(),
				})
			})
			if(!res_img.ok){
				const item = await res_img.json();
				//alert(item.message)
				return
			}
		}
		const recipeData = getCurrentRecipeData();

		// Add translations if available
		if (translationData) {
			recipeData.translations = {
				en: translationData
			};

			// Update translation metadata
			if (changedFields.length > 0) {
				recipeData.translationMetadata = {
					lastModifiedGerman: new Date(),
					fieldsModifiedSinceTranslation: translationData.translationStatus === 'needs_update' ? changedFields : [],
				};
			}
		}

		const res = await fetch('/api/rezepte/edit', {
			method: 'POST',
			body: JSON.stringify({
				recipe: recipeData,
				old_short_name,
				old_recipe: originalRecipe, // For change detection in API
			}),
			headers: {
       				'content-type': 'application/json',
				credentials: 'include',
     			}
		})
		if(res.ok){
			const url = location.href.split('/');
			url.splice(url.length -2, 2);
			url.push(short_name.trim());
			location.assign(url.join('/'))
		}
		else{
			const item = await res.json()
			//alert(item.message)
		}
	}
</script>

<style>
input{
	display: block;
	border: unset;
	margin: 1rem auto;
	padding: 0.5em 1em;
	border-radius: 1000px;
	background-color: var(--nord4);
	font-size: 1.1rem;
	transition: 100ms;

}
input:hover,
input:focus-visible
{
	scale: 1.05 1.05;
}
.list_wrapper{
	margin-inline: auto;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	gap: 2rem;
	justify-content: center;
}
@media screen and (max-width: 700px){
	.list_wrapper{
		flex-direction: column;
	}
}

/* Fix button icon visibility in dark mode */
@media (prefers-color-scheme: dark) {
	.list_wrapper :global(svg) {
		fill: white !important;
	}
	.list_wrapper :global(.button_arrow) {
		fill: var(--nord4) !important;
	}
}

h1{
	text-align: center;
	margin-bottom: 2rem;
}
.title_container{
	max-width: 1000px;
	display: flex;
	flex-direction: column;
	margin-inline: auto;
}
.title{
	position: relative;
	width: min(800px, 80vw);
	margin-block: 2rem;
	margin-inline: auto;
	background-color: var(--nord6);
	padding: 1rem 2rem;
}
@media (prefers-color-scheme: dark){
	.title{
		background-color: var(--nord6-dark);
	}
}
.title p{
	border: 2px solid var(--nord1);
	border-radius: 10000px;
	padding: 0.5em 1em;
	font-size: 1.1rem;
	transition: 200ms;
}
.title p:hover,
.title p:focus-within{
	scale: 1.02 1.02;
}
.addendum{
	font-size: 1.1rem;
	max-width: 90%;
	margin-inline: auto;
	border: 2px solid var(--nord1);
	border-radius: 45px;
	padding: 1em 1em;
	transition: 100ms;
}
.addendum:hover,
.addendum:focus-within
{
	scale: 1.02 1.02;
}
.addendum_wrapper{
	max-width: 1000px;
	margin-inline: auto;
}
h3{
	text-align: center;
}
button.action_button{
	animation: unset !important;
	font-size: 1.3rem;
	color: white;
}
.submit_buttons{
	display: flex;
	margin-inline: auto;
	max-width: 1000px;
	margin-block: 1rem;
	justify-content: center;
	align-items: center;
	gap: 2rem;
}
.submit_buttons p{
	padding: 0;
	padding-right: 0.5em;
	margin: 0;
}
@media (prefers-color-scheme: dark){
	:global(body){
		background-color: var(--background-dark);
	}
	:global(.image-management-section) {
		background-color: var(--nord1) !important;
	}
	:global(.image-item) {
		background-color: var(--nord0) !important;
		border-color: var(--nord2) !important;
	}
	:global(.image-item input) {
		background-color: var(--nord2) !important;
		color: white !important;
		border-color: var(--nord3) !important;
	}
}
</style>
<h1>Rezept editieren</h1>
<CardAdd {card_data} {image_preview_url} ></CardAdd>

{#if images && images.length > 0}
<div class="image-management-section" style="background-color: var(--nord6); padding: 1.5rem; margin: 2rem auto; max-width: 800px; border-radius: 10px;">
	<h3 style="margin-top: 0;">🖼️ Bilder & Alt-Texte</h3>
	{#each images as image, i}
		<div class="image-item" style="background-color: white; padding: 1rem; margin-bottom: 1rem; border-radius: 5px; border: 1px solid var(--nord4);">
			<div style="display: flex; gap: 1rem; align-items: start;">
				<img
					src="https://bocken.org/static/rezepte/thumb/{image.mediapath}"
					alt={image.alt || 'Recipe image'}
					style="width: 120px; height: 120px; object-fit: cover; border-radius: 5px;"
				/>
				<div style="flex: 1;">
					<p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--nord3);"><strong>Bild {i + 1}:</strong> {image.mediapath}</p>

					<div style="margin-bottom: 0.75rem;">
						<label for="image-alt-{i}" style="display: block; margin-bottom: 0.25rem; font-weight: bold; font-size: 0.9rem;">Alt-Text (DE):</label>
						<input
							id="image-alt-{i}"
							type="text"
							bind:value={image.alt}
							placeholder="Beschreibung des Bildes für Screenreader (Deutsch)"
							style="width: 100%; padding: 0.5rem; border: 1px solid var(--nord4); border-radius: 3px;"
						/>
					</div>

					<div style="margin-bottom: 0.75rem;">
						<label for="image-caption-{i}" style="display: block; margin-bottom: 0.25rem; font-weight: bold; font-size: 0.9rem;">Caption (DE):</label>
						<input
							id="image-caption-{i}"
							type="text"
							bind:value={image.caption}
							placeholder="Bildunterschrift (optional)"
							style="width: 100%; padding: 0.5rem; border: 1px solid var(--nord4); border-radius: 3px;"
						/>
					</div>

					<GenerateAltTextButton shortName={data.recipe.short_name} imageIndex={i} />
				</div>
			</div>
		</div>
	{/each}
</div>
{/if}

<h3>Kurzname (für URL):</h3>
<input bind:value={short_name} placeholder="Kurzname"/>

<div style="text-align: center; margin: 1rem;">
	<label style="font-size: 1.1rem; cursor: pointer;">
		<input type="checkbox" bind:checked={isBaseRecipe} style="width: auto; display: inline; margin-right: 0.5em;" />
		Als Basisrezept markieren (kann von anderen Rezepten referenziert werden)
	</label>
</div>

{#if isBaseRecipe}
	<div style="background-color: var(--nord14); padding: 1.5rem; margin: 1rem auto; max-width: 600px; border-radius: 10px; border: 2px solid var(--nord9);">
		<h3 style="margin-top: 0; color: var(--nord0);">📋 Basisrezept-Informationen</h3>
		{#await fetch(`/api/rezepte/check-references/${data.recipe._id}`).then(r => r.json())}
			<p style="color: var(--nord3);">Lade Referenzen...</p>
		{:then refData}
			{#if refData.isReferenced}
				<h4 style="color: var(--nord0);">Wird referenziert von:</h4>
				<ul style="color: var(--nord1); list-style-position: inside;">
					{#each refData.references as ref}
						<li>
							<a href="/rezepte/edit/{ref.short_name}" style="color: var(--nord10); font-weight: bold; text-decoration: underline;">
								{ref.name}
							</a>
						</li>
					{/each}
				</ul>
				<p style="color: var(--nord11); font-weight: bold; margin-top: 1rem;">
					⚠️ Änderungen an diesem Basisrezept wirken sich auf alle referenzierenden Rezepte aus.
				</p>
			{:else}
				<p style="color: var(--nord3);">Dieses Basisrezept wird noch nicht referenziert.</p>
			{/if}
		{:catch error}
			<p style="color: var(--nord11);">Fehler beim Laden der Referenzen.</p>
		{/await}
	</div>
{/if}

<div class=title_container>
<div class=title>
<h4>Eine etwas längere Beschreibung:</h4>
<p bind:innerText={preamble} contenteditable></p>
<div class=tags>
<h4>Saison:</h4>
<SeasonSelect></SeasonSelect>
<EditRecipeNote><p contenteditable bind:innerText={note}></p></EditRecipeNote>
</div>

</div>
</div>

<div class=list_wrapper>
<div>
<CreateIngredientList {ingredients}></CreateIngredientList>
</div>
<div>
<CreateStepList {instructions} {add_info}></CreateStepList>
</div>
</div>

<div class=addendum_wrapper>
<h3>Nachtrag:</h3>
<div class=addendum bind:innerText={addendum} contenteditable></div>
</div>

{#if !showTranslationWorkflow}
<div class=submit_buttons>
<button class=action_button onclick={doDelete}><p>Löschen</p><Cross fill=white width=2rem height=2rem></Cross></button>
<button class=action_button onclick={prepareSubmit}><p>Weiter zur Übersetzung</p><Check fill=white width=2rem height=2rem></Check></button>
</div>
{/if}

{#if showTranslationWorkflow}
<div id="translation-section">
	<TranslationApproval
		germanData={getCurrentRecipeData()}
		englishData={translationData}
		oldRecipeData={originalRecipe}
		{changedFields}
		isEditMode={true}
		onapproved={handleTranslationApproved}
		onskipped={handleTranslationSkipped}
		oncancelled={handleTranslationCancelled}
		onforceFullRetranslation={forceFullRetranslation}
	/>
</div>
{/if}

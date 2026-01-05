<script lang='ts'>

import {flip} from "svelte/animate"
import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

import "$lib/css/action_button.css"

import { do_on_key } from '$lib/components/do_on_key.js'
import { portions } from '$lib/js/portions_store.js'
import BaseRecipeSelector from '$lib/components/BaseRecipeSelector.svelte'

let portions_local
portions.subscribe((p) => {
	portions_local = p
});

export function set_portions(){
	portions.update((p) => portions_local)
}

export let lang: 'de' | 'en' = 'de';

// Translation strings
const t = {
	de: {
		portions: 'Portionen:',
		ingredients: 'Zutaten',
		baseRecipe: 'Basisrezept',
		unnamed: 'Unbenannt',
		additionalIngredientsBefore: 'Zusätzliche Zutaten davor:',
		additionalIngredientsAfter: 'Zusätzliche Zutaten danach:',
		addIngredientBefore: 'Zutat davor hinzufügen',
		addIngredientAfter: 'Zutat danach hinzufügen',
		baseRecipeContent: '→ Inhalt vom Basisrezept wird hier eingefügt ←',
		insertBaseRecipe: 'Basisrezept einfügen',
		categoryOptional: 'Kategorie (optional)',
		editIngredient: 'Zutat verändern',
		renameCategory: 'Kategorie umbenennen',
		confirmDeleteReference: 'Bist du dir sicher, dass du diese Referenz löschen möchtest?',
		confirmDeleteList: 'Bist du dir sicher, dass du diese Liste löschen möchtest? Alle Zutaten der Liste werden hiermit auch gelöscht.',
		empty: 'Leer',
		editHeading: 'Überschrift bearbeiten',
		removeList: 'Liste entfernen',
		editIngredientAria: 'Zutat bearbeiten',
		removeIngredientAria: 'Zutat entfernen',
		moveUpAria: 'Nach oben verschieben',
		moveDownAria: 'Nach unten verschieben',
		moveReferenceUpAria: 'Referenz nach oben verschieben',
		moveReferenceDownAria: 'Referenz nach unten verschieben',
		removeReferenceAria: 'Referenz entfernen'
	},
	en: {
		portions: 'Portions:',
		ingredients: 'Ingredients',
		baseRecipe: 'Base Recipe',
		unnamed: 'Unnamed',
		additionalIngredientsBefore: 'Additional ingredients before:',
		additionalIngredientsAfter: 'Additional ingredients after:',
		addIngredientBefore: 'Add ingredient before',
		addIngredientAfter: 'Add ingredient after',
		baseRecipeContent: '→ Base recipe content will be inserted here ←',
		insertBaseRecipe: 'Insert Base Recipe',
		categoryOptional: 'Category (optional)',
		editIngredient: 'Edit Ingredient',
		renameCategory: 'Rename Category',
		confirmDeleteReference: 'Are you sure you want to delete this reference?',
		confirmDeleteList: 'Are you sure you want to delete this list? All ingredients in the list will also be deleted.',
		empty: 'Empty',
		editHeading: 'Edit heading',
		removeList: 'Remove list',
		editIngredientAria: 'Edit ingredient',
		removeIngredientAria: 'Remove ingredient',
		moveUpAria: 'Move up',
		moveDownAria: 'Move down',
		moveReferenceUpAria: 'Move reference up',
		moveReferenceDownAria: 'Move reference down',
		removeReferenceAria: 'Remove reference'
	}
};

export let ingredients

let new_ingredient = {
	amount: "",
	unit: "",
	name: "",
	sublist: "",
}

let edit_ingredient = {
	amount: "",
	unit: "",
	name: "",
	sublist: "",
	list_index: "",
	ingredient_index: "",
}

let edit_heading = {
	name:"",
	list_index: "",
	}

// Base recipe selector state
let showSelector = false;
let insertPosition = 0;

// State for adding items to references
let addingToReference = {
	active: false,
	list_index: -1,
	position: 'before' as 'before' | 'after',
	editing: false,
	item_index: -1
};

function openSelector(position: number) {
	insertPosition = position;
	showSelector = true;
}

function handleSelect(recipe: any, options: any) {
	const reference = {
		type: 'reference',
		name: options.labelOverride || (options.showLabel ? recipe.name : ''),
		baseRecipeRef: recipe._id,
		includeIngredients: options.includeIngredients,
		showLabel: options.showLabel,
		labelOverride: options.labelOverride || '',
		itemsBefore: [],
		itemsAfter: []
	};

	ingredients.splice(insertPosition, 0, reference);
	ingredients = ingredients;
	showSelector = false;
}

export function removeReference(list_index: number) {
	const confirmed = confirm(t[lang].confirmDeleteReference);
	if (confirmed) {
		ingredients.splice(list_index, 1);
		ingredients = ingredients;
	}
}

// Functions to manage items before/after base recipe in references
function addItemToReference(list_index: number, position: 'before' | 'after', item: any) {
	if (!ingredients[list_index].itemsBefore) ingredients[list_index].itemsBefore = [];
	if (!ingredients[list_index].itemsAfter) ingredients[list_index].itemsAfter = [];

	if (position === 'before') {
		ingredients[list_index].itemsBefore.push(item);
	} else {
		ingredients[list_index].itemsAfter.push(item);
	}
	ingredients = ingredients;
}

function removeItemFromReference(list_index: number, position: 'before' | 'after', item_index: number) {
	if (position === 'before') {
		ingredients[list_index].itemsBefore.splice(item_index, 1);
	} else {
		ingredients[list_index].itemsAfter.splice(item_index, 1);
	}
	ingredients = ingredients;
}

function editItemFromReference(list_index: number, position: 'before' | 'after', item_index: number) {
	const items = position === 'before' ? ingredients[list_index].itemsBefore : ingredients[list_index].itemsAfter;
	const item = items[item_index];

	// Set up edit state
	addingToReference = {
		active: true,
		list_index,
		position,
		editing: true,
		item_index
	};

	edit_ingredient = {
		amount: item.amount || "",
		unit: item.unit || "",
		name: item.name || "",
		sublist: "",
		list_index: "",
		ingredient_index: "",
	};

	const modal_el = document.querySelector("#edit_ingredient_modal") as HTMLDialogElement;
	if (modal_el) {
		modal_el.showModal();
	}
}

function openAddToReferenceModal(list_index: number, position: 'before' | 'after') {
	addingToReference = {
		active: true,
		list_index,
		position,
		editing: false,
		item_index: -1
	};
	// Clear and open the edit ingredient modal for adding
	edit_ingredient = {
		amount: "",
		unit: "",
		name: "",
		sublist: "",
		list_index: "",
		ingredient_index: "",
	};
	const modal_el = document.querySelector("#edit_ingredient_modal") as HTMLDialogElement;
	if (modal_el) {
		modal_el.showModal();
	}
}

function get_sublist_index(sublist_name, list){
	for(var i =0; i < list.length; i++){
		if(list[i].name == sublist_name){
			return i
		}
	}
	return -1
}
export function show_modal_edit_subheading_ingredient(list_index){
	edit_heading.name = ingredients[list_index].name
	edit_heading.list_index = list_index
	const el = document.querySelector('#edit_subheading_ingredient_modal')
	el.showModal()
}
export function edit_subheading_and_close_modal(){
	ingredients[edit_heading.list_index].name = edit_heading.name
	const el = document.querySelector('#edit_subheading_ingredient_modal')
	el.close()
}

function handleIngredientModalCancel() {
	// Reset reference adding state when modal is cancelled (Escape key)
	addingToReference = {
		active: false,
		list_index: -1,
		position: 'before',
		editing: false,
		item_index: -1
	};
}

export function add_new_ingredient(){
	if(!new_ingredient.name){
		return
	}
	let list_index = get_sublist_index(new_ingredient.sublist, ingredients)
	if(list_index == -1){
		ingredients.push({
			name: new_ingredient.sublist,
			list: [],
		})
		list_index = ingredients.length - 1
	}
	ingredients[list_index].list.push({ ...new_ingredient})
	ingredients = ingredients //tells svelte to update dom
}
export function remove_list(list_index){
	if(ingredients[list_index].list.length > 1){
		const response = confirm(t[lang].confirmDeleteList);
		if(!response){
			return
		}
	}
	ingredients.splice(list_index, 1);
	ingredients = ingredients //tells svelte to update dom
}
export function remove_ingredient(list_index, ingredient_index){
	ingredients[list_index].list.splice(ingredient_index, 1)
	ingredients = ingredients //tells svelte to update dom
}

export function show_modal_edit_ingredient(list_index, ingredient_index){
	edit_ingredient = {...ingredients[list_index].list[ingredient_index]}
	edit_ingredient.list_index = list_index
	edit_ingredient.ingredient_index = ingredient_index
	edit_ingredient.sublist = ingredients[list_index].name
	const modal_el = document.querySelector("#edit_ingredient_modal");
	modal_el.showModal();
}
export function edit_ingredient_and_close_modal(){
	// Check if we're adding to or editing a reference
	if (addingToReference.active) {
		// Don't add empty ingredients
		if (!edit_ingredient.name) {
			addingToReference = {
				active: false,
				list_index: -1,
				position: 'before',
				editing: false,
				item_index: -1
			};
			const modal_el = document.querySelector("#edit_ingredient_modal") as HTMLDialogElement;
			if (modal_el) {
				setTimeout(() => modal_el.close(), 0);
			}
			return;
		}

		const item = {
			amount: edit_ingredient.amount,
			unit: edit_ingredient.unit,
			name: edit_ingredient.name
		};

		if (addingToReference.editing) {
			// Edit existing item in reference
			const items = addingToReference.position === 'before'
				? ingredients[addingToReference.list_index].itemsBefore
				: ingredients[addingToReference.list_index].itemsAfter;
			items[addingToReference.item_index] = item;
			ingredients = ingredients;
		} else {
			// Add new item to reference
			addItemToReference(addingToReference.list_index, addingToReference.position, item);
		}
		addingToReference = {
			active: false,
			list_index: -1,
			position: 'before',
			editing: false,
			item_index: -1
		};
	} else {
		// Normal edit behavior
		ingredients[edit_ingredient.list_index].list[edit_ingredient.ingredient_index] = {
			amount: edit_ingredient.amount,
			unit: edit_ingredient.unit,
			name: edit_ingredient.name,
		}
		ingredients[edit_ingredient.list_index].name = edit_ingredient.sublist
	}
	const modal_el = document.querySelector("#edit_ingredient_modal") as HTMLDialogElement;
	if (modal_el) {
		// Defer closing to next tick to ensure all bindings are updated
		setTimeout(() => modal_el.close(), 0);
	}
}
export function update_list_position(list_index, direction){
	if(direction == 1){
		if(list_index == 0){
			return
		}
		ingredients.splice(list_index - 1, 0, ingredients.splice(list_index, 1)[0])
	}
	else if(direction == -1){
		if(list_index == ingredients.length - 1){
			return
		}
		ingredients.splice(list_index + 1, 0, ingredients.splice(list_index, 1)[0])
	}
	ingredients = ingredients //tells svelte to update dom
}
export function update_ingredient_position(list_index, ingredient_index, direction){
	if(direction == 1){
		if(ingredient_index == 0){
			return
		}
		ingredients[list_index].list.splice(ingredient_index - 1, 0, ingredients[list_index].list.splice(ingredient_index, 1)[0])
	}
	else if(direction == -1){
		if(ingredient_index == ingredients[list_index].list.length - 1){
			return
		}
		ingredients[list_index].list.splice(ingredient_index + 1, 0, ingredients[list_index].list.splice(ingredient_index, 1)[0])
	}
	ingredients = ingredients //tells svelte to update dom
}

</script>

<style>
input::placeholder{
	color: inherit;
}
input{
	color: unset;
	font-size: unset;
	padding: unset;
	background-color: unset;
}

input.heading{
	all: unset;
	box-sizing: border-box;
	background-color: var(--nord0);
	padding: 1rem;
	padding-inline: 2rem;
	font-size: 1.5rem;
	width: 100%;
	border-radius: 1000px;
	color: white;
	justify-content: center;
	align-items: center;
	transition: 200ms;
}
input.heading:hover{
	background-color: var(--nord1);
}

.heading_wrapper{
	position: relative;
	width: 300px;
	margin-inline: auto;
	transition: 200ms;
}
.heading_wrapper:hover
{
	transform:scale(1.1,1.1);
}

.heading_wrapper button{
	position: absolute;
	bottom: -1.5rem;
	right: -2rem;
}
.adder{
	box-sizing: border-box;
	margin-inline: auto;
	position: relative;
	margin-block: 3rem;
	width: 90%;
	border-radius: 20px;
	transition: 200ms;
}
.shadow{
	box-shadow: 0 0 1em 0.2em rgba(0,0,0,0.3);
}
.shadow:hover{
	box-shadow: 0 0 1em 0.4em rgba(0,0,0,0.3);
}
.adder button{
	position: absolute;
	right: -1.5rem;
	bottom: -1.5rem;
}
.category{
	border: none;
	position: absolute;
	--font_size: 1.5rem;
	top: -1em;
	left: -1em;
	font-family: sans-serif;
	font-size: 1.5rem;
	background-color: var(--nord0);
	color: var(--nord4);
	border-radius: 1000000px;
	width: 23ch;
	padding: 0.5em 1em;
	transition: 100ms;
	box-shadow: 0.5em 0.5em 1em 0.4em rgba(0,0,0,0.3);
}
.category:hover{
	background-color: var(--nord1);
	transform: scale(1.05,1.05);
}
.adder:hover,
.adder:focus-within
{
	transform: scale(1.05, 1.05);
}

.add_ingredient{
	font-family: sans-serif;
	width: 100%;
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	font-size: 1.2rem;
	padding: 2rem;
	padding-top: 2.5rem;
	border-radius: 20px;
	background-color: var(--blue);
	color: #bbb;
	transition: 200ms;
	gap: 0.5rem;
}
.add_ingredient input{
	border: 2px solid var(--nord4);
	color: var(--nord4);
	border-radius: 1000px;
	padding: 0.5em 1em;
	transition: 100ms;
}
.add_ingredient input:hover,
.add_ingredient input:focus-visible
{
	border-color: white;
	color: white;
	transform: scale(1.02, 1.02);

}
.add_ingredient input:nth-of-type(1){
	max-width: 8ch;
}
.add_ingredient input:nth-of-type(2){
	max-width: 8ch;
}
.add_ingredient input:nth-of-type(3){
	max-width: 30ch;
}

dialog{
	box-sizing: content-box;
	width: 100%;
	height: 100%;
	background-color: transparent;
	border: unset;
	margin: 0;
	transition: 500ms;
}
dialog[open]::backdrop{
    animation: show 200ms ease forwards;
}
@keyframes show{
    from {
	backdrop-filter: blur(0px);
    }
    to {
	backdrop-filter: blur(10px);
    }
}
dialog .adder{
	margin-top: 5rem;
}
dialog h2{
	font-size: 3rem;
	font-family: sans-serif;
	color: white;
	text-align: center;
	margin-top: 30vh;
	margin-top: 30dvh;
	filter: drop-shadow(0 0 0.4em black)
		drop-shadow(0 0 1em black)
		;
}
.mod_icons{
	display: flex;
	flex-direction: row;
}
.button_subtle{
	padding: 0em;
	animation: unset;
	margin: 0.2em 0.1em;
	background-color: transparent;
	box-shadow: unset;
}
.button_subtle:hover{
	scale: 1.2 1.2;
}
.move_buttons_container{
	display: flex;
	flex-direction: column;
}
.move_buttons_container button{
	background-color: transparent;
	border: none;
	padding: 0;
	margin: 0;
	transition: 200ms;
}
.move_buttons_container button:hover{
	scale: 1.4;
}
h3{
	width: fit-content;
	display: flex;
	flex-direction: row;
	align-items: center;
	max-width: 1000px;
	justify-content: space-between;
	user-select: none;
	cursor: pointer;
	gap: 1em;
}
.ingredients_grid{
	box-sizing: border-box;
	display: grid;
	font-size: 1.1em;
	grid-template-columns: 0.5fr 2fr 3fr 1fr;
	grid-template-rows: auto;
	grid-auto-flow: row;
	align-items: center;
	row-gap: 0.5em;
	column-gap: 0.5em;
}

.ingredients_grid > *{
	cursor: pointer;
	user-select: none;
}
.ingredients_grid>*:nth-child(3n+1){
	min-width: 5ch;
}

.list_wrapper{
	padding-inline: 2em;
	padding-block: 1em;
}
.list_wrapper p[contenteditable]{
	border: 2px solid grey;
	border-radius: 1000px;
	padding: 0.25em 1em;
	background-color: white;
	transition: 200ms;
}
.list_wrapper p[contenteditable]:hover,
.list_wrapper p[contenteditable]:focus-within{
	scale: 1.05 1.05;
}
@media screen and (max-width: 500px){
	dialog h2{
	margin-top: 2rem;
	}
	dialog .heading_wrapper{
		width: 80%;
	}
	.ingredients_grid .mod_icons{
		margin-left: 0;
	}
}
.force_wrap{
	overflow-wrap: break-word;
}
.button_arrow{
	fill: var(--nord1);
}
@media (prefers-color-scheme: dark){
	.button_arrow{
		fill: var(--nord4);
	}
	.list_wrapper p[contenteditable]{
		background-color: var(--accent-dark);

	}
}

/* Styling for converted div-to-button elements */
.subheading-button {
	all: unset;
	cursor: pointer;
	user-select: none;
	display: block;
	width: 100%;
	text-align: left;
}

.ingredient-amount-button, .ingredient-name-button {
	all: unset;
	cursor: pointer;
	user-select: none;
	display: block;
	width: 100%;
	text-align: left;
}

/* Base recipe reference styles */
.reference-container {
	margin-block: 1em;
	padding: 1em;
	background-color: var(--nord14);
	border-radius: 10px;
	border: 2px solid var(--nord9);
	box-shadow: 0 0 0.5em 0.1em rgba(0,0,0,0.2);
}

.reference-header {
	display: flex;
	align-items: center;
	gap: 1em;
	margin-bottom: 0.5em;
}

.reference-badge {
	flex-grow: 1;
	font-weight: bold;
	color: var(--nord0);
	font-size: 1.1rem;
}

@media (prefers-color-scheme: dark) {
	.reference-container {
		background-color: var(--nord1);
	}
	.reference-badge {
		color: var(--nord6);
	}
}

.insert-base-recipe-button {
	margin-block: 1rem;
	padding: 1em 2em;
	font-size: 1.1rem;
	border-radius: 1000px;
	background-color: var(--nord9);
	color: white;
	border: none;
	cursor: pointer;
	transition: 200ms;
	box-shadow: 0 0 0.5em 0.1em rgba(0,0,0,0.2);
}

.insert-base-recipe-button:hover {
	transform: scale(1.05, 1.05);
	box-shadow: 0 0 1em 0.2em rgba(0,0,0,0.3);
}

.add-to-reference-button {
	color: white;
}

.add-to-reference-button:hover {
	scale: 1.02 1.02 !important;
	transform: scale(1.02) !important;
}
</style>

<div class=list_wrapper >
<h4>{t[lang].portions}</h4>
<p contenteditable type="text" bind:innerText={portions_local} onblur={set_portions}></p>

<h2>{t[lang].ingredients}</h2>
{#each ingredients as list, list_index}
	{#if list.type === 'reference'}
		<!-- Reference item display -->
		<div class="reference-container">
			<div class="reference-header">
				<div class="move_buttons_container">
					<button onclick={() => update_list_position(list_index, 1)} aria-label={t[lang].moveReferenceUpAria}>
						<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
					</button>
					<button onclick={() => update_list_position(list_index, -1)} aria-label={t[lang].moveReferenceDownAria}>
						<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
					</button>
				</div>
				<div class="reference-badge">
					📋 {t[lang].baseRecipe}: {list.name || t[lang].unnamed}
				</div>
				<div class="mod_icons">
					<button class="action_button button_subtle" onclick={() => removeReference(list_index)} aria-label={t[lang].removeReferenceAria}>
						<Cross fill="var(--nord11)"></Cross>
					</button>
				</div>
			</div>

			<!-- Items before base recipe -->
			{#if list.itemsBefore && list.itemsBefore.length > 0}
				<h4 style="margin-block: 0.5em; color: var(--nord9);">{t[lang].additionalIngredientsBefore}</h4>
				<div class="ingredients_grid">
					{#each list.itemsBefore as item, item_index}
						<div class=move_buttons_container>
							<!-- Empty for consistency -->
						</div>
						<button onclick={() => editItemFromReference(list_index, 'before', item_index)} class="ingredient-amount-button">
							{item.amount} {item.unit}
						</button>
						<button class="force_wrap ingredient-name-button" onclick={() => editItemFromReference(list_index, 'before', item_index)}>
							{@html item.name}
						</button>
						<div class="mod_icons">
							<button class="action_button button_subtle" onclick={() => editItemFromReference(list_index, 'before', item_index)} aria-label={t[lang].editIngredientAria}>
								<Pen fill="var(--nord6)" height="1em" width="1em"></Pen>
							</button>
							<button class="action_button button_subtle" onclick={() => removeItemFromReference(list_index, 'before', item_index)} aria-label={t[lang].removeIngredientAria}>
								<Cross fill="var(--nord6)" height="1em" width="1em"></Cross>
							</button>
						</div>
					{/each}
				</div>
			{/if}
			<button class="action_button button_subtle add-to-reference-button" onclick={() => openAddToReferenceModal(list_index, 'before')}>
				<Plus fill="var(--nord9)" height="1em" width="1em"></Plus> {t[lang].addIngredientBefore}
			</button>

			<!-- Base recipe content indicator -->
			<div style="text-align: center; padding: 0.5em; margin: 0.5em 0; font-style: italic; color: var(--nord10); background-color: rgba(143, 188, 187, 0.4); border-radius: 5px;">
				{t[lang].baseRecipeContent}
			</div>

			<!-- Items after base recipe -->
			<button class="action_button button_subtle add-to-reference-button" onclick={() => openAddToReferenceModal(list_index, 'after')}>
				<Plus fill="var(--nord9)" height="1em" width="1em"></Plus> {t[lang].addIngredientAfter}
			</button>
			{#if list.itemsAfter && list.itemsAfter.length > 0}
				<h4 style="margin-block: 0.5em; color: var(--nord9);">{t[lang].additionalIngredientsAfter}</h4>
				<div class="ingredients_grid">
					{#each list.itemsAfter as item, item_index}
						<div class=move_buttons_container>
							<!-- Empty for consistency -->
						</div>
						<button onclick={() => editItemFromReference(list_index, 'after', item_index)} class="ingredient-amount-button">
							{item.amount} {item.unit}
						</button>
						<button class="force_wrap ingredient-name-button" onclick={() => editItemFromReference(list_index, 'after', item_index)}>
							{@html item.name}
						</button>
						<div class="mod_icons">
							<button class="action_button button_subtle" onclick={() => editItemFromReference(list_index, 'after', item_index)} aria-label={t[lang].editIngredientAria}>
								<Pen fill="var(--nord6)" height="1em" width="1em"></Pen>
							</button>
							<button class="action_button button_subtle" onclick={() => removeItemFromReference(list_index, 'after', item_index)} aria-label={t[lang].removeIngredientAria}>
								<Cross fill="var(--nord6)" height="1em" width="1em"></Cross>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<h3>
		<div class=move_buttons_container>
			<button onclick="{() => update_list_position(list_index, 1)}" aria-label="Liste nach oben verschieben">
							<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
					</button>
			<button  onclick="{() => update_list_position(list_index, -1)}" aria-label="Liste nach unten verschieben">
							<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
			</button>
		</div>

		<button onclick="{() => show_modal_edit_subheading_ingredient(list_index)}" class="subheading-button">
		{#if list.name }
			{list.name}
		{:else}
			{t[lang].empty}
		{/if}
		</button>
		<div class=mod_icons>
			<button class="action_button button_subtle" onclick="{() => show_modal_edit_subheading_ingredient(list_index)}" aria-label={t[lang].editHeading}>
				<Pen fill=var(--nord1)></Pen>	</button>
			<button class="action_button button_subtle" onclick="{() => remove_list(list_index)}" aria-label={t[lang].removeList}>
				<Cross fill=var(--nord1)></Cross></button>
		</div>
		</h3>
		<div class=ingredients_grid>
		{#each list.list as ingredient, ingredient_index (ingredient_index)}
		<div class=move_buttons_container>
			<button onclick="{() => update_ingredient_position(list_index, ingredient_index, 1)}" aria-label={t[lang].moveUpAria}>
                	        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                	</button>
			<button  onclick="{() => update_ingredient_position(list_index, ingredient_index, -1)}" aria-label={t[lang].moveDownAria}>
                	        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
			</button>
		</div>
		<button onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)} class="ingredient-amount-button">
			{ingredient.amount} {ingredient.unit}
		</button>
		<button class="force_wrap ingredient-name-button" onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)}>
			{@html ingredient.name}
		</button>
		<div class=mod_icons><button class="action_button button_subtle" onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)} aria-label={t[lang].editIngredientAria}>
			<Pen fill=var(--nord1) height=1em width=1em></Pen></button>
			<button class="action_button button_subtle" onclick="{() => remove_ingredient(list_index, ingredient_index)}" aria-label={t[lang].removeIngredientAria}><Cross fill=var(--nord1) height=1em width=1em></Cross></button></div>
	{/each}
		</div>
	{/if}
{/each}

<!-- Button to insert base recipe -->
<button class="insert-base-recipe-button" onclick={() => openSelector(ingredients.length)}>
	<Plus fill="white" style="display: inline; width: 1.5em; height: 1.5em; vertical-align: middle;"></Plus>
	{t[lang].insertBaseRecipe}
</button>
</div>

<div class="adder shadow">
	<input class=category type="text" bind:value={new_ingredient.sublist} placeholder={t[lang].categoryOptional} onkeydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<div class=add_ingredient>
		<input type="text"  placeholder="250..." bind:value={new_ingredient.amount} onkeydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="mL..." bind:value={new_ingredient.unit} onkeydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="Milch..." bind:value={new_ingredient.name} onkeydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<button onclick={() => add_new_ingredient()} class=action_button>
			<Plus fill=white style="width: 2rem; height: 2rem;"></Plus>
		</button>
	</div>
</div>
<dialog id=edit_ingredient_modal oncancel={handleIngredientModalCancel}>
	<h2>{t[lang].editIngredient}</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_ingredient.sublist} placeholder={t[lang].categoryOptional}>
	<div class=add_ingredient role="group">
	<input type="text" placeholder="250..." bind:value={edit_ingredient.amount} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<input type="text" placeholder="mL..." bind:value={edit_ingredient.unit} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<input type="text" placeholder="Milch..." bind:value={edit_ingredient.name} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<button class=action_button onkeydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)} onclick={edit_ingredient_and_close_modal}>
		<Check fill=white style="width: 2rem; height: 2rem;"></Check>
		</button>
	</div>
	</div>
</dialog>

<dialog id=edit_subheading_ingredient_modal>
	<h2>{t[lang].renameCategory}</h2>
	<div class=heading_wrapper>
		<input class=heading type="text" bind:value={edit_heading.name} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} >
		<button class=action_button onkeydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} onclick={edit_subheading_and_close_modal}>
		<Check fill=white style="width:2rem; height:2rem;"></Check>
		</button>
	</div>
</dialog>

<!-- Base recipe selector -->
<BaseRecipeSelector
	type="ingredients"
	onSelect={handleSelect}
	bind:open={showSelector}
/>

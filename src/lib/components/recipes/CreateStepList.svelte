<script lang='ts'>

import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'
import Timer from '@lucide/svelte/icons/timer';
import Wheat from '@lucide/svelte/icons/wheat';
import Croissant from '@lucide/svelte/icons/croissant';
import Flame from '@lucide/svelte/icons/flame';
import CookingPot from '@lucide/svelte/icons/cooking-pot';
import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
import "$lib/css/action_button.css"

import { do_on_key } from '$lib/components/recipes/do_on_key.js'
import { confirm } from '$lib/js/confirmDialog.svelte'
import BaseRecipeSelector from '$lib/components/recipes/BaseRecipeSelector.svelte'

let { lang = 'de' as 'de' | 'en', instructions = $bindable(), add_info = $bindable() } = $props<{ lang?: 'de' | 'en', instructions: any, add_info: any }>();

const BAKING_MODES: Record<string, string[]> = {
	de: ['Ober-/Unterhitze', 'Umluft', 'Grill', 'Dampf'],
	en: ['Conventional', 'Convection', 'Grill', 'Steam'],
};

// svelte-ignore state_referenced_locally
let bakingExpanded = $state<boolean>(
	!(add_info?.baking?.length || add_info?.baking?.temperature || add_info?.baking?.mode)
);
let bakingHasData = $derived(
	!!(add_info?.baking?.length || add_info?.baking?.temperature || add_info?.baking?.mode)
);

function toggleBaking() {
	bakingExpanded = !bakingExpanded;
}
function pickBakingMode(mode: string) {
	if (!add_info.baking) add_info.baking = { length: '', temperature: '', mode: '' };
	add_info.baking.mode = add_info.baking.mode === mode ? '' : mode;
}

// Translation strings
const t: Record<string, Record<string, string>> = {
	de: {
		preparation: 'Vorbereitung:',
		bulkFermentation: 'Stockgare:',
		finalFermentation: 'Stückgare:',
		baking: 'Backen:',
		cooking: 'Kochen:',
		totalTime: 'Auf dem Teller:',
		instructions: 'Zubereitung',
		baseRecipe: 'Basisrezept',
		unnamed: 'Unbenannt',
		additionalStepsBefore: 'Zusätzliche Schritte davor:',
		additionalStepsAfter: 'Zusätzliche Schritte danach:',
		addStepBefore: 'Schritt davor hinzufügen',
		addStepAfter: 'Schritt danach hinzufügen',
		baseRecipeContent: '→ Inhalt vom Basisrezept wird hier eingefügt ←',
		insertBaseRecipe: 'Basisrezept einfügen',
		categoryOptional: 'Kategorie (optional)',
		subcategoryOptional: 'Unterkategorie (optional)',
		editStep: 'Schritt verändern',
		renameCategory: 'Kategorie umbenennen',
		confirmDeleteReference: 'Bist du dir sicher, dass du diese Referenz löschen möchtest?',
		confirmDeleteList: 'Bist du dir sicher, dass du diese Liste löschen möchtest? Alle Zubereitungsschritte der Liste werden hiermit auch gelöscht.',
		empty: 'Leer',
		editHeading: 'Überschrift bearbeiten',
		removeList: 'Liste entfernen',
		editStepAria: 'Schritt bearbeiten',
		removeStepAria: 'Schritt entfernen',
		moveUpAria: 'Nach oben verschieben',
		moveDownAria: 'Nach unten verschieben',
		moveReferenceUpAria: 'Referenz nach oben verschieben',
		moveReferenceDownAria: 'Referenz nach unten verschieben',
		removeReferenceAria: 'Referenz entfernen',
		moveListUpAria: 'Liste nach oben verschieben',
		moveListDownAria: 'Liste nach unten verschieben',
		notSet: 'Nicht gesetzt',
		duration: 'Dauer',
		temperature: 'Temperatur',
		mode: 'Modus',
		customModePlaceholder: 'oder eigenen Modus eingeben…'
	},
	en: {
		preparation: 'Preparation:',
		bulkFermentation: 'Bulk Fermentation:',
		finalFermentation: 'Final Fermentation:',
		baking: 'Baking:',
		cooking: 'Cooking:',
		totalTime: 'Total Time:',
		instructions: 'Instructions',
		baseRecipe: 'Base Recipe',
		unnamed: 'Unnamed',
		additionalStepsBefore: 'Additional steps before:',
		additionalStepsAfter: 'Additional steps after:',
		addStepBefore: 'Add step before',
		addStepAfter: 'Add step after',
		baseRecipeContent: '→ Base recipe content will be inserted here ←',
		insertBaseRecipe: 'Insert Base Recipe',
		categoryOptional: 'Category (optional)',
		subcategoryOptional: 'Subcategory (optional)',
		editStep: 'Edit Step',
		renameCategory: 'Rename Category',
		confirmDeleteReference: 'Are you sure you want to delete this reference?',
		confirmDeleteList: 'Are you sure you want to delete this list? All preparation steps in the list will also be deleted.',
		empty: 'Empty',
		editHeading: 'Edit heading',
		removeList: 'Remove list',
		editStepAria: 'Edit step',
		removeStepAria: 'Remove step',
		moveUpAria: 'Move up',
		moveDownAria: 'Move down',
		moveReferenceUpAria: 'Move reference up',
		moveReferenceDownAria: 'Move reference down',
		removeReferenceAria: 'Remove reference',
		moveListUpAria: 'Move list up',
		moveListDownAria: 'Move list down',
		notSet: 'Not set',
		duration: 'Duration',
		temperature: 'Temperature',
		mode: 'Mode',
		customModePlaceholder: 'or enter custom mode…'
	}
};

const step_placeholder = "Kartoffeln schälen..."

let new_step = $state({
	name: "",
	step: step_placeholder
	});

let edit_heading = $state({
	name:"",
	list_index: "",
	});

// Base recipe selector state
let showSelector = $state(false);
let insertPosition = $state(0);

// State for adding steps to references
let addingToReference = $state({
	active: false,
	list_index: -1,
	position: 'before' as 'before' | 'after',
	editing: false,
	step_index: -1
});

function openSelector(position: number) {
	insertPosition = position;
	showSelector = true;
}

function handleSelect(recipe: any, options: any) {
	const reference = {
		type: 'reference',
		name: options.labelOverride || (options.showLabel ? recipe.name : ''),
		baseRecipeRef: recipe._id,
		includeInstructions: options.includeInstructions,
		showLabel: options.showLabel,
		labelOverride: options.labelOverride || '',
		baseMultiplier: options.baseMultiplier || 1,
		stepsBefore: [],
		stepsAfter: []
	};

	instructions.splice(insertPosition, 0, reference);
	instructions = instructions;
	showSelector = false;
}

export async function removeReference(list_index: number) {
	const confirmed = await confirm(t[lang].confirmDeleteReference);
	if (confirmed) {
		instructions.splice(list_index, 1);
		instructions = instructions;
	}
}

// Functions to manage steps before/after base recipe in references
function addStepToReference(list_index: number, position: 'before' | 'after', step: string) {
	if (!instructions[list_index].stepsBefore) instructions[list_index].stepsBefore = [];
	if (!instructions[list_index].stepsAfter) instructions[list_index].stepsAfter = [];

	if (position === 'before') {
		instructions[list_index].stepsBefore.push(step);
	} else {
		instructions[list_index].stepsAfter.push(step);
	}
	instructions = instructions;
}

function removeStepFromReference(list_index: number, position: 'before' | 'after', step_index: number) {
	if (position === 'before') {
		instructions[list_index].stepsBefore.splice(step_index, 1);
	} else {
		instructions[list_index].stepsAfter.splice(step_index, 1);
	}
	instructions = instructions;
}

function editStepFromReference(list_index: number, position: 'before' | 'after', step_index: number) {
	const steps = position === 'before' ? instructions[list_index].stepsBefore : instructions[list_index].stepsAfter;
	const step = steps[step_index];

	// Set up edit state
	addingToReference = {
		active: true,
		list_index,
		position,
		editing: true,
		step_index
	};

	edit_step = {
		step: step || "",
		name: "",
		list_index: 0,
		step_index: 0,
	};

	const modal_el = document.querySelector(`#edit_step_modal-${lang}`) as HTMLDialogElement;
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
		step_index: -1
	};
	// Clear and open the edit step modal for adding
	edit_step = {
		step: "",
		name: "",
		list_index: 0,
		step_index: 0,
	};
	const modal_el = document.querySelector(`#edit_step_modal-${lang}`) as HTMLDialogElement;
	if (modal_el) {
		modal_el.showModal();
	}
}

function get_sublist_index(sublist_name: string, list: any[]){
	for(var i =0; i < list.length; i++){
		if(list[i].name == sublist_name){
			return i
		}
	}
	return -1
}
export async function remove_list(list_index: number){
	if(instructions[list_index].steps.length > 1){
		const response = await confirm(t[lang].confirmDeleteList);
		if(!response){
			return
		}
	}
	instructions.splice(list_index, 1);
	instructions = instructions //tells svelte to update dom
}

export function add_new_step(){
	if(new_step.step == step_placeholder){
		return
	}
	let list_index = get_sublist_index(new_step.name, instructions)
	if(list_index == -1){
		instructions.push({
			name: new_step.name,
			steps: [ new_step.step ],
		})
		list_index = instructions.length - 1
	}
	else{
		instructions[list_index].steps.push(new_step.step)
	}
	const el = document.querySelector("#step") as HTMLElement | null;
	if (el) el.innerHTML = ""
	new_step.step = ""
	instructions = instructions //tells svelte to update dom
}

export function remove_step(list_index: number, step_index: number){
	instructions[list_index].steps.splice(step_index, 1)
	instructions = instructions //tells svelte to update dom
}

let edit_step = $state({
	name: "",
	step: "",
	list_index: 0,
	step_index: 0,
});
export function show_modal_edit_step(list_index: number, step_index: number){
	edit_step = {
		step: instructions[list_index].steps[step_index],
		name: instructions[list_index].name,
		list_index,
		step_index,
	}
	const modal_el = document.querySelector(`#edit_step_modal-${lang}`) as HTMLDialogElement | null;
	if (modal_el) modal_el.showModal();
}

export function edit_step_and_close_modal(){
	// Check if we're adding to or editing a reference
	if (addingToReference.active) {
		// Don't add empty steps
		if (!edit_step.step || edit_step.step.trim() === '') {
			addingToReference = {
				active: false,
				list_index: -1,
				position: 'before',
				editing: false,
				step_index: -1
			};
			const modal_el = document.querySelector(`#edit_step_modal-${lang}`) as HTMLDialogElement;
			if (modal_el) {
				setTimeout(() => modal_el.close(), 0);
			}
			return;
		}

		if (addingToReference.editing) {
			// Edit existing step in reference
			const steps = addingToReference.position === 'before'
				? instructions[addingToReference.list_index].stepsBefore
				: instructions[addingToReference.list_index].stepsAfter;
			steps[addingToReference.step_index] = edit_step.step;
			instructions = instructions;
		} else {
			// Add new step to reference
			addStepToReference(addingToReference.list_index, addingToReference.position, edit_step.step);
		}
		addingToReference = {
			active: false,
			list_index: -1,
			position: 'before',
			editing: false,
			step_index: -1
		};
	} else {
		// Normal edit behavior
		instructions[edit_step.list_index].steps[edit_step.step_index] = edit_step.step
	}
	const modal_el = document.querySelector(`#edit_step_modal-${lang}`) as HTMLDialogElement;
	if (modal_el) {
		// Defer closing to next tick to ensure all bindings are updated
		setTimeout(() => modal_el.close(), 0);
	}
}

export function show_modal_edit_subheading_step(list_index: number){
	edit_heading.name = instructions[list_index].name
	edit_heading.list_index = String(list_index)
	const el = document.querySelector(`#edit_subheading_steps_modal-${lang}`) as HTMLDialogElement | null;
	if (el) el.showModal()
}

export function edit_subheading_steps_and_close_modal(){
	instructions[Number(edit_heading.list_index)].name = edit_heading.name
	const modal_el = document.querySelector(`#edit_subheading_steps_modal-${lang}`) as HTMLDialogElement | null;
	if (modal_el) modal_el.close();
}

function handleStepModalCancel() {
	// Reset reference adding state when modal is cancelled (Escape key)
	addingToReference = {
		active: false,
		list_index: -1,
		position: 'before',
		editing: false,
		step_index: -1
	};
}


export function clear_step(){
	const el = document.querySelector("#step") as HTMLElement | null;
	if(el && el.innerHTML == step_placeholder){
		el.innerHTML = ""
	}
}
export function add_placeholder(){
	const el = document.querySelector("#step") as HTMLElement | null;
	if(el && el.innerHTML == ""){
		el.innerHTML = step_placeholder
	}
}

export function update_list_position(list_index: number, direction: number){
	if(direction == 1){
		if(list_index == 0){
			return
		}
		instructions.splice(list_index - 1, 0, instructions.splice(list_index, 1)[0])
	}
	else if(direction == -1){
		if(list_index == instructions.length - 1){
			return
		}
		instructions.splice(list_index + 1, 0, instructions.splice(list_index, 1)[0])
	}
	instructions = instructions //tells svelte to update dom
}
export function update_step_position(list_index: number, step_index: number, direction: number){
	if(direction == 1){
		if(step_index == 0){
			return
		}
		instructions[list_index].steps.splice(step_index - 1, 0, instructions[list_index].steps.splice(step_index, 1)[0])
	}
	else if(direction == -1){
		if(step_index == instructions[list_index].steps.length - 1){
			return
		}
		instructions[list_index].steps.splice(step_index + 1, 0, instructions[list_index].steps.splice(step_index, 1)[0])
	}
	instructions = instructions //tells svelte to update dom
}
</script>

<style>
.move_buttons_container{
	display: inline-flex;
	flex-direction: column;
}
.move_buttons_container button{
	background-color: transparent;
	border: none;
	padding: 0;
	margin: 0;
	transition: var(--transition-normal);
}
.move_buttons_container button:hover{
	scale: 1.4;
}
.step_move_buttons{
	position: absolute;
	left: -2.5rem;
	flex-direction: column;
}
input::placeholder{
	all:unset;
}

li {
	position: relative;
}
li > div{
	display:flex;
	flex-direction: row;
	justify-items: space-between;
	align-items:center;
	user-select: none;
}
li > div > div:first-child{
	flex-grow: 1;
	cursor: pointer;
}
li > div > div:last-child{
	display: flex;
	flex-direction: row;
}
input.heading{
	box-sizing: border-box;
	background-color: var(--nord0);
	padding: 1rem;
	padding-inline: 2rem;
	font-size: 1.5rem;
	width: 100%;
	border-radius: var(--radius-pill);
	color: white;
	justify-content: center;
	align-items: center;
	transition: var(--transition-normal);
}
input.heading:hover,
input.heading:focus-visible
{
	background-color: var(--nord1);
}

.heading_wrapper{
	position: relative;
	width: min(300px, 95dvw);
	margin-inline: auto;
	transition: var(--transition-normal);
}
.heading_wrapper:hover,
.heading_wrapper:focus-visible
{
	transform:scale(1.1,1.1);
}

.heading_wrapper button{
	position: absolute;
	bottom: -1.5rem;
	right: -1.5rem;
}
.adder{
	margin-inline: auto;
	position: relative;
	margin-block: 3rem;
	width: 90%;
	border-radius: var(--radius-card);
	transition: var(--transition-normal);
	background-color: var(--blue);
	padding: 1.5rem 2rem;
}
dialog .adder{
	width: 400px;
}
.shadow{
	box-shadow: 0 0 1em 0.2em rgba(0,0,0,0.3);
}
.adder button{
	position: absolute;
	right: -1.5rem;
	bottom: -1.5rem;
}
.category{
	position: absolute;
	border: none;
	--font_size: 1.5rem;
	top: -1em;
	left: -1em;
	font-size: 1.5rem;
	background-color: var(--nord0);
	color: var(--nord4);
	border-radius: 1000000px;
	width: 23ch;
	padding: 0.5em 1em;
	transition: var(--transition-fast);
	box-shadow: 0.5em 0.5em 1em 0.4em rgba(0,0,0,0.3);
}
.category:hover,
.category:focus-visible
{
	background-color: var(--nord1);
	transform: scale(1.05,1.05);
}
.adder:hover,
.adder:focus-within
{
	transform: scale(1.1, 1.1);
}

.add_step p{
	width: 100%;
	font-size: 1.2rem;
	border-radius: var(--radius-card);
	border: 2px solid var(--nord4);
	border-radius: 30px;
	padding: 0.5em 1em;
	color: var(--nord4);
	transition: var(--transition-fast);
}
.add_step p:hover,
.add_step p:focus-visible
{
	color: white;
	scale: 1.02 1.02;
}

dialog{
	box-sizing: content-box;
	width: 100%;
	height: 100%;
	background-color: rgba(255,255,255, 0.001);
	border: unset;
	margin: 0;
	transition: var(--transition-normal);
}
dialog .adder{
	margin-top: 5rem;
}
dialog h2{
	font-size: 3rem;
	color: white;
	text-align: center;
	margin-top: 30vh;
	margin-top: 30dvh;
	filter: drop-shadow(0 0 0.4em black)
		drop-shadow(0 0 1em black)
		;
}
dialog .adder input::placeholder{
	font-size: 1.2rem;
}

@media screen and (max-width: 500px){
	dialog h2{
		margin-top: 2rem;
	}
	dialog .adder{
		width: 85%;
		padding-inline: 0.5em;
	}
	dialog .adder .category{
		width: 70%;
	}
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
ol li::marker{
	font-weight: bold;
	color: var(--blue);
	font-size: 1.2rem;
}
.instructions{
	flex-basis: 0;
	flex-grow: 2;
	background-color: var(--color-bg-secondary);
	padding-block: 1rem;
	padding-inline: 2rem;
}
.instructions ol{
	padding-left: 1em;
}
.instructions li{
	margin-block: 0.5em;
	font-size: 1.1rem;
}

.additional_info{
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
	gap: 0.75rem;
	margin-block: 1rem;
}
.info-card{
	padding: 0.75rem 1rem;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-md);
	box-shadow: var(--shadow-sm);
	transition: var(--transition-fast);
}
.info-card:focus-within{
	border-color: var(--color-primary);
	box-shadow: var(--shadow-md);
}
.info-card-baking{
	grid-column: span 2;
}
.info-card h3{
	display: flex;
	align-items: center;
	gap: 0.4rem;
	margin: 0 0 0.25rem 0;
	font-size: var(--text-sm);
	color: var(--color-text-secondary);
	cursor: default;
	user-select: auto;
}
.info-value{
	display: block;
	margin: 0;
	font-size: 1rem;
	font-weight: 600;
	color: var(--color-text-primary);
	outline: none;
	min-height: 1.2em;
	border-bottom: 1px dashed transparent;
	transition: border-color 200ms ease;
}
.info-value:hover,
.info-value:focus{
	border-bottom-color: var(--color-border);
}
.info-value:empty::before{
	content: attr(data-placeholder);
	color: var(--color-text-tertiary);
	font-style: italic;
	font-weight: 400;
}
.baking-toggle{
	all: unset;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	gap: 0.6rem;
	width: 100%;
	cursor: pointer;
	min-height: 1.5rem;
}
.baking-toggle:focus-visible{
	outline: 2px solid var(--color-primary);
	outline-offset: 3px;
	border-radius: var(--radius-sm);
}
.baking-toggle h3{
	margin: 0;
	flex-shrink: 0;
	cursor: pointer;
}
.baking-summary{
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	align-items: center;
	min-width: 0;
	font-size: 0.95rem;
}
.baking-summary .chip{
	display: inline-flex;
	align-items: center;
	padding: 0.1rem 0.55rem;
	border-radius: var(--radius-pill);
	background: var(--color-bg-tertiary);
	color: var(--color-text-primary);
	font-weight: 600;
	font-size: 0.85rem;
	line-height: 1.4;
}
.baking-summary .chip.mode{
	background: color-mix(in srgb, var(--color-primary) 14%, transparent);
	color: var(--color-primary);
}
.baking-summary.muted{
	color: var(--color-text-tertiary);
	font-style: italic;
	font-size: 0.85rem;
}
.chevron{
	color: var(--color-text-tertiary);
	flex-shrink: 0;
	transition: transform 200ms ease;
}
.is-expanded .chevron{
	transform: rotate(180deg);
	color: var(--color-primary);
}

.baking-form{
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem 1rem;
	margin-top: 0.85rem;
	padding-top: 0.85rem;
	border-top: 1px solid var(--color-border);
	animation: baking-slide-down 180ms ease-out;
}
@keyframes baking-slide-down{
	from { opacity: 0; transform: translateY(-4px); }
	to   { opacity: 1; transform: translateY(0); }
}
.baking-field{
	display: flex;
	flex-direction: column;
	gap: 0.3rem;
	min-width: 0;
}
.baking-field label,
.baking-field .mode-label{
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--color-text-secondary);
}
.mode-field{
	grid-column: span 2;
}

.input-wrap{
	position: relative;
	display: flex;
	align-items: stretch;
}
.input-wrap input{
	flex: 1;
	min-width: 0;
	padding: 0.5rem 2.8rem 0.5rem 0.7rem;
	font-size: 1rem;
	font-weight: 600;
	font-family: inherit;
	color: var(--color-text-primary);
	background: var(--color-bg-tertiary);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-sm);
	outline: none;
	transition: border-color 150ms ease, box-shadow 150ms ease;
}
.input-wrap input:focus{
	border-color: var(--color-primary);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
}
.input-wrap input::placeholder{
	color: var(--color-text-tertiary);
	font-weight: 400;
}
.input-wrap .suffix{
	position: absolute;
	right: 0.7rem;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color-text-tertiary);
	font-size: 0.85rem;
	font-weight: 600;
	pointer-events: none;
	letter-spacing: 0.02em;
}

.mode-chips{
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem;
}
.mode-chip{
	all: unset;
	cursor: pointer;
	padding: 0.35rem 0.85rem;
	font-size: 0.85rem;
	font-weight: 600;
	border-radius: var(--radius-pill);
	background: var(--color-bg-tertiary);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border);
	transition: var(--transition-fast);
}
.mode-chip:hover{
	border-color: var(--color-primary);
	transform: scale(1.03);
}
.mode-chip.active{
	background: var(--color-primary);
	color: var(--color-text-on-primary);
	border-color: var(--color-primary);
	box-shadow: var(--shadow-sm);
}
.mode-custom{
	margin-top: 0.1rem;
	padding: 0.45rem 0.7rem;
	font-size: 0.9rem;
	font-family: inherit;
	color: var(--color-text-primary);
	background: transparent;
	border: none;
	border-bottom: 1px dashed var(--color-border);
	outline: none;
	transition: border-color 150ms ease;
}
.mode-custom:focus{
	border-bottom-color: var(--color-primary);
	border-bottom-style: solid;
}
.mode-custom::placeholder{
	color: var(--color-text-tertiary);
	font-style: italic;
}

@media (max-width: 560px){
	.info-card-baking{
		grid-column: span 1;
	}
	.baking-form{
		grid-template-columns: 1fr;
	}
	.mode-field{
		grid-column: span 1;
	}
}
.button_subtle{
	padding: 0em;
	animation: unset;
	margin: 0.2em 0.1em;
	background-color: transparent;
	box-shadow: unset;
	display:inline;
}
.button_subtle:hover{
	scale: 1.2 1.2;
}
h3{
	display:flex;
	gap: 1rem;
	cursor: pointer;
	user-select: none;
}
@media screen and (max-width: 500px){
	dialog h2{
	margin-top: 2rem;
	}
	dialog .heading_wrapper{
		width: 80%;
	}
}
.button_arrow{
	fill: var(--nord1);
}
@media (prefers-color-scheme: dark){
    :global(:root:not([data-theme="light"])) .button_arrow {
		fill: var(--nord4);
	}
  }
:global(:root[data-theme="dark"]) .button_arrow {
	fill: var(--nord4);
}

/* Styling for converted div-to-button elements */
.subheading-button, .step-button {
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
    :global(:root:not([data-theme="light"])) .reference-container {
		background-color: var(--nord1);
	}
	:global(:root:not([data-theme="light"])) .reference-badge {
		color: var(--nord6);
	}
  }
:global(:root[data-theme="dark"]) .reference-container {
	background-color: var(--nord1);
}
:global(:root[data-theme="dark"]) .reference-badge {
	color: var(--nord6);
}

.insert-base-recipe-button {
	margin-block: 1rem;
	padding: 1em 2em;
	font-size: 1.1rem;
	border-radius: var(--radius-pill);
	background-color: var(--nord9);
	color: white;
	border: none;
	cursor: pointer;
	transition: var(--transition-normal);
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

<div class=instructions>
<div class="additional_info">
	<div class="info-card">
		<h3><Timer size={16} />{t[lang].preparation}</h3>
		<p class="info-value" contenteditable="plaintext-only" bind:innerText={add_info.preparation} data-placeholder="z.B. 30 min"></p>
	</div>

	<div class="info-card">
		<h3><Wheat size={16} />{t[lang].bulkFermentation}</h3>
		<p class="info-value" contenteditable="plaintext-only" bind:innerText={add_info.fermentation.bulk} data-placeholder="z.B. 4 h"></p>
	</div>

	<div class="info-card">
		<h3><Croissant size={16} />{t[lang].finalFermentation}</h3>
		<p class="info-value" contenteditable="plaintext-only" bind:innerText={add_info.fermentation.final} data-placeholder="z.B. 1 h"></p>
	</div>

	<div class="info-card info-card-baking" class:is-expanded={bakingExpanded}>
		<button
			type="button"
			class="baking-toggle"
			onclick={toggleBaking}
			aria-expanded={bakingExpanded}
			aria-controls="baking-fields-{lang}"
		>
			<h3><Flame size={16} />{t[lang].baking}</h3>
			{#if !bakingExpanded && bakingHasData}
				<span class="baking-summary">
					{#if add_info.baking.length}<span class="chip">{add_info.baking.length}</span>{/if}
					{#if add_info.baking.temperature}<span class="chip">{add_info.baking.temperature} °C</span>{/if}
					{#if add_info.baking.mode}<span class="chip mode">{add_info.baking.mode}</span>{/if}
				</span>
			{:else if !bakingExpanded}
				<span class="baking-summary muted">{t[lang].notSet}</span>
			{/if}
			<svg class="chevron" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>

		{#if bakingExpanded}
			<div id="baking-fields-{lang}" class="baking-form">
				<div class="baking-field">
					<label for="baking-length-{lang}">{t[lang].duration}</label>
					<div class="input-wrap">
						<input
							id="baking-length-{lang}"
							type="text"
							bind:value={add_info.baking.length}
							placeholder="40"
							inputmode="numeric"
							autocomplete="off"
						/>
						<span class="suffix">min</span>
					</div>
				</div>
				<div class="baking-field">
					<label for="baking-temp-{lang}">{t[lang].temperature}</label>
					<div class="input-wrap">
						<input
							id="baking-temp-{lang}"
							type="text"
							bind:value={add_info.baking.temperature}
							placeholder="200"
							inputmode="numeric"
							autocomplete="off"
						/>
						<span class="suffix">°C</span>
					</div>
				</div>
				<div class="baking-field mode-field">
					<span class="mode-label">{t[lang].mode}</span>
					<div class="mode-chips">
						{#each BAKING_MODES[lang] as mode}
							<button
								type="button"
								class="mode-chip"
								class:active={add_info.baking.mode === mode}
								onclick={() => pickBakingMode(mode)}
							>{mode}</button>
						{/each}
					</div>
					<input
						type="text"
						class="mode-custom"
						bind:value={add_info.baking.mode}
						placeholder={t[lang].customModePlaceholder}
						autocomplete="off"
					/>
				</div>
			</div>
		{/if}
	</div>

	<div class="info-card">
		<h3><CookingPot size={16} />{t[lang].cooking}</h3>
		<p class="info-value" contenteditable="plaintext-only" bind:innerText={add_info.cooking} data-placeholder="z.B. 20 min"></p>
	</div>

	<div class="info-card">
		<h3><UtensilsCrossed size={16} />{t[lang].totalTime}</h3>
		<p class="info-value" contenteditable="plaintext-only" bind:innerText={add_info.total_time} data-placeholder="z.B. 1 h"></p>
	</div>
</div>

<h2>{t[lang].instructions}</h2>
{#each instructions as list, list_index}
	{#if list.type === 'reference'}
		<!-- Reference item display -->
		<div class="reference-container">
			<div class="reference-header">
				<div class="move_buttons_container">
					<button type="button" onclick={() => update_list_position(list_index, 1)} aria-label={t[lang].moveReferenceUpAria}>
						<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
					</button>
					<button type="button" onclick={() => update_list_position(list_index, -1)} aria-label={t[lang].moveReferenceDownAria}>
						<svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
					</button>
				</div>
				<div class="reference-badge">
					📋 {t[lang].baseRecipe}: {list.name || t[lang].unnamed}
					<div style="margin-top: 0.5em;">
						<label style="font-size: 0.9em; display: flex; align-items: center; gap: 0.5em;">
							{t[lang].baseMultiplier || 'Mengenfaktor'}:
							<input
								type="number"
								bind:value={list.baseMultiplier}
								min="0.1"
								step="0.1"
								style="width: 5em; padding: 0.25em 0.5em; border-radius: 5px; border: 1px solid var(--nord4);"
							/>
						</label>
					</div>
				</div>
				<div class="mod_icons">
					<button type="button" class="action_button button_subtle" onclick={() => removeReference(list_index)} aria-label={t[lang].removeReferenceAria}>
						<Cross fill="var(--nord11)"></Cross>
					</button>
				</div>
			</div>

			<!-- Steps before base recipe -->
			{#if list.stepsBefore && list.stepsBefore.length > 0}
				<h4 style="margin-block: 0.5em; color: var(--nord9);">{t[lang].additionalStepsBefore}</h4>
				<ol>
					{#each list.stepsBefore as step, step_index}
						<li>
							<div style="display: flex; align-items: center;">
								<div class="move_buttons_container step_move_buttons">
									<!-- Empty for consistency -->
								</div>
								<button type="button" onclick={() => editStepFromReference(list_index, 'before', step_index)} class="step-button" style="flex-grow: 1;">
									{@html step}
								</button>
								<div>
									<button type="button" class="action_button button_subtle" onclick={() => editStepFromReference(list_index, 'before', step_index)} aria-label={t[lang].editStepAria}>
										<Pen fill="var(--nord6)" height="1em" width="1em"></Pen>
									</button>
									<button type="button" class="action_button button_subtle" onclick={() => removeStepFromReference(list_index, 'before', step_index)} aria-label={t[lang].removeStepAria}>
										<Cross fill="var(--nord6)" height="1em" width="1em"></Cross>
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
			<button type="button" class="action_button button_subtle add-to-reference-button" onclick={() => openAddToReferenceModal(list_index, 'before')}>
				<Plus fill="var(--nord9)" height="1em" width="1em"></Plus> {t[lang].addStepBefore}
			</button>

			<!-- Base recipe content indicator -->
			<div style="text-align: center; padding: 0.5em; margin: 0.5em 0; font-style: italic; color: var(--nord10); background-color: rgba(143, 188, 187, 0.4); border-radius: 5px;">
				{t[lang].baseRecipeContent}
			</div>

			<!-- Steps after base recipe -->
			<button type="button" class="action_button button_subtle add-to-reference-button" onclick={() => openAddToReferenceModal(list_index, 'after')}>
				<Plus fill="var(--nord9)" height="1em" width="1em"></Plus> {t[lang].addStepAfter}
			</button>
			{#if list.stepsAfter && list.stepsAfter.length > 0}
				<h4 style="margin-block: 0.5em; color: var(--nord9);">{t[lang].additionalStepsAfter}</h4>
				<ol>
					{#each list.stepsAfter as step, step_index}
						<li>
							<div style="display: flex; align-items: center;">
								<div class="move_buttons_container step_move_buttons">
									<!-- Empty for consistency -->
								</div>
								<button type="button" onclick={() => editStepFromReference(list_index, 'after', step_index)} class="step-button" style="flex-grow: 1;">
									{@html step}
								</button>
								<div>
									<button type="button" class="action_button button_subtle" onclick={() => editStepFromReference(list_index, 'after', step_index)} aria-label={t[lang].editStepAria}>
										<Pen fill="var(--nord6)" height="1em" width="1em"></Pen>
									</button>
									<button type="button" class="action_button button_subtle" onclick={() => removeStepFromReference(list_index, 'after', step_index)} aria-label={t[lang].removeStepAria}>
										<Cross fill="var(--nord6)" height="1em" width="1em"></Cross>
									</button>
								</div>
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<h3>
		<div class=move_buttons_container>
			<button type="button" onclick="{() => update_list_position(list_index, 1)}" aria-label={t[lang].moveListUpAria}>
							<svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
					</button>
			<button type="button" onclick="{() => update_list_position(list_index, -1)}" aria-label={t[lang].moveListDownAria}>
							<svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
			</button>
		</div>
		<button type="button" onclick={() => show_modal_edit_subheading_step(list_index)} class="subheading-button">
		{#if list.name}
			{list.name}
		{:else}
			{t[lang].empty}
		{/if}
		</button>
		<button type="button" class="action_button button_subtle" onclick="{() => show_modal_edit_subheading_step(list_index)}" aria-label={t[lang].editHeading}>
				<Pen fill=var(--nord1)></Pen>	</button>
			<button type="button" class="action_button button_subtle" onclick="{() => remove_list(list_index)}" aria-label={t[lang].removeList}>
					<Cross fill=var(--nord1)></Cross>
		</button>
	</h3>
	<ol>
	{#each list.steps as step, step_index}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
		<li>
			<div class="move_buttons_container step_move_buttons">
				<button type="button" onclick="{() => update_step_position(list_index, step_index, 1)}" aria-label={t[lang].moveUpAria}>
		                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
		                </button>
				<button type="button" onclick="{() => update_step_position(list_index, step_index, -1)}" aria-label={t[lang].moveDownAria}>
		                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
				</button>
			</div>
			<div>
				<button type="button" onclick={() => show_modal_edit_step(list_index, step_index)} class="step-button">
					{@html step}
				</button>
			<div><button type="button" class="action_button button_subtle" onclick={() => show_modal_edit_step(list_index, step_index)} aria-label={t[lang].editStepAria}>
				<Pen fill=var(--nord1)></Pen>
		</button>
		<button type="button" class="action_button button_subtle" onclick="{() => remove_step(list_index, step_index)}" aria-label={t[lang].removeStepAria}>
			<Cross fill=var(--nord1)></Cross>
		</button>
			</div></div>
		</li>
	{/each}
	</ol>
	{/if}
{/each}

<!-- Button to insert base recipe -->
<button type="button" class="insert-base-recipe-button" onclick={() => openSelector(instructions.length)}>
	<Plus fill="white" style="display: inline; width: 1.5em; height: 1.5em; vertical-align: middle;"></Plus>
	{t[lang].insertBaseRecipe}
</button>
</div>

<div class='adder shadow'>
<input class=category type="text" bind:value={new_step.name} placeholder={t[lang].categoryOptional} onkeydown={(event) => do_on_key(event, 'Enter', false , add_new_step)} >
<div class=add_step>
	<p id=step contenteditable onfocus='{clear_step}' onblur={add_placeholder} bind:innerText={new_step.step} onkeydown={(event) => do_on_key(event, 'Enter', true , add_new_step)}></p>
	<button type="button" onclick={() => add_new_step()} class=action_button>
		<Plus fill=white style="height: 2rem; width: 2rem"></Plus>
	</button>

</div>
</div>
<dialog id="edit_step_modal-{lang}" oncancel={handleStepModalCancel}>
	<h2>{t[lang].editStep}</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_step.name} placeholder={t[lang].subcategoryOptional} onkeydown={(event) => do_on_key(event, 'Enter', false , edit_step_and_close_modal)}>
	<div class=add_step>
		<p id=step contenteditable bind:innerText={edit_step.step} onkeydown={(event) => do_on_key(event, 'Enter', true , edit_step_and_close_modal)}></p>
	<button type="button" class=action_button onclick="{() => edit_step_and_close_modal()}" >
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
	</button>
</div>
	</div>
</dialog>

<dialog id="edit_subheading_steps_modal-{lang}">
	<h2>{t[lang].renameCategory}</h2>
	<div class=heading_wrapper>
		<input class="heading" type="text" bind:value={edit_heading.name} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_steps_and_close_modal)}>
		<button type="button" onclick={edit_subheading_steps_and_close_modal} class=action_button>
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
		</button>
	</div>
</dialog>

<!-- Base recipe selector -->
<BaseRecipeSelector
	type="instructions"
	onSelect={handleSelect}
	bind:open={showSelector}
/>

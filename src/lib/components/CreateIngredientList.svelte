<script lang='ts'>

import {flip} from "svelte/animate"
import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

import "$lib/css/action_button.css"

import { do_on_key } from '$lib/components/do_on_key.js'
import { portions } from '$lib/js/portions_store.js'

let portions_local
portions.subscribe((p) => {
	portions_local = p
});

export function set_portions(){
	portions.update((p) => portions_local)
}

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
		const response = confirm("Bist du dir sicher, dass du diese Liste löschen möchtest? Alle Zutaten der Liste werden hiermit auch gelöscht.");
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
	ingredients[edit_ingredient.list_index].list[edit_ingredient.ingredient_index] = {
	amount: edit_ingredient.amount,
	unit: edit_ingredient.unit,
	name: edit_ingredient.name,
	}
	ingredients[edit_ingredient.list_index].name = edit_ingredient.sublist
	const modal_el = document.querySelector("#edit_ingredient_modal");
	modal_el.close();
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
</style>

<div class=list_wrapper >
<h4>Portionen:</h4>
<p contenteditable type="text" bind:innerText={portions_local} on:blur={set_portions}></p>

<h2>Zutaten</h2>
{#each ingredients as list, list_index}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<h3>
	<div class=move_buttons_container>
		<button on:click="{() => update_list_position(list_index, 1)}">
                        <svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                </button>
		<button  on:click="{() => update_list_position(list_index, -1)}">
                        <svg class="button_arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
		</button>
	</div>

	<div on:click="{() => show_modal_edit_subheading_ingredient(list_index)}">
	{#if list.name }
		{list.name}
	{:else}
		Leer
	{/if}
	</div>
	<div class=mod_icons>
		<button class="action_button button_subtle" on:click="{() => show_modal_edit_subheading_ingredient(list_index)}">
			<Pen fill=var(--nord1)></Pen>	</button>
		<button class="action_button button_subtle" on:click="{() => remove_list(list_index)}">
			<Cross fill=var(--nord1)></Cross></button>
	</div>
	</h3>
	<div class=ingredients_grid>
		{#each list.list as ingredient, ingredient_index (ingredient_index)}
		<div class=move_buttons_container>
			<button on:click="{() => update_ingredient_position(list_index, ingredient_index, 1)}">
                	        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                	</button>
			<button  on:click="{() => update_ingredient_position(list_index, ingredient_index, -1)}">
                	        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
			</button>
		</div>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div on:click={() => show_modal_edit_ingredient(list_index, ingredient_index)} >
			{ingredient.amount} {ingredient.unit}
		</div>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div class=force_wrap on:click={() => show_modal_edit_ingredient(list_index, ingredient_index)} >
			{@html ingredient.name}
		</div>
		<div class=mod_icons><button class="action_button button_subtle" on:click={() => show_modal_edit_ingredient(list_index, ingredient_index)}>
			<Pen fill=var(--nord1) height=1em width=1em></Pen></button>
			<button class="action_button button_subtle" on:click="{() => remove_ingredient(list_index, ingredient_index)}"><Cross fill=var(--nord1) height=1em width=1em></Cross></button></div>
	{/each}
	</div>
{/each}
</div>

<div class="adder shadow">
	<input class=category type="text" bind:value={new_ingredient.sublist} placeholder="Kategorie (optional)" on:keydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<div class=add_ingredient>
		<input type="text"  placeholder="250..." bind:value={new_ingredient.amount} on:keydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="mL..." bind:value={new_ingredient.unit} on:keydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="Milch..." bind:value={new_ingredient.name} on:keydown={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<button on:click={() => add_new_ingredient()} class=action_button>
			<Plus fill=white style="width: 2rem; height: 2rem;"></Plus>
		</button>
	</div>
</div>
<dialog id=edit_ingredient_modal>
	<h2>Zutat verändern</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_ingredient.sublist} placeholder="Kategorie (optional)">
	<div class=add_ingredient on:keydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<input type="text" placeholder="250..." bind:value={edit_ingredient.amount} on:keydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<input type="text" placeholder="mL..." bind:value={edit_ingredient.unit} on:keydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<input type="text" placeholder="Milch..." bind:value={edit_ingredient.name} on:keydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<button class=action_button on:keydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)} on:click={edit_ingredient_and_close_modal}>
		<Check fill=white style="width: 2rem; height: 2rem;"></Check>
		</button>
	</div>
	</div>
</dialog>

<dialog id=edit_subheading_ingredient_modal>
	<h2>Kategorie umbenennen</h2>
	<div class=heading_wrapper>
		<input class=heading type="text" bind:value={edit_heading.name} on:keydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} >
		<button class=action_button on:keydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} on:click={edit_subheading_and_close_modal}>
		<Check fill=white style="width:2rem; height:2rem;"></Check>
		</button>
	</div>
</dialog>

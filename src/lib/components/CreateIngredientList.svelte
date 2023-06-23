<script lang='ts'>

import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

import "$lib/css/action_button.css"

import { do_on_key } from '$lib/components/do_on_key.js'

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

export function show_keys(event){
	console.log(event.ctrlKey, event.key)
}
</script>

<style>

input::placeholder{
	all:unset;
}
input{
	all:unset;
}

input.heading{
	all: unset;
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
	right: -5rem;
}
.adder{
	margin-inline: auto;
	position: relative;
	margin-block: 3rem;
	width: 400px;
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
	all: unset;
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
	background-color: rgba(255,255,255, 0.001);
	border: unset;
	margin: 0;
	transition: 500ms;
}
dialog[open]{
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
ul{
	width: fit-content;
	margin-inline: auto;
}
li{
	font-size: 1.2rem;
	max-width: 1000px;
	align-items: center;
}
.li_wrapper{
	display: flex;
	justify-content: space-between;
}
.mod_icons{
	display: flex;
	flex-direction: row;
	margin-left: 2rem;
}
li:nth-child(2n){
	background-color: var(--nord4);

}
li:nth-child(2n+1){
	background-color: var(--nord6);
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
h3{
	margin-inline: auto;
	width: fit-content;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	justify-content: space-between;
}
</style>


{#each ingredients as list, list_index}
	<h3>
	<div>
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
				<Cross fill=var(--nord1)></Cross>
		</button>
	</div>
	</h3>
	<ul>
	{#each list.list as ingredient, ingredient_index}
		<li><div class=li_wrapper><div>{ingredient.amount} {ingredient.unit} {ingredient.name}</div>
		<div class=mod_icons><button class="action_button button_subtle" on:click={() => show_modal_edit_ingredient(list_index, ingredient_index)}>
		<Pen fill=var(--nord1) height=1em width=1em></Pen>
		</button>
		<button class="action_button button_subtle" on:click="{() => remove_ingredient(list_index, ingredient_index)}">
			<Cross fill=var(--nord1) height=1em width=1em></Cross>
		</button></div></div>
	</li>
	{/each}
	</ul>
{/each}

<div class="adder shadow">
	<input class=category type="text" bind:value={new_ingredient.sublist} placeholder="Kategorie (optional)" on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<div class=add_ingredient>
		<input type="text"  placeholder="250..." bind:value={new_ingredient.amount} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="mL..." bind:value={new_ingredient.unit} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<input type="text" placeholder="Milch..." bind:value={new_ingredient.name} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<button on:click={() => add_new_ingredient()} class=action_button>
			<Plus fill=white style="width: 2rem; height: 2rem;"></Plus>
		</button>
	</div>
</div>

<dialog id=edit_ingredient_modal>
	<h2>Zutat verändern</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_ingredient.sublist} placeholder="Kategorie (optional)">
	<div class=add_ingredient on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<input type="text" placeholder="250..." bind:value={edit_ingredient.amount} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<input type="text" placeholder="mL..." bind:value={edit_ingredient.unit} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
	<input type="text" placeholder="Milch..." bind:value={edit_ingredient.name} on:keypress={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
	<button class=action_button on:click={edit_ingredient_and_close_modal}>
		<Check fill=white style="width: 2rem; height: 2rem;"></Check>
		</button>
	</div>
	</div>
</dialog>

<dialog id=edit_subheading_ingredient_modal>
	<h2>Kategorie umbenennen</h2>
	<div class=heading_wrapper>
		<input class=heading type="text" bind:value={edit_heading.name} on:keypress={(event) => do_on_key(event, 'Enter', false, add_new_ingredient)}>
		<button class=action_button on:click={edit_subheading_and_close_modal}>
		<Check fill=white style="width:2rem; height:2rem;"></Check>
		</button>
	</div>
</dialog>

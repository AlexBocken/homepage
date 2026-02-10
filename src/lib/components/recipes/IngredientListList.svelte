<script lang='ts'>
import { onMount } from 'svelte';

import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

import "$lib/css/action_button.css"

let { list = $bindable(), list_index } = $props<{ list: any, list_index: number }>();

let edit_ingredient = $state({
	amount: "",
	unit: "",
	name: "",
	sublist: "",
	list_index: "",
	ingredient_index: "",
});

let edit_heading = $state({
	name:"",
	list_index: "",
	});

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

    let ghost;
    let grabbed;

    let lastTarget;

    let mouseY = 0; // pointer y coordinate within client
    let offsetY = 0; // y distance from top of grabbed element to pointer
    let layerY = 0; // distance from top of list to top of client

    function grab(clientY, element) {
        // modify grabbed element
        grabbed = element;
        grabbed.dataset.grabY = clientY;

        // modify ghost element (which is actually dragged)
        ghost.innerHTML = grabbed.innerHTML;

        // record offset from cursor to top of element
        // (used for positioning ghost)
        offsetY = grabbed.getBoundingClientRect().y - clientY;
        drag(clientY);
    }

    // drag handler updates cursor position
    function drag(clientY) {
        if (grabbed) {
            mouseY = clientY;
            layerY = ghost.parentNode.getBoundingClientRect().y;
        }
    }

    // touchEnter handler emulates the mouseenter event for touch input
    // (more or less)
    function touchEnter(ev) {
        drag(ev.clientY);
        // trigger dragEnter the first time the cursor moves over a list item
        let target = document.elementFromPoint(ev.clientX, ev.clientY).closest(".item");
        if (target && target != lastTarget) {
            lastTarget = target;
            dragEnter(ev, target);
        }
    }

    function dragEnter(ev, target) {
        // swap items in data
        if (grabbed && target != grabbed && target.classList.contains("item")) {
            moveDatum(parseInt(grabbed.dataset.index), parseInt(target.dataset.index));
        }
    }

    // does the actual moving of items in data
    function moveDatum(from, to) {
        let temp = list[0].list[from];
        list[0].list = [...list[0].list.slice(0, from), ...list[0].list.slice(from + 1)];
        list[0].list= [...list[0].list.slice(0, to), temp, ...list[0].list.slice(to)];
    }

    function release(ev) {
        grabbed = null;
    }

    function removeDatum(index) {
        list= [...list.slice(0, index), ...list.slice(index + 1)];
    }
</script>

<style>
input::placeholder{
	color: inherit;
}

.drag_handle{
	cursor: grab;
	display:flex;
	justify-content: flex-start;
	align-items: center;
}
.drag_handle_header{
	padding-right: 0.5em;
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
	margin-left: 2rem;
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
	width: fit-content;
	display: flex;
	flex-direction: row;
	max-width: 1000px;
	justify-content: space-between;
	user-select: none;
	cursor: pointer;
}
.ingredients_grid > span{
	box-sizing: border-box;
	display: grid;
	font-size: 1.1em;
	grid-template-columns: 1em 2fr 3fr 2em;
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

   .list {
        cursor: grab;
        z-index: 5;
        display: flex;
        flex-direction: column;
    }

    .item {
        min-height: 3em;
        margin-bottom: 0.5em;
        border-radius: 2px;
        user-select: none;
    }

    .item:last-child {
        margin-bottom: 0;
    }

    .item:not(#grabbed):not(#ghost) {
        z-index: 10;
    }

    .item > * {
        margin: auto;
    }

    .buttons {
        width: 32px;
        min-width: 32px;
        margin: auto 0;
        display: flex;
        flex-direction: column;
    }

    .buttons button {
        cursor: pointer;
        width: 18px;
        height: 18px;
        margin: 0 auto;
        padding: 0;
        border: 1px solid rgba(0, 0, 0, 0);
        background-color: inherit;
    }

    .buttons button:focus {
        border: 1px solid black;
    }

    .delete {
        width: 32px;
    }

    #grabbed {
        opacity: 0.0;
    }

    #ghost {
        pointer-events: none;
        z-index: -5;
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0.0;
    }

    #ghost * {
        pointer-events: none;
    }

    #ghost.haunting {
        z-index: 20;
        opacity: 1.0;
    }

main {
        position: relative;
    }
</style>


<main>
<div class=dragdroplist>

<div
        bind:this={ghost}
        id="ghost"
        class={grabbed ? "item haunting" : "item"}
	style={"top: " + (mouseY + offsetY - layerY) + "px"}><p></p>
</div>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<h3 onclick={() => show_modal_edit_subheading_ingredient(list_index)}>
	<div class="drag_handle drag_handle_header"><svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></div>
	<div>
		{#if list.name }
			{list.name}
		{:else}
			Leer
		{/if}
	</div>
	<div class=mod_icons>
		<button class="action_button button_subtle" onclick={() => show_modal_edit_subheading_ingredient(list_index)}>
			<Pen fill=var(--nord1)></Pen>	</button>
		<button class="action_button button_subtle" onclick={() => remove_list(list_index)}>
			<Cross fill=var(--nord1)></Cross></button>
	</div>
</h3>

<div class="ingredients_grid list"
        on:mousemove={function(ev) {ev.stopPropagation(); drag(ev.clientY);}}
        on:touchmove={function(ev) {ev.stopPropagation(); drag(ev.touches[0].clientY);}}
        on:mouseup={function(ev) {ev.stopPropagation(); release(ev);}}
     on:touchend={function(ev) {ev.stopPropagation(); release(ev.touches[0]);}}
     >
{#each list.list as ingredient, ingredient_index}
	<span
                id={(grabbed && (ingredient.id ? ingredient.id : JSON.stringify(ingredient)) == grabbed.dataset.id) ? "grabbed" : ""}
class="item"
                data-index={ingredient_index}
                data-id={(ingredient.id ? ingredient.id : JSON.stringify(ingredient))}
                data-grabY="0"
                on:mousedown={function(ev) {grab(ev.clientY, this);}}
                on:touchstart={function(ev) {grab(ev.touches[0].clientY, this);}}
                on:mouseenter={function(ev) {ev.stopPropagation(); dragEnter(ev, ev.target);}}
                on:touchmove={function(ev) {ev.stopPropagation(); ev.preventDefault(); touchEnter(ev.touches[0]);}}
		>
	<div class=drag_handle><svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg></div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)} >{ingredient.amount} {ingredient.unit}</div>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)} >{@html ingredient.name}</div>
	<div class=mod_icons><button class="action_button button_subtle" onclick={() => show_modal_edit_ingredient(list_index, ingredient_index)}>
		<Pen fill=var(--nord1) height=1em width=1em></Pen></button>
		<button class="action_button button_subtle" onclick="{() => remove_ingredient(list_index, ingredient_index)}"><Cross fill=var(--nord1) height=1em width=1em></Cross></button></div>
	</span>
{/each}
</div>

</div>
</main>

<dialog id=edit_ingredient_modal>
	<h2>Zutat verändern</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_ingredient.sublist} placeholder="Kategorie (optional)">
	<div class=add_ingredient onkeydown={(event) => do_on_key(event, 'Enter', false, edit_ingredient_and_close_modal)}>
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
	<h2>Kategorie umbenennen</h2>
	<div class=heading_wrapper>
		<input class=heading type="text" bind:value={edit_heading.name} onkeydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} >
		<button class=action_button onkeydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_and_close_modal)} onclick={edit_subheading_and_close_modal}>
		<Check fill=white style="width:2rem; height:2rem;"></Check>
		</button>
	</div>
</dialog>

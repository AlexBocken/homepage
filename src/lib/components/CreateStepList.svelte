<script lang='ts'>

import Pen from '$lib/assets/icons/Pen.svelte'
import Cross from '$lib/assets/icons/Cross.svelte'
import Plus from '$lib/assets/icons/Plus.svelte'
import Check from '$lib/assets/icons/Check.svelte'

import '$lib/components/nordtheme.css'
import "$lib/css/action_button.css"

import { do_on_key } from '$lib/components/do_on_key.js'

const step_placeholder = "Kartoffeln schälen..."
export let instructions

let new_step = {
	name: "",
	step: step_placeholder
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
export function remove_list(list_index){
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
	const el = document.querySelector("#step")
	el.innerHTML = step_placeholder
	instructions = instructions //tells svelte to update dom
}

export function remove_step(list_index, step_index){
	instructions[list_index].steps.splice(step_index, 1)
	instructions = instructions //tells svelte to update dom
}

let edit_step = {
	name: "",
	step: "",
	list_index: 0,
	step_index: 0,
}
export function show_modal_edit_step(list_index, step_index){
	edit_step = {
		step: instructions[list_index].steps[step_index],
		name: instructions[list_index].name,
	}
	edit_step.list_index = list_index
	edit_step.step_index = step_index
	const modal_el = document.querySelector("#edit_step_modal");
	modal_el.showModal();
}

export function edit_step_and_close_modal(){
	instructions[edit_step.list_index].steps[edit_step.step_index] = edit_step.step
	const modal_el = document.querySelector("#edit_step_modal");
	modal_el.close();
}

export function show_modal_edit_subheading_step(list_index){
	edit_heading.name = instructions[list_index].name
	edit_heading.list_index = list_index
	const el = document.querySelector('#edit_subheading_steps_modal')
	el.showModal()
}

export function edit_subheading_steps_and_close_modal(){
	instructions[edit_heading.list_index].name = edit_heading.name
	const modal_el = document.querySelector("#edit_subheading_steps_modal");
	modal_el.close();
}


export function clear_step(){
	const el = document.querySelector("#step")
	if(el.innerHTML == step_placeholder){
		el.innerHTML = ""
	}
}
export function add_placeholder(){
	const el = document.querySelector("#step")
	if(el.innerHTML == ""){
		el.innerHTML = step_placeholder
	}
}
</script>

<style>
input::placeholder{
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
input.heading:hover,
input.heading:focus-visible
{
	background-color: var(--nord1);
}

.heading_wrapper{
	position: relative;
	width: 300px;
	margin-inline: auto;
	transition: 200ms;
}
.heading_wrapper:hover,
.heading_wrapper:focus-visible
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
	width: 50ch;
	border-radius: 20px;
	transition: 200ms;
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
	font-family: sans-serif;
	width: 100%;
	font-size: 1.2rem;
	padding: 2rem;
	padding-top: 2.5rem;
	border-radius: 20px;
	background-color: var(--blue);
	color: #bbb;
	transition: 200ms;
}
.add_step p:hover,
.add_step p:focus-visible
{
	color: white;
}

dialog{
	box-sizing: content-box;
	width: 100%;
	height: 100%;
	background-color: rgba(255,255,255, 0.001);
	border: unset;
	backdrop-filter: blur(10px);
	margin: 0;
	transition: 200ms;
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
</style>



{#each instructions as list, list_index}
	<h3>
	{#if list.name}
		{list.name}
	{:else}
		Leer
	{/if}
	<button class=edit on:click="{() => show_modal_edit_subheading_step(list_index)}">
			<Pen></Pen>	</button>
		<button class=remove on:click="{() => remove_list(list_index)}">
				<Cross></Cross>
		</button>
	</h3>
	<ol>
	{#each list.steps as step, step_index}
		<li>{step}
			<button class=edit on:click={() => show_modal_edit_step(list_index, step_index)}>
				<Pen></Pen>
		</button>
		<button class=remove on:click="{() => remove_step(list_index, step_index)}">
			<Cross></Cross>
		</button>

		</li>
	{/each}
	</ol>
{/each}

<div class='adder shadow'>
<input class=category type="text" bind:value={new_step.name} placeholder="Kategorie (optional)"on:keypress={(event) => do_on_key(event, 'Enter', false , add_new_step)} >
<div class=add_step>
	<p id=step contenteditable on:focus='{clear_step}' on:blur={add_placeholder} bind:innerHTML={new_step.step} on:keypress={(event) => do_on_key(event, 'Enter', true , add_new_step)}></p>
	<button on:click={() => add_new_step()} class=action_button>
		<Plus fill=white style="height: 2rem; width: 2rem"></Plus>
	</button>

</div>
</div>
<dialog id=edit_step_modal>
	<h2>Schritt verändern</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_step.name} placeholder="Unterkategorie (optional)" on:keypress={(event) => do_on_key(event, 'Enter', false , edit_step_and_close_modal)}>
	<div class=add_step>
		<p id=step contenteditable bind:innerHTML={edit_step.step} on:keypress={(event) => do_on_key(event, 'Enter', true , edit_step_and_close_modal)}></p>
	<button class=action_button on:click="{() => edit_step_and_close_modal()}" >
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
	</button>
</div>
</dialog>

<dialog id=edit_subheading_steps_modal>
	<h2>Kategorie umbenennen</h2>
	<div class=heading_wrapper>
		<input class="heading" type="text" bind:value={edit_heading.name} on:keypress={(event) => do_on_key(event, 'Enter', false, edit_subheading_steps_and_close_modal)}>
		<button on:click={edit_subheading_steps_and_close_modal} class=action_button>
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
		</button>
	</div>
</dialog>

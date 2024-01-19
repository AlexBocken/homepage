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
export let add_info

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
	if(instructions[list_index].steps.length > 1){
		const response = confirm("Bist du dir sicher, dass du diese Liste löschen möchtest? Alle Zubereitungsschritte der Liste werden hiermit auch gelöscht.");
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

export function update_list_position(list_index, direction){
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
export function update_step_position(list_index, step_index, direction){
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
	transition: 200ms;
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
	width: min(300px, 95dvw);
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
	right: -1.5rem;
}
.adder{
	margin-inline: auto;
	position: relative;
	margin-block: 3rem;
	width: 90%;
	border-radius: 20px;
	transition: 200ms;
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
	border-radius: 20px;
	border: 2px solid var(--nord4);
	border-radius: 30px;
	padding: 0.5em 1em;
	color: var(--nord4);
	transition: 100ms;
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
	background-color: var(--nord5);
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
	display: flex;
	flex-wrap: wrap;
	gap: 1em;
}
.additional_info > *{
	flex-grow: 0;
	overflow: hidden;
	padding: 1em;
	background-color: #FAFAFE;
	box-shadow: 0.3em 0.3em 1em 0.2em rgba(0,0,0,0.3);
	/*max-width: 30%*/
}
.additional_info > div > *:not(h4){
	line-height: 2em;
}
h4{
	line-height: 1em;
	margin-block: 0;
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
.additional_info p[contenteditable]{
	display: inline;
	padding: 0.25em 1em;
	border: 2px solid grey;
	border-radius: 1000px;
}
.additional_info div:has(p[contenteditable]){
	transition: 200ms;
	display: inline;
}
.additional_info div:has(p[contenteditable]):hover,
.additional_info div:has(p[contenteditable]):focus-within
{
	transform: scale(1.1, 1.1);
}
@media screen and (max-width: 500px){
	dialog h2{
	margin-top: 2rem;
	}
	dialog .heading_wrapper{
		width: 80%;
	}
}
@media (prefers-color-scheme: dark){
	.additional_info div{
		background-color: var(--accent-dark);
	}
	.instructions{
		background-color: var(--nord6-dark);
	}
}
.button_arrow{
	fill: var(--nord1);
}
@media (prefers-color-scheme: dark){
	.button_arrow{
		fill: var(--nord4);
	}
}
</style>

<div class=instructions>
<div class=additional_info>

	<div><h4>Vorbereitung:</h4>
		<p contenteditable type="text" bind:innerText={add_info.preparation}></p>
	</div>


	<div><h4>Stockgare:</h4>
		<p contenteditable type="text" bind:innerText={add_info.fermentation.bulk}></p>
	</div>

	<div><h4>Stückgare:</h4>
		<p contenteditable type="text" bind:innerText={add_info.fermentation.final}></p>
	</div>

	<div><h4>Backen:</h4>
		<div><p type="text" bind:innerText={add_info.baking.length} contenteditable placeholder="40 min..."></p></div> bei <div><p type="text" bind:innerText={add_info.baking.temperature} contenteditable placeholder=200...></p></div> °C <div><p type="text" bind:innerText={add_info.baking.mode} contenteditable placeholder="Ober-/Unterhitze..."></p></div></div>

	<div><h4>Kochen:</h4>
		<p contenteditable type="text" bind:innerText={add_info.cooking}></p>
	</div>

	<div><h4>Auf dem Teller:</h4>
		<p contenteditable type="text" bind:innerText={add_info.total_time}></p>
	</div>
</div>

<h2>Zubereitung</h2>
{#each instructions as list, list_index}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<h3>
	<div class=move_buttons_container>
		<button on:click="{() => update_list_position(list_index, 1)}">
                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                </button>
		<button  on:click="{() => update_list_position(list_index, -1)}">
                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
		</button>
	</div>
	<div on:click={() => show_modal_edit_subheading_step(list_index)}>
	{#if list.name}
		{list.name}
	{:else}
		Leer
	{/if}
	</div>
	<button class="action_button button_subtle" on:click="{() => show_modal_edit_subheading_step(list_index)}">
			<Pen fill=var(--nord1)></Pen>	</button>
		<button class="action_button button_subtle" on:click="{() => remove_list(list_index)}">
				<Cross fill=var(--nord1)></Cross>
		</button>
	</h3>
	<ol>
	{#each list.steps as step, step_index}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<li>
			<div class="move_buttons_container step_move_buttons">
				<button on:click="{() => update_step_position(list_index, step_index, 1)}">
		                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
		                </button>
				<button  on:click="{() => update_step_position(list_index, step_index, -1)}">
		                        <svg class=button_arrow xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16px" height="16px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
				</button>
			</div>
			<div>
				<div on:click={() => show_modal_edit_step(list_index, step_index)}>{step}</div>
			<div><button class="action_button button_subtle" on:click={() => show_modal_edit_step(list_index, step_index)}>
				<Pen fill=var(--nord1)></Pen>
		</button>
		<button class="action_button button_subtle" on:click="{() => remove_step(list_index, step_index)}">
			<Cross fill=var(--nord1)></Cross>
		</button>
			</div></div>
		</li>
	{/each}
	</ol>
{/each}
</div>

<div class='adder shadow'>
<input class=category type="text" bind:value={new_step.name} placeholder="Kategorie (optional)"on:keydown={(event) => do_on_key(event, 'Enter', false , add_new_step)} >
<div class=add_step>
	<p id=step contenteditable on:focus='{clear_step}' on:blur={add_placeholder} bind:innerText={new_step.step} on:keydown={(event) => do_on_key(event, 'Enter', true , add_new_step)}></p>
	<button on:click={() => add_new_step()} class=action_button>
		<Plus fill=white style="height: 2rem; width: 2rem"></Plus>
	</button>

</div>
</div>
<dialog id=edit_step_modal>
	<h2>Schritt verändern</h2>
	<div class=adder>
	<input class=category type="text" bind:value={edit_step.name} placeholder="Unterkategorie (optional)" on:keydown={(event) => do_on_key(event, 'Enter', false , edit_step_and_close_modal)}>
	<div class=add_step>
		<p id=step contenteditable bind:innerText={edit_step.step} on:keydown={(event) => do_on_key(event, 'Enter', true , edit_step_and_close_modal)}></p>
	<button class=action_button on:click="{() => edit_step_and_close_modal()}" >
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
	</button>
</div>
</dialog>

<dialog id=edit_subheading_steps_modal>
	<h2>Kategorie umbenennen</h2>
	<div class=heading_wrapper>
		<input class="heading" type="text" bind:value={edit_heading.name} on:keydown={(event) => do_on_key(event, 'Enter', false, edit_subheading_steps_and_close_modal)}>
		<button on:click={edit_subheading_steps_and_close_modal} class=action_button>
		<Check fill=white style="height: 2rem; width: 2rem"></Check>
		</button>
	</div>
</dialog>
